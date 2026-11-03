import type { Router } from '../http/router';
import type { Ctx } from '../http/context';
import { V } from '../http/validate';
import { conflict, forbidden, mapSqlError, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId } from '../lib/util';
import { activeMemberByHandle, areContacts, auditStmt, blockedBetween, inCircle, loadVisibleDream } from '../services/access';
import { notifyStmt } from '../services/notifications';
import { authorMap } from '../services/feed';
import { toApiPhase } from '../domain/phases';

export function registerSocial(r: Router): void {
  // ------------------------------------------------------------------ contacts
  r.add('POST', '/api/contacts/requests', { tag: 'Social', summary: 'Ask a member to become a contact', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    v.done();
    const other = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (await areContacts(ctx.sql, viewer.id, other.id)) throw conflict('already_contacts');
    const existing = await ctx.sql.first<{ id: string; status: string }>('SELECT id,status FROM contact_requests WHERE requester_id=? AND recipient_id=?', viewer.id, other.id);
    if (existing?.status === 'pending') throw conflict('request_pending');
    const id = existing?.id ?? newId();
    await ctx.sql.batch([
      existing
        ? ctx.sql.stmt("UPDATE contact_requests SET status='pending',requested_at=CURRENT_TIMESTAMP,responded_at=NULL WHERE id=?", id)
        : ctx.sql.stmt('INSERT INTO contact_requests(id,requester_id,recipient_id) VALUES(?,?,?)', id, viewer.id, other.id),
      notifyStmt(ctx.sql, { userId: other.id, type: 'contact.request.received', category: 'social', actorId: viewer.id, entityType: 'contact_request', entityId: id, params: { actor: viewer.displayName }, dedupeKey: `contact-req:${id}:${Date.now()}` }),
    ]);
    return { request: { id, status: 'pending' } };
  });

  const listRequests = (table: 'contact_requests' | 'circle_requests') => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const box = ctx.query('box') === 'outbox' ? 'outbox' : 'inbox';
    const rows = await ctx.sql.all<{ id: string; requester_id: string; recipient_id: string; status: string; requested_at: string; connection_label?: string | null }>(
      `SELECT * FROM ${table} WHERE ${box === 'inbox' ? 'recipient_id' : 'requester_id'}=? AND status='pending' ORDER BY requested_at DESC LIMIT 100`, viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => (box === 'inbox' ? x.requester_id : x.recipient_id)));
    return { items: rows.map(x => ({ id: x.id, member: people.get(box === 'inbox' ? x.requester_id : x.recipient_id), status: x.status, label: x.connection_label ?? null, requestedAt: iso(x.requested_at) })) };
  };
  r.add('GET', '/api/contacts/requests', { tag: 'Social', summary: 'Pending contact requests (?box=inbox|outbox)', auth: 'required' }, listRequests('contact_requests'));

  const respondContact = (accept: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const req = await ctx.sql.first<{ id: string; requester_id: string; recipient_id: string; status: string }>('SELECT * FROM contact_requests WHERE id=?', ctx.param('id'));
    if (!req || req.recipient_id !== viewer.id) throw notFound();
    if (req.status !== 'pending') throw conflict('request_not_pending');
    if (accept && (await blockedBetween(ctx.sql, viewer.id, req.requester_id))) throw notFound();
    await ctx.sql.batch([
      ctx.sql.stmt("UPDATE contact_requests SET status=?,responded_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'", accept ? 'accepted' : 'declined', req.id),
      ...(accept ? [
        ctx.sql.stmt('INSERT OR IGNORE INTO contacts(user_id,contact_user_id) VALUES(?,?)', viewer.id, req.requester_id),
        ctx.sql.stmt('INSERT OR IGNORE INTO contacts(user_id,contact_user_id) VALUES(?,?)', req.requester_id, viewer.id),
        notifyStmt(ctx.sql, { userId: req.requester_id, type: 'contact.request.accepted', category: 'social', actorId: viewer.id, entityType: 'user', entityId: viewer.id, params: { actor: viewer.displayName }, dedupeKey: `contact-acc:${req.id}` }),
      ] : []),
      auditStmt(ctx.sql, viewer.id, accept ? 'contact_accepted' : 'contact_declined', 'contact_request', req.id, ctx.requestId),
    ]);
    return { request: { id: req.id, status: accept ? 'accepted' : 'declined' } };
  };
  r.add('POST', '/api/contacts/requests/:id/accept', { tag: 'Social', summary: 'Accept a contact request', auth: 'required' }, respondContact(true));
  r.add('POST', '/api/contacts/requests/:id/decline', { tag: 'Social', summary: 'Decline a contact request', auth: 'required' }, respondContact(false));
  r.add('POST', '/api/contacts/requests/:id/cancel', { tag: 'Social', summary: 'Cancel my pending contact request', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const changed = await ctx.sql.run("UPDATE contact_requests SET status='cancelled',responded_at=CURRENT_TIMESTAMP WHERE id=? AND requester_id=? AND status='pending'", ctx.param('id'), viewer.id);
    if (!changed) throw notFound();
    return { request: { id: ctx.param('id'), status: 'cancelled' } };
  });

  r.add('GET', '/api/contacts', { tag: 'Social', summary: 'My contacts', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ contact_user_id: string; added_at: string }>(
      "SELECT c.contact_user_id,c.added_at FROM contacts c JOIN users u ON u.id=c.contact_user_id AND u.account_status='active' WHERE c.user_id=? ORDER BY u.display_name",
      viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => x.contact_user_id));
    const circle = new Set((await ctx.sql.all<{ member_user_id: string }>('SELECT member_user_id FROM circle_members WHERE user_id=?', viewer.id)).map(x => x.member_user_id));
    return { items: rows.map(x => ({ member: people.get(x.contact_user_id), inCircle: circle.has(x.contact_user_id), since: iso(x.added_at) })) };
  });

  r.add('DELETE', '/api/contacts/:handle', { tag: 'Social', summary: 'Remove a contact (both directions; Circle is separate)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const other = await ctx.sql.first<{ id: string }>('SELECT id FROM users WHERE handle=? COLLATE NOCASE', ctx.param('handle'));
    if (!other) throw notFound();
    await ctx.sql.run('DELETE FROM contacts WHERE (user_id=?1 AND contact_user_id=?2) OR (user_id=?2 AND contact_user_id=?1)', viewer.id, other.id);
    return { removed: true };
  });

  // ------------------------------------------------------------------ My Circle (bilateral, trusted)
  r.add('POST', '/api/circle/requests', { tag: 'Social', summary: 'Invite a contact into My Circle (requires an existing contact; never automatic)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    const label = v.str('label', { max: 60 });
    v.done();
    const other = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (!(await areContacts(ctx.sql, viewer.id, other.id))) throw unprocessable('contact_required', 'Add this member as a contact first.');
    if (await inCircle(ctx.sql, viewer.id, other.id)) throw conflict('already_in_circle');
    const existing = await ctx.sql.first<{ id: string; status: string }>('SELECT id,status FROM circle_requests WHERE requester_id=? AND recipient_id=?', viewer.id, other.id);
    if (existing?.status === 'pending') throw conflict('request_pending');
    const id = existing?.id ?? newId();
    await ctx.sql.batch([
      existing
        ? ctx.sql.stmt("UPDATE circle_requests SET status='pending',connection_label=?,requested_at=CURRENT_TIMESTAMP,responded_at=NULL WHERE id=?", label ?? null, id)
        : ctx.sql.stmt('INSERT INTO circle_requests(id,requester_id,recipient_id,connection_label) VALUES(?,?,?,?)', id, viewer.id, other.id, label ?? null),
      notifyStmt(ctx.sql, { userId: other.id, type: 'circle.request.received', category: 'social', actorId: viewer.id, entityType: 'circle_request', entityId: id, params: { actor: viewer.displayName }, dedupeKey: `circle-req:${id}:${Date.now()}` }),
    ]);
    return { request: { id, status: 'pending' } };
  });
  r.add('GET', '/api/circle/requests', { tag: 'Social', summary: 'Pending Circle invitations (?box=inbox|outbox)', auth: 'required' }, listRequests('circle_requests'));

  const respondCircle = (accept: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const req = await ctx.sql.first<{ id: string; requester_id: string; recipient_id: string; status: string; connection_label: string | null }>('SELECT * FROM circle_requests WHERE id=?', ctx.param('id'));
    if (!req || req.recipient_id !== viewer.id) throw notFound();
    if (req.status !== 'pending') throw conflict('request_not_pending');
    if (accept && (await blockedBetween(ctx.sql, viewer.id, req.requester_id))) throw notFound();
    await ctx.sql.batch([
      ctx.sql.stmt("UPDATE circle_requests SET status=?,responded_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'", accept ? 'accepted' : 'declined', req.id),
      // Both directed rows are written only after explicit acceptance (reciprocal consent).
      ...(accept ? [
        ctx.sql.stmt('INSERT OR IGNORE INTO circle_members(user_id,member_user_id,circle_request_id,relationship_label) VALUES(?,?,?,?)', req.requester_id, viewer.id, req.id, req.connection_label),
        ctx.sql.stmt('INSERT OR IGNORE INTO circle_members(user_id,member_user_id,circle_request_id,relationship_label) VALUES(?,?,?,?)', viewer.id, req.requester_id, req.id, req.connection_label),
        notifyStmt(ctx.sql, { userId: req.requester_id, type: 'circle.request.accepted', category: 'social', actorId: viewer.id, entityType: 'user', entityId: viewer.id, params: { actor: viewer.displayName }, dedupeKey: `circle-acc:${req.id}` }),
      ] : []),
      auditStmt(ctx.sql, viewer.id, accept ? 'circle_accepted' : 'circle_declined', 'circle_request', req.id, ctx.requestId),
    ]);
    return { request: { id: req.id, status: accept ? 'accepted' : 'declined' } };
  };
  r.add('POST', '/api/circle/requests/:id/accept', { tag: 'Social', summary: 'Accept a Circle invitation (writes the reciprocal relationship)', auth: 'required' }, respondCircle(true));
  r.add('POST', '/api/circle/requests/:id/decline', { tag: 'Social', summary: 'Decline a Circle invitation', auth: 'required' }, respondCircle(false));

  r.add('POST', '/api/circle/requests/:id/revoke', { tag: 'Social', summary: 'Withdraw a pending invitation or end an accepted Circle relationship', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const req = await ctx.sql.first<{ id: string; requester_id: string; recipient_id: string; status: string }>('SELECT * FROM circle_requests WHERE id=?', ctx.param('id'));
    if (!req || (req.requester_id !== viewer.id && req.recipient_id !== viewer.id)) throw notFound();
    if (req.status !== 'pending' && req.status !== 'accepted') throw conflict('request_not_active');
    if (req.status === 'pending' && req.requester_id !== viewer.id) throw forbidden('requester_only');
    await ctx.sql.batch([
      ctx.sql.stmt("UPDATE circle_requests SET status='revoked',responded_at=CURRENT_TIMESTAMP WHERE id=?", req.id),
      ctx.sql.stmt('DELETE FROM circle_members WHERE circle_request_id=?', req.id),
      auditStmt(ctx.sql, viewer.id, 'circle_revoked', 'circle_request', req.id, ctx.requestId),
    ]);
    return { request: { id: req.id, status: 'revoked' } };
  });

  r.add('GET', '/api/circle', { tag: 'Social', summary: 'My Circle (accepted, reciprocal) with talents for matching', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ member_user_id: string; relationship_label: string | null; circle_request_id: string; added_at: string }>(
      `SELECT cm.member_user_id,cm.relationship_label,cm.circle_request_id,cm.added_at FROM circle_members cm JOIN circle_requests cr ON cr.id=cm.circle_request_id AND cr.status='accepted'
       JOIN users u ON u.id=cm.member_user_id AND u.account_status='active' WHERE cm.user_id=? ORDER BY u.display_name`,
      viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => x.member_user_id));
    const talents = rows.length ? await ctx.sql.all<{ user_id: string; name: string; level: number }>(
      `SELECT ut.user_id,t.name,ut.level FROM user_talents ut JOIN talents t ON t.id=ut.talent_id WHERE ut.visibility<>'private' AND ut.user_id IN (${rows.map(() => '?').join(',')})`, ...rows.map(x => x.member_user_id),
    ) : [];
    return { items: rows.map(x => ({ member: people.get(x.member_user_id), label: x.relationship_label, requestId: x.circle_request_id, since: iso(x.added_at), talents: talents.filter(t => t.user_id === x.member_user_id).map(t => ({ name: t.name, level: t.level })) })) };
  });

  // ------------------------------------------------------------------ trusted introductions (dual consent)
  r.add('POST', '/api/introductions', { tag: 'Social', summary: 'Propose introducing someone from my Circle to a Germination Dream owner', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const v = new V(await ctx.body());
    const dreamId = v.id('dreamId', { required: true });
    const needId = v.id('needId', { nullable: true });
    const handle = v.str('introducedHandle', { required: true, max: 40 });
    const message = v.str('message', { max: 1000 });
    v.done();
    const { dream } = await loadVisibleDream(ctx.sql, dreamId!, viewer);
    if (toApiPhase(dream.phase) !== 'germination') throw unprocessable('action_not_allowed_for_phase', 'Introductions are offered while a Dream is in Germination.');
    const introduced = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (!(await inCircle(ctx.sql, viewer.id, introduced.id))) throw unprocessable('circle_required', 'You can only introduce people from your accepted Circle.');
    const ownerId = dream.created_by;
    if (introduced.id === ownerId) throw unprocessable('already_owner');
    if (await blockedBetween(ctx.sql, introduced.id, ownerId)) throw unprocessable('introduction_unavailable');
    if (needId && !(await ctx.sql.exists('SELECT 1 FROM dream_needs WHERE id=? AND dream_id=?', needId, dreamId!))) throw unprocessable('need_not_found');
    if (await ctx.sql.exists("SELECT 1 FROM introductions WHERE dream_id=? AND introduced_user_id=? AND status='pending'", dreamId!, introduced.id)) throw conflict('introduction_pending');
    const id = newId();
    const params = { actor: viewer.displayName, dream: dream.title };
    // No contact details are disclosed: both parties only see each other's public profile.
    await ctx.sql.batch([
      ctx.sql.stmt('INSERT INTO introductions(id,initiated_by,introduced_user_id,dream_owner_id,dream_id,need_id,message) VALUES(?,?,?,?,?,?,?)', id, viewer.id, introduced.id, ownerId, dreamId!, needId ?? null, message ?? null),
      notifyStmt(ctx.sql, { userId: introduced.id, type: 'introduction.consent_requested', category: 'social', actorId: viewer.id, entityType: 'introduction', entityId: id, params, dedupeKey: `intro:${id}:introduced` }),
      notifyStmt(ctx.sql, { userId: ownerId, type: 'introduction.consent_requested', category: 'social', actorId: viewer.id, entityType: 'introduction', entityId: id, params, dedupeKey: `intro:${id}:owner` }),
      auditStmt(ctx.sql, viewer.id, 'introduction_proposed', 'introduction', id, ctx.requestId),
    ]);
    return { introduction: { id, status: 'pending', introducedStatus: 'pending', ownerStatus: 'pending' } };
  });

  r.add('GET', '/api/me/introductions', { tag: 'Social', summary: 'Introductions I proposed or that await my consent', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ id: string; initiated_by: string; introduced_user_id: string; dream_owner_id: string; dream_id: string; title: string; message: string | null; introduced_status: string; owner_status: string; status: string; group_conversation_id: string | null; created_at: string }>(
      `SELECT i.*,d.title FROM introductions i JOIN dreams d ON d.id=i.dream_id WHERE (i.initiated_by=?1 OR i.introduced_user_id=?1 OR i.dream_owner_id=?1) ORDER BY i.created_at DESC LIMIT 100`,
      viewer.id,
    );
    const people = await authorMap(ctx, rows.flatMap(x => [x.initiated_by, x.introduced_user_id, x.dream_owner_id]));
    return {
      items: rows.map(x => ({
        id: x.id, dream: { id: x.dream_id, title: x.title }, initiatedBy: people.get(x.initiated_by), introduced: people.get(x.introduced_user_id), owner: people.get(x.dream_owner_id),
        message: x.message, introducedStatus: x.introduced_status, ownerStatus: x.owner_status, status: x.status, conversationId: x.status === 'connected' ? x.group_conversation_id : null,
        myRole: x.dream_owner_id === viewer.id ? 'owner' : x.introduced_user_id === viewer.id ? 'introduced' : 'initiator', createdAt: iso(x.created_at),
      })),
    };
  });

  r.add('POST', '/api/introductions/:id/respond', { tag: 'Social', summary: 'Consent or decline; the shared conversation opens only after both accept', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const intro = await ctx.sql.first<{ id: string; initiated_by: string; introduced_user_id: string; dream_owner_id: string; dream_id: string; status: string; title: string }>('SELECT i.*,d.title FROM introductions i JOIN dreams d ON d.id=i.dream_id WHERE i.id=?', ctx.param('id'));
    if (!intro || (viewer.id !== intro.introduced_user_id && viewer.id !== intro.dream_owner_id)) throw notFound();
    if (intro.status !== 'pending') throw conflict('introduction_not_pending');
    const v = new V(await ctx.body());
    const accept = v.bool('accept', { required: true });
    v.done();
    const col = viewer.id === intro.dream_owner_id ? 'owner_status' : 'introduced_status';
    const convId = 'intro_' + intro.id;
    const bothAccepted = `EXISTS(SELECT 1 FROM introductions WHERE id=? AND introduced_status='accepted' AND owner_status='accepted')`;
    const stmts = [
      ctx.sql.stmt(`UPDATE introductions SET ${col}=? WHERE id=? AND status='pending'`, accept ? 'accepted' : 'declined', intro.id),
      ctx.sql.stmt("UPDATE introductions SET status='cancelled',completed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND (introduced_status='declined' OR owner_status='declined')", intro.id),
      // Idempotent: the group conversation id is derived from the introduction.
      ctx.sql.stmt(`INSERT OR IGNORE INTO conversations(id,type,dream_id,title,created_by,last_message_at) SELECT ?,'group',?,?,?,CURRENT_TIMESTAMP WHERE ${bothAccepted}`, convId, intro.dream_id, intro.title, intro.initiated_by, intro.id),
      ...[intro.initiated_by, intro.introduced_user_id, intro.dream_owner_id].map(uid =>
        ctx.sql.stmt(`INSERT OR IGNORE INTO conversation_members(conversation_id,user_id) SELECT ?,? WHERE ${bothAccepted}`, convId, uid, intro.id)),
      ctx.sql.stmt(`UPDATE introductions SET status='connected',group_conversation_id=?,completed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND introduced_status='accepted' AND owner_status='accepted'`, convId, intro.id),
    ];
    try { await ctx.sql.batch(stmts); } catch (e) { mapSqlError(e); }
    const after = await ctx.sql.first<{ status: string; introduced_status: string; owner_status: string }>('SELECT status,introduced_status,owner_status FROM introductions WHERE id=?', intro.id);
    if (after?.status === 'connected' || after?.status === 'cancelled') {
      const type = after.status === 'connected' ? 'introduction.connected' : 'introduction.declined';
      await ctx.sql.batch([intro.initiated_by, intro.introduced_user_id, intro.dream_owner_id].map(uid => notifyStmt(ctx.sql, { userId: uid, type, category: 'social', entityType: 'introduction', entityId: intro.id, params: { dream: intro.title }, deepLink: after.status === 'connected' ? `/chat/${convId}` : null, dedupeKey: `intro-${after.status}:${intro.id}` })));
    }
    return { introduction: { id: intro.id, status: after?.status, introducedStatus: after?.introduced_status, ownerStatus: after?.owner_status, conversationId: after?.status === 'connected' ? convId : null } };
  });

  // ------------------------------------------------------------------ video calls (authorization + lifecycle only)
  r.add('POST', '/api/calls', { tag: 'Calls', summary: 'Invite a My Circle member to a video call (session record; media provider not configured)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    v.done();
    const other = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (!(await inCircle(ctx.sql, viewer.id, other.id))) throw unprocessable('circle_required', 'Video calls are only between accepted My Circle members.');
    const id = newId();
    try {
      await ctx.sql.batch([
        ctx.sql.stmt('INSERT INTO video_call_sessions(id,initiated_by,invited_user_id) VALUES(?,?,?)', id, viewer.id, other.id),
        notifyStmt(ctx.sql, { userId: other.id, type: 'call.invitation', category: 'social', actorId: viewer.id, entityType: 'call', entityId: id, params: { actor: viewer.displayName }, dedupeKey: `call:${id}` }),
      ]);
    } catch (e) { mapSqlError(e); }
    return { call: { id, status: 'inviting', media: { provider: null, status: 'not_configured' } } };
  });

  const callOf = async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const call = await ctx.sql.first<{ id: string; initiated_by: string; invited_user_id: string; status: string; started_at: string | null; ended_at: string | null; created_at: string }>('SELECT * FROM video_call_sessions WHERE id=?', ctx.param('id'));
    if (!call || (call.initiated_by !== viewer.id && call.invited_user_id !== viewer.id)) throw notFound();
    return { viewer, call };
  };
  const callDto = (c: { id: string; status: string; started_at: string | null; ended_at: string | null; created_at: string }) => ({ id: c.id, status: c.status, startedAt: iso(c.started_at), endedAt: iso(c.ended_at), createdAt: iso(c.created_at), media: { provider: null, status: 'not_configured' } });
  r.add('GET', '/api/calls/:id', { tag: 'Calls', summary: 'Call session state', auth: 'required' }, async ctx => ({ call: callDto((await callOf(ctx)).call) }));
  const callAction = (to: 'accepted' | 'declined' | 'ended') => async (ctx: Ctx) => {
    const { viewer, call } = await callOf(ctx);
    if (to !== 'ended' && viewer.id !== call.invited_user_id) throw forbidden('invitee_only');
    if (to === 'accepted' && !(await inCircle(ctx.sql, call.initiated_by, call.invited_user_id))) throw unprocessable('circle_required');
    const from = to === 'ended' ? "('inviting','accepted')" : "('inviting')";
    const changed = await ctx.sql.run(
      `UPDATE video_call_sessions SET status=?,started_at=CASE WHEN ?='accepted' THEN CURRENT_TIMESTAMP ELSE started_at END,ended_at=CASE WHEN ? IN ('declined','ended') THEN CURRENT_TIMESTAMP ELSE ended_at END WHERE id=? AND status IN ${from}`,
      to, to, to, call.id,
    );
    if (!changed) throw conflict('call_not_active');
    return { call: callDto((await ctx.sql.first<{ id: string; status: string; started_at: string | null; ended_at: string | null; created_at: string }>('SELECT * FROM video_call_sessions WHERE id=?', call.id))!) };
  };
  r.add('POST', '/api/calls/:id/accept', { tag: 'Calls', summary: 'Accept a call invitation', auth: 'required' }, callAction('accepted'));
  r.add('POST', '/api/calls/:id/decline', { tag: 'Calls', summary: 'Decline a call invitation', auth: 'required' }, callAction('declined'));
  r.add('POST', '/api/calls/:id/end', { tag: 'Calls', summary: 'End a call', auth: 'required' }, callAction('ended'));
}
