import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import { signingSecret } from '../config/env';
import { V, isTimeZone } from '../http/validate';
import { conflict, forbidden, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { hmacSign, hmacVerify, iso, newId } from '../lib/util';
import { activeMemberByHandle, areContacts, auditStmt, blockedBetween, dreamRole, inCircle } from '../services/access';
import { notifyStmt } from '../services/notifications';
import { authorMap } from '../services/feed';

type EventRow = {
  id: string; title: string; description: string | null; creator_id: string; source_type: string; source_id: string | null; dream_id: string | null;
  starts_at: string; ends_at: string; timezone: string; location_text: string | null; online_meeting_url: string | null; status: string; visibility: string;
  created_at: string; updated_at: string; cancelled_at: string | null;
};

/** Invitees must already know the organiser (contact, Circle) or share the Dream; no cold invites. */
async function mayInvite(ctx: Ctx, organiser: Viewer, inviteeId: string, dreamId: string | null): Promise<boolean> {
  if (await areContacts(ctx.sql, organiser.id, inviteeId)) return true;
  if (await inCircle(ctx.sql, organiser.id, inviteeId)) return true;
  if (dreamId) {
    const role = await dreamRole(ctx.sql, dreamId, inviteeId);
    return role.isOwner || role.isCollaborator;
  }
  return false;
}

async function visibleEvent(ctx: Ctx, id: string, viewer: Viewer | null): Promise<{ event: EventRow; isCreator: boolean; invite: { status: string } | null }> {
  const event = await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=?', id);
  if (!event) throw notFound();
  const isCreator = viewer?.id === event.creator_id;
  const invite = viewer ? await ctx.sql.first<{ status: string }>('SELECT status FROM agenda_invites WHERE event_id=? AND user_id=?', id, viewer.id) : null;
  if (!isCreator && !(invite && invite.status !== 'cancelled') && event.visibility !== 'public') throw notFound();
  if (viewer && !isCreator && (await blockedBetween(ctx.sql, viewer.id, event.creator_id))) throw notFound();
  return { event, isCreator, invite };
}

function eventDto(e: EventRow, extra: Record<string, unknown> = {}) {
  return {
    id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, endsAt: e.ends_at, timezone: e.timezone,
    location: e.location_text, onlineMeetingUrl: e.online_meeting_url, status: e.status, visibility: e.visibility, sourceType: e.source_type,
    dreamId: e.dream_id, createdAt: iso(e.created_at), updatedAt: iso(e.updated_at), ...extra,
  };
}

const icsDate = (isoInstant: string) => isoInstant.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
/** RFC 5545 line folding at 75 octets. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (out.length ? 74 : 75)) { out.push(current); current = ch; }
    else current += ch;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** UTC instants with the member's IANA zone kept as metadata; calendar apps convert correctly. */
export function toIcs(events: EventRow[], calendarName: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JenLow//Network//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsText(calendarName)];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT', 'UID:' + e.id + '@network.jenlow.net', 'DTSTAMP:' + icsDate(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')),
      'DTSTART:' + icsDate(e.starts_at), 'DTEND:' + icsDate(e.ends_at), 'SUMMARY:' + icsText(e.title),
      ...(e.description ? ['DESCRIPTION:' + icsText(e.description)] : []),
      ...(e.location_text ? ['LOCATION:' + icsText(e.location_text)] : []),
      ...(e.online_meeting_url ? ['URL:' + e.online_meeting_url] : []),
      'STATUS:' + (e.status === 'cancelled' ? 'CANCELLED' : e.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'),
      'X-JENLOW-TIMEZONE:' + e.timezone, 'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function parseEvent(body: Record<string, unknown>, partial: boolean) {
  const v = new V(body);
  const out = {
    title: v.str('title', { required: !partial, min: 1, max: 140 }),
    description: v.str('description', { max: 4000, nullable: true }),
    startsAt: v.instant('startsAt', { required: !partial }),
    endsAt: v.instant('endsAt', { required: !partial }),
    timezone: v.str('timezone', { max: 64 }),
    location: v.str('location', { max: 300, nullable: true }),
    onlineMeetingUrl: v.url('onlineMeetingUrl', { nullable: true }),
    sourceType: v.oneOf('sourceType', ['manual', 'lesson', 'dream', 'service', 'prayer', 'other'] as const),
    dreamId: v.id('dreamId', { nullable: true }),
    visibility: v.oneOf('visibility', ['private', 'invitees', 'public'] as const),
    status: v.oneOf('status', ['proposed', 'confirmed'] as const),
    invite: v.array('invite', x => (typeof x === 'string' && x.length <= 40 ? x : undefined), { max: 50 }),
  };
  if (out.timezone && !isTimeZone(out.timezone)) v.addError('timezone', 'invalid_timezone');
  if (out.startsAt && out.endsAt && out.endsAt <= out.startsAt) v.addError('endsAt', 'must_be_after_start');
  v.done();
  return out;
}

export function registerAgenda(r: Router): void {
  r.add('GET', '/api/events', { tag: 'Agenda', summary: 'My agenda between ?from and ?to (events I organise or am invited to)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const from = ctx.query('from') || new Date(Date.now() - 7 * 86400000).toISOString();
    const to = ctx.query('to') || new Date(Date.now() + 90 * 86400000).toISOString();
    const rows = await ctx.sql.all<EventRow & { my_status: string | null }>(
      `SELECT e.*,i.status AS my_status FROM agenda_events e LEFT JOIN agenda_invites i ON i.event_id=e.id AND i.user_id=?1
       WHERE (e.creator_id=?1 OR (i.user_id IS NOT NULL AND i.status<>'cancelled')) AND e.ends_at>=?2 AND e.starts_at<=?3 ORDER BY e.starts_at LIMIT 500`,
      viewer.id, from, to,
    );
    return { items: rows.map(e => eventDto(e, { role: e.creator_id === viewer.id ? 'organiser' : 'invitee', myStatus: e.creator_id === viewer.id ? 'organiser' : e.my_status })) };
  });

  r.add('GET', '/api/events/public', { tag: 'Agenda', summary: 'Events organisers chose to make public (e.g. a church gathering)', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const from = ctx.query('from') || new Date().toISOString();
    const to = ctx.query('to') || new Date(Date.now() + 60 * 86400000).toISOString();
    const rows = await ctx.sql.all<EventRow>(
      `SELECT e.* FROM agenda_events e JOIN users u ON u.id=e.creator_id AND u.account_status='active'
       WHERE e.visibility='public' AND e.status<>'cancelled' AND e.ends_at>=? AND e.starts_at<=? ${viewer ? 'AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=? AND b.blocked_id=e.creator_id) OR (b.blocker_id=e.creator_id AND b.blocked_id=?))' : ''}
       ORDER BY e.starts_at LIMIT 200`,
      ...(viewer ? [from, to, viewer.id, viewer.id] : [from, to]),
    );
    const people = await authorMap(ctx, rows.map(e => e.creator_id));
    return { items: rows.map(e => eventDto(e, { organiser: people.get(e.creator_id) })) };
  });

  r.add('POST', '/api/events', { tag: 'Agenda', summary: 'Create an event (UTC instants + IANA timezone; end after start)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'write', viewer.id, LIMITS.write);
    const e = parseEvent(await ctx.body(), false);
    if (e.dreamId) {
      const role = await dreamRole(ctx.sql, e.dreamId, viewer.id);
      if (!role.isOwner && !role.isCollaborator) throw forbidden('dream_participants_only');
    }
    const id = newId();
    const invitees = [];
    for (const handle of e.invite ?? []) {
      const member = await activeMemberByHandle(ctx.sql, handle, viewer);
      if (!(await mayInvite(ctx, viewer, member.id, e.dreamId ?? null))) throw unprocessable('invitee_not_connected', `${handle} is not a contact, Circle member or Dream participant.`);
      invitees.push(member);
    }
    await ctx.sql.batch([
      ctx.sql.stmt(
        'INSERT INTO agenda_events(id,title,description,creator_id,source_type,dream_id,starts_at,ends_at,timezone,location_text,online_meeting_url,status,visibility) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, e.title!, e.description ?? null, viewer.id, e.sourceType ?? (e.dreamId ? 'dream' : 'manual'), e.dreamId ?? null, e.startsAt!, e.endsAt!, e.timezone ?? viewer.timezone,
        e.location ?? null, e.onlineMeetingUrl ?? null, e.status ?? (invitees.length ? 'proposed' : 'confirmed'), e.visibility ?? (invitees.length ? 'invitees' : 'private'),
      ),
      ...invitees.flatMap(m => [
        ctx.sql.stmt('INSERT OR IGNORE INTO agenda_invites(event_id,user_id,invited_by) VALUES(?,?,?)', id, m.id, viewer.id),
        notifyStmt(ctx.sql, { userId: m.id, type: 'event.invitation.received', category: 'agenda', actorId: viewer.id, entityType: 'event', entityId: id, params: { actor: viewer.displayName, event: e.title! }, deepLink: `/agenda?event=${id}`, dedupeKey: `event-inv:${id}:${m.id}` }),
      ]),
      auditStmt(ctx.sql, viewer.id, 'event_created', 'event', id, ctx.requestId),
    ]);
    return { event: eventDto((await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=?', id))!) };
  });

  r.add('GET', '/api/events/:id', { tag: 'Agenda', summary: 'Event detail (organiser, invitees, or anyone for public events)', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const { event, isCreator, invite } = await visibleEvent(ctx, ctx.param('id'), viewer);
    const invites = isCreator ? await ctx.sql.all<{ user_id: string; status: string; responded_at: string | null }>('SELECT user_id,status,responded_at FROM agenda_invites WHERE event_id=?', event.id) : [];
    const people = await authorMap(ctx, [event.creator_id, ...invites.map(i => i.user_id)]);
    return { event: eventDto(event, { organiser: people.get(event.creator_id), myStatus: isCreator ? 'organiser' : invite?.status ?? null, invites: invites.map(i => ({ member: people.get(i.user_id), status: i.status, respondedAt: iso(i.responded_at) })) }) };
  });

  r.add('PATCH', '/api/events/:id', { tag: 'Agenda', summary: 'Update my event (invitees are notified)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const event = await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=? AND creator_id=?', ctx.param('id'), viewer.id);
    if (!event) throw notFound();
    if (event.status === 'cancelled') throw conflict('event_cancelled');
    const e = parseEvent(await ctx.body(), true);
    const startsAt = e.startsAt ?? event.starts_at, endsAt = e.endsAt ?? event.ends_at;
    if (endsAt <= startsAt) throw unprocessable('validation_failed', 'endsAt must be after startsAt', [{ field: 'endsAt', code: 'must_be_after_start' }]);
    const invitees = await ctx.sql.all<{ user_id: string }>("SELECT user_id FROM agenda_invites WHERE event_id=? AND status IN ('pending','accepted')", event.id);
    await ctx.sql.batch([
      ctx.sql.stmt(
        `UPDATE agenda_events SET title=coalesce(?,title),description=CASE WHEN ? THEN ? ELSE description END,starts_at=?,ends_at=?,timezone=coalesce(?,timezone),
          location_text=CASE WHEN ? THEN ? ELSE location_text END,online_meeting_url=CASE WHEN ? THEN ? ELSE online_meeting_url END,visibility=coalesce(?,visibility),status=coalesce(?,status),updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        e.title ?? null, e.description !== undefined ? 1 : 0, e.description ?? null, startsAt, endsAt, e.timezone ?? null,
        e.location !== undefined ? 1 : 0, e.location ?? null, e.onlineMeetingUrl !== undefined ? 1 : 0, e.onlineMeetingUrl ?? null, e.visibility ?? null, e.status ?? null, event.id,
      ),
      ...invitees.map(i => notifyStmt(ctx.sql, { userId: i.user_id, type: 'event.updated', category: 'agenda', actorId: viewer.id, entityType: 'event', entityId: event.id, params: { event: e.title ?? event.title }, dedupeKey: `event-upd:${event.id}:${i.user_id}:${Date.now()}` })),
    ]);
    return { event: eventDto((await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=?', event.id))!) };
  });

  r.add('DELETE', '/api/events/:id', { tag: 'Agenda', summary: 'Cancel my event (kept as cancelled; invitees notified)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const event = await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=? AND creator_id=?', ctx.param('id'), viewer.id);
    if (!event) throw notFound();
    const invitees = await ctx.sql.all<{ user_id: string }>("SELECT user_id FROM agenda_invites WHERE event_id=? AND status IN ('pending','accepted')", event.id);
    await ctx.sql.batch([
      ctx.sql.stmt("UPDATE agenda_events SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", event.id),
      ...invitees.map(i => notifyStmt(ctx.sql, { userId: i.user_id, type: 'event.cancelled', category: 'agenda', actorId: viewer.id, entityType: 'event', entityId: event.id, params: { event: event.title }, dedupeKey: `event-cancel:${event.id}:${i.user_id}` })),
    ]);
    return { cancelled: true };
  });

  r.add('POST', '/api/events/:id/invites', { tag: 'Agenda', summary: 'Invite contacts, Circle members or Dream participants', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const event = await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=? AND creator_id=?', ctx.param('id'), viewer.id);
    if (!event) throw notFound();
    const v = new V(await ctx.body());
    const handles = v.array('handles', x => (typeof x === 'string' && x.length <= 40 ? x : undefined), { required: true, max: 50 });
    v.done();
    const stmts = [];
    for (const handle of handles!) {
      const member = await activeMemberByHandle(ctx.sql, handle, viewer);
      if (!(await mayInvite(ctx, viewer, member.id, event.dream_id))) throw unprocessable('invitee_not_connected', `${handle} is not a contact, Circle member or Dream participant.`);
      stmts.push(
        ctx.sql.stmt("INSERT INTO agenda_invites(event_id,user_id,invited_by) VALUES(?,?,?) ON CONFLICT(event_id,user_id) DO UPDATE SET status='pending',invited_at=CURRENT_TIMESTAMP WHERE agenda_invites.status='cancelled'", event.id, member.id, viewer.id),
        notifyStmt(ctx.sql, { userId: member.id, type: 'event.invitation.received', category: 'agenda', actorId: viewer.id, entityType: 'event', entityId: event.id, params: { actor: viewer.displayName, event: event.title }, dedupeKey: `event-inv:${event.id}:${member.id}` }),
      );
    }
    await ctx.sql.batch(stmts);
    return { invited: handles!.length };
  });

  r.add('POST', '/api/events/:id/respond', { tag: 'Agenda', summary: 'Accept or decline an invitation', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const status = v.oneOf('status', ['accepted', 'declined'] as const, { required: true });
    v.done();
    const event = await ctx.sql.first<EventRow>('SELECT * FROM agenda_events WHERE id=?', ctx.param('id'));
    if (!event) throw notFound();
    const changed = await ctx.sql.run("UPDATE agenda_invites SET status=?,responded_at=CURRENT_TIMESTAMP WHERE event_id=? AND user_id=? AND status IN ('pending','accepted','declined')", status!, event.id, viewer.id);
    if (!changed) throw notFound('invitation_not_found');
    await ctx.sql.batch([
      notifyStmt(ctx.sql, { userId: event.creator_id, type: 'event.invitation.responded', category: 'agenda', actorId: viewer.id, entityType: 'event', entityId: event.id, params: { actor: viewer.displayName, event: event.title }, dedupeKey: `event-resp:${event.id}:${viewer.id}:${status}` }),
      ...(status === 'accepted' && event.status === 'proposed' ? [ctx.sql.stmt("UPDATE agenda_events SET status='confirmed' WHERE id=? AND status='proposed'", event.id)] : []),
    ]);
    return { status };
  });

  r.add('DELETE', '/api/events/:id/invites/:handle', { tag: 'Agenda', summary: 'Withdraw an invitation (organiser)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const event = await ctx.sql.first<EventRow>('SELECT id FROM agenda_events WHERE id=? AND creator_id=?', ctx.param('id'), viewer.id);
    if (!event) throw notFound();
    await ctx.sql.run("UPDATE agenda_invites SET status='cancelled' WHERE event_id=? AND user_id=(SELECT id FROM users WHERE handle=? COLLATE NOCASE)", event.id, ctx.param('handle'));
    return { cancelled: true };
  });

  r.add('GET', '/api/events/:id/ics', { tag: 'Agenda', summary: 'Download one event as an .ics file', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const { event } = await visibleEvent(ctx, ctx.param('id'), viewer);
    return new Response(toIcs([event], event.title), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="jenlow-${event.id}.ics"`, 'Cache-Control': 'private, no-store' } });
  });

  r.add('GET', '/api/me/calendar-feed', { tag: 'Agenda', summary: 'Personal ICS subscription URL (read-only, signed; rotate by changing MEDIA_SIGNING_SECRET)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const sig = await hmacSign(signingSecret(ctx.env), 'ics:' + viewer.id);
    return { url: `${ctx.baseUrl()}/api/calendar/${encodeURIComponent(viewer.id)}.ics?sig=${sig}`, providers: { ics: 'available', google: 'not_configured', outlook: 'not_configured', apple: 'subscribe_with_ics_url' } };
  });

  r.add('GET', '/api/calendar/:file', { tag: 'Agenda', summary: 'Signed ICS subscription feed', auth: 'none' }, async ctx => {
    const file = ctx.param('file');
    if (!file.endsWith('.ics')) throw notFound();
    const userId = file.slice(0, -4);
    if (!(await hmacVerify(signingSecret(ctx.env), 'ics:' + userId, ctx.query('sig') || ''))) throw notFound();
    const active = await ctx.sql.exists("SELECT 1 FROM users WHERE id=? AND account_status='active'", userId);
    if (!active) throw notFound();
    const rows = await ctx.sql.all<EventRow>(
      `SELECT e.* FROM agenda_events e LEFT JOIN agenda_invites i ON i.event_id=e.id AND i.user_id=?1
       WHERE (e.creator_id=?1 OR i.status='accepted') AND e.ends_at>=? ORDER BY e.starts_at LIMIT 500`,
      userId, new Date(Date.now() - 30 * 86400000).toISOString(),
    );
    return new Response(toIcs(rows, 'JenLow'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900' } });
  });

  r.add('GET', '/api/calendar-providers', { tag: 'Agenda', summary: 'Which calendar integrations are available', auth: 'none' }, async () => ({
    ics: { status: 'available' }, google: { status: 'not_configured', reason: 'Requires Google OAuth credentials and consent screen.' },
    outlook: { status: 'not_configured', reason: 'Requires Microsoft identity platform credentials.' }, apple: { status: 'available_via_ics_subscription' },
  }));
}
