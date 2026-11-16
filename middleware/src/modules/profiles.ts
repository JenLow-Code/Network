import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import { LOCALES } from '../http/context';
import { includeDemo } from '../config/env';
import { HANDLE_PATTERN, V, isTimeZone } from '../http/validate';
import { conflict, notFound, unprocessable } from '../http/errors';
import { decodeCursor, pageLimit } from '../http/cursor';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, parseJson, truthy, marks } from '../lib/util';
import { auditStmt, blockedBetween, userByHandle } from '../services/access';
import { feedPage, authorSummary, loadItem } from '../services/feed';
import { mediaMap, requireOwnedMedia } from './media';
import { phaseLabel, toApiPhase } from '../domain/phases';
import { levelLabel, seekingFrom } from '../domain/talents';

type ProfileRow = {
  id: string; handle: string; display_name: string; email: string; bio: string; city: string | null; country_code: string | null; church_name: string | null;
  avatar_media_id: string | null; account_status: string; is_demo: number; featured_publication_id: string | null; email_verified_at: string | null; created_at: string;
  locale: string | null; timezone: string | null; profile_visibility: string | null; show_church: number | null; discoverable: number | null; push_enabled: number | null;
  prayer_reminders_enabled: number | null; browsing_reminder_enabled: number | null; appearance: string | null; notification_opt_outs: string | null;
  quiet_hours_start: string | null; quiet_hours_end: string | null;
};

const PROFILE_SQL = `SELECT u.*, p.locale,p.timezone,p.profile_visibility,p.show_church,p.discoverable,p.push_enabled,p.prayer_reminders_enabled,
  p.browsing_reminder_enabled,p.appearance,p.notification_opt_outs,p.quiet_hours_start,p.quiet_hours_end
  FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id`;

const CATEGORIES = ['dreams', 'collaboration', 'music', 'social', 'messages', 'agenda', 'prayer'] as const;

function preferences(r: ProfileRow) {
  return {
    locale: r.locale || 'fr', timezone: r.timezone || 'Europe/Paris', profileVisibility: r.profile_visibility || 'public',
    showChurch: truthy(r.show_church), discoverable: r.discoverable === null ? true : truthy(r.discoverable), pushEnabled: truthy(r.push_enabled),
    prayerRemindersEnabled: truthy(r.prayer_reminders_enabled), browsingReminderEnabled: r.browsing_reminder_enabled === null ? true : truthy(r.browsing_reminder_enabled),
    appearance: r.appearance || 'system', notificationOptOuts: parseJson<string[]>(r.notification_opt_outs, []),
    quietHours: r.quiet_hours_start && r.quiet_hours_end ? { start: r.quiet_hours_start, end: r.quiet_hours_end } : null,
  };
}

async function featured(ctx: Ctx, userId: string, featuredId: string | null) {
  if (!featuredId) return null;
  const item = await loadItem(ctx, featuredId, { includeDemo: true, allowOwnPrivate: false });
  // Fallback: a featured post that became private, deleted, hidden or blocked is simply not shown.
  return item && item.author.id === userId && item.visibility === 'public' ? item : null;
}

async function myProfile(ctx: Ctx, viewer: Viewer) {
  const r = await ctx.sql.first<ProfileRow>(PROFILE_SQL + ' WHERE u.id=?', viewer.id);
  if (!r) throw notFound();
  const media = await mediaMap(ctx, [r.avatar_media_id]);
  return {
    user: {
      id: r.id, handle: r.handle, displayName: r.display_name, email: r.email, emailVerified: !!r.email_verified_at, bio: r.bio, city: r.city,
      countryCode: r.country_code, church: r.church_name, avatar: r.avatar_media_id ? media.get(r.avatar_media_id) ?? null : null,
      featuredPublicationId: r.featured_publication_id, roles: viewer.roles, createdAt: iso(r.created_at),
    },
    preferences: preferences(r),
  };
}

export function registerProfiles(r: Router): void {
  r.add('GET', '/api/me', { tag: 'Profile', summary: 'My account, profile and preferences', auth: 'required' }, async ctx => myProfile(ctx, await ctx.user()));

  r.add('PATCH', '/api/me', { tag: 'Profile', summary: 'Update my profile (name, handle, bio, city, optional church, avatar)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const displayName = v.str('displayName', { min: 2, max: 100 });
    const handle = v.str('handle', { pattern: HANDLE_PATTERN });
    const bio = v.str('bio', { max: 600, nullable: true });
    const city = v.str('city', { max: 100, nullable: true });
    const countryCode = v.str('countryCode', { pattern: /^[A-Z]{2}$/, nullable: true });
    const church = v.str('church', { max: 120, nullable: true });
    const avatarMediaId = v.id('avatarMediaId', { nullable: true });
    v.done();
    if (avatarMediaId) await requireOwnedMedia(ctx.sql, avatarMediaId, viewer.id, ['image']);
    if (handle && handle.toLowerCase() !== viewer.handle.toLowerCase() && (await userByHandle(ctx.sql, handle))) throw conflict('handle_taken');
    const sets: string[] = [];
    const args: (string | null)[] = [];
    const set = (col: string, val: string | null | undefined) => {
      if (val !== undefined) { sets.push(col + '=?'); args.push(val); }
    };
    set('display_name', displayName);
    set('handle', handle?.toLowerCase());
    if (bio !== undefined) set('bio', bio ?? '');
    set('city', city);
    set('country_code', countryCode);
    set('church_name', church);
    set('avatar_media_id', avatarMediaId);
    if (sets.length) {
      try {
        await ctx.sql.run(`UPDATE users SET ${sets.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`, ...args, viewer.id);
      } catch (e) {
        if (String(e).includes('UNIQUE')) throw conflict('handle_taken');
        throw e;
      }
    }
    return myProfile(ctx, { ...viewer, handle: handle ?? viewer.handle });
  });

  r.add('GET', '/api/me/preferences', { tag: 'Profile', summary: 'My preferences', auth: 'required' }, async ctx => ({ preferences: (await myProfile(ctx, await ctx.user())).preferences }));

  r.add('PATCH', '/api/me/preferences', { tag: 'Profile', summary: 'Update locale, timezone, privacy, appearance and notification preferences', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const locale = v.oneOf('locale', LOCALES);
    const timezone = v.str('timezone', { max: 64 });
    if (timezone && !isTimeZone(timezone)) v.addError('timezone', 'invalid_timezone');
    const profileVisibility = v.oneOf('profileVisibility', ['public', 'members', 'private'] as const);
    const appearance = v.oneOf('appearance', ['system', 'light', 'dark'] as const);
    const bools = ['showChurch', 'discoverable', 'pushEnabled', 'prayerRemindersEnabled', 'browsingReminderEnabled'].map(k => [k, v.bool(k)] as const);
    const optOuts = v.array('notificationOptOuts', x => (typeof x === 'string' && (CATEGORIES as readonly string[]).includes(x) ? x : undefined), { max: 10 });
    const quiet = (await ctx.body()).quietHours;
    let quietStart: string | null | undefined, quietEnd: string | null | undefined;
    if (quiet === null) { quietStart = null; quietEnd = null; }
    else if (quiet !== undefined) {
      const q = new V(quiet as Record<string, unknown>);
      quietStart = q.str('start', { required: true, pattern: /^([01]\d|2[0-3]):[0-5]\d$/ }) ?? undefined;
      quietEnd = q.str('end', { required: true, pattern: /^([01]\d|2[0-3]):[0-5]\d$/ }) ?? undefined;
      q.done();
    }
    v.done();
    const cols: Record<string, string> = { showChurch: 'show_church', discoverable: 'discoverable', pushEnabled: 'push_enabled', prayerRemindersEnabled: 'prayer_reminders_enabled', browsingReminderEnabled: 'browsing_reminder_enabled' };
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const set = (col: string, val: string | number | null | undefined) => { if (val !== undefined) { sets.push(col + '=?'); args.push(val); } };
    set('locale', locale);
    set('timezone', timezone);
    set('profile_visibility', profileVisibility);
    set('appearance', appearance);
    for (const [k, val] of bools) if (val !== undefined) set(cols[k], val ? 1 : 0);
    if (optOuts) set('notification_opt_outs', JSON.stringify(Array.from(new Set(optOuts))));
    set('quiet_hours_start', quietStart);
    set('quiet_hours_end', quietEnd);
    await ctx.sql.run('INSERT OR IGNORE INTO user_preferences(user_id) VALUES(?)', viewer.id);
    if (sets.length) await ctx.sql.run(`UPDATE user_preferences SET ${sets.join(',')},updated_at=CURRENT_TIMESTAMP WHERE user_id=?`, ...args, viewer.id);
    return { preferences: (await myProfile(ctx, viewer)).preferences };
  });

  r.add('GET', '/api/me/dreams', { tag: 'Profile', summary: 'My Dreams, including private drafts (compact list with phase)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const locale = await ctx.locale();
    const rows = await ctx.sql.all<{ id: string; title: string; summary: string; phase: string; visibility: string; goal_date: string | null; paused: number; cover_media_id: string | null; created_by: string; created_at: string; updated_at: string; publication_id: string | null; role: string }>(
      `SELECT d.id,d.title,d.summary,d.phase,d.visibility,d.goal_date,d.paused,d.cover_media_id,d.created_by,d.created_at,d.updated_at,
         (SELECT id FROM publications p WHERE p.dream_id=d.id AND p.type='dream' AND p.deleted_at IS NULL) AS publication_id,
         CASE WHEN d.created_by=?1 THEN 'creator' ELSE 'co_owner' END AS role
       FROM dreams d JOIN dream_owners o ON o.dream_id=d.id AND o.user_id=?1 AND o.status='accepted'
       WHERE d.deleted_at IS NULL ORDER BY d.updated_at DESC, d.id DESC LIMIT 200`,
      viewer.id,
    );
    const media = await mediaMap(ctx, rows.map(x => x.cover_media_id));
    return {
      items: rows.map(d => {
        const phase = toApiPhase(d.phase);
        return {
          id: d.id, publicationId: d.publication_id, title: d.title, summary: d.summary, phase, phaseLabel: phaseLabel(phase, locale),
          visibility: d.visibility, locked: d.visibility !== 'public', goalDate: d.goal_date, paused: d.paused === 1, role: d.role,
          cover: d.cover_media_id ? media.get(d.cover_media_id) ?? null : null, createdAt: iso(d.created_at), updatedAt: iso(d.updated_at),
        };
      }),
    };
  });

  r.add('GET', '/api/me/publications', { tag: 'Profile', summary: 'My publications and talent showcases, private ones marked locked', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    return feedPage(ctx, { viewer, cursor: decodeCursor(ctx.query('cursor')), limit: pageLimit(ctx.query('limit')), authorId: viewer.id, ownerView: true, includeDemo: true });
  });

  r.add('GET', '/api/me/featured-post', { tag: 'Profile', summary: 'My featured publication (null when none or no longer eligible)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const row = await ctx.sql.first<{ featured_publication_id: string | null }>('SELECT featured_publication_id FROM users WHERE id=?', viewer.id);
    return { item: await featured(ctx, viewer.id, row?.featured_publication_id ?? null) };
  });

  r.add('PUT', '/api/me/featured-post', { tag: 'Profile', summary: 'Feature one of my public publications on my profile', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const publicationId = v.id('publicationId', { required: true });
    v.done();
    const ok = await ctx.sql.exists("SELECT 1 FROM publications WHERE id=? AND author_id=? AND visibility='public' AND deleted_at IS NULL AND moderation_hidden_at IS NULL", publicationId!, viewer.id);
    if (!ok) throw unprocessable('publication_not_eligible', 'Only your own public publications can be featured.');
    await ctx.sql.run('UPDATE users SET featured_publication_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', publicationId!, viewer.id);
    return { item: await featured(ctx, viewer.id, publicationId!) };
  });

  r.add('DELETE', '/api/me/featured-post', { tag: 'Profile', summary: 'Remove my featured publication', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await ctx.sql.run('UPDATE users SET featured_publication_id=NULL WHERE id=?', viewer.id);
    return { item: null };
  });

  r.add('GET', '/api/users/:handle', { tag: 'Profile', summary: 'Public profile by handle (privacy and blocks enforced)', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const r0 = await ctx.sql.first<ProfileRow>(PROFILE_SQL + ' WHERE u.handle=? COLLATE NOCASE', ctx.param('handle'));
    const isSelf = !!viewer && r0?.id === viewer.id;
    if (!r0 || !(r0.account_status === 'active' || r0.is_demo === 1)) throw notFound();
    if (!isSelf) {
      if (r0.is_demo === 1 && !includeDemo(ctx.env)) throw notFound();
      const vis = r0.profile_visibility || 'public';
      if (vis === 'private' || (vis === 'members' && !viewer)) throw notFound();
      if (viewer && (await blockedBetween(ctx.sql, viewer.id, r0.id))) throw notFound();
    }
    const media = await mediaMap(ctx, [r0.avatar_media_id]);
    const author = authorSummary({ ...r0, show_church: r0.show_church }, media);
    const talents = await talentTiles(ctx, r0.id, isSelf);
    return {
      profile: {
        ...author, bio: r0.bio, city: r0.city, countryCode: r0.country_code, isSelf, memberSince: iso(r0.created_at),
        talents, featured: await featured(ctx, r0.id, r0.featured_publication_id),
      },
    };
  });

  r.add('GET', '/api/users/:handle/publications', { tag: 'Profile', summary: 'One-column profile feed; the owner also sees their locked drafts', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const user = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!user || !(user.account_status === 'active' || user.is_demo === 1)) throw notFound();
    const isSelf = viewer?.id === user.id;
    if (!isSelf && viewer && (await blockedBetween(ctx.sql, viewer.id, user.id))) throw notFound();
    const prefs = await ctx.sql.first<{ profile_visibility: string }>('SELECT profile_visibility FROM user_preferences WHERE user_id=?', user.id);
    if (!isSelf && (prefs?.profile_visibility === 'private' || (prefs?.profile_visibility === 'members' && !viewer))) throw notFound();
    return feedPage(ctx, { viewer, cursor: decodeCursor(ctx.query('cursor')), limit: pageLimit(ctx.query('limit')), authorId: user.id, ownerView: isSelf, includeDemo: true });
  });

  r.add('GET', '/api/users/:handle/talents', { tag: 'Profile', summary: 'Talent tiles of a member', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const user = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!user || !(user.account_status === 'active' || user.is_demo === 1)) throw notFound();
    if (viewer && viewer.id !== user.id && (await blockedBetween(ctx.sql, viewer.id, user.id))) throw notFound();
    return { items: await talentTiles(ctx, user.id, viewer?.id === user.id) };
  });

  r.add('GET', '/api/users', { tag: 'Profile', summary: 'Find discoverable members by name or handle', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'search', viewer.id, LIMITS.search);
    const q = (ctx.query('q') || '').trim();
    if (q.length < 2) throw unprocessable('query_too_short');
    const like = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
    const rows = await ctx.sql.all<{ id: string; handle: string; display_name: string; church_name: string | null; avatar_media_id: string | null; is_demo: number; show_church: number | null }>(
      `SELECT u.id,u.handle,u.display_name,u.church_name,u.avatar_media_id,u.is_demo,p.show_church FROM users u JOIN user_preferences p ON p.user_id=u.id
       WHERE u.account_status='active' AND p.discoverable=1 AND p.profile_visibility<>'private' AND u.id<>?1
         AND (u.display_name LIKE ?2 ESCAPE '\\' OR u.handle LIKE ?2 ESCAPE '\\')
         AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=?1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=?1))
       ORDER BY u.display_name LIMIT 20`,
      viewer.id, like,
    );
    const media = await mediaMap(ctx, rows.map(x => x.avatar_media_id));
    return { items: rows.map(x => authorSummary(x, media)) };
  });

  r.add('GET', '/api/me/blocks', { tag: 'Safety', summary: 'Members I blocked', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ handle: string; display_name: string; created_at: string }>('SELECT u.handle,u.display_name,b.created_at FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at DESC', viewer.id);
    return { items: rows.map(x => ({ handle: x.handle, displayName: x.display_name, blockedAt: iso(x.created_at) })) };
  });

  r.add('POST', '/api/users/:handle/block', { tag: 'Safety', summary: 'Block a member (hides content and stops interactions both ways)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const user = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!user || user.id === viewer.id) throw notFound();
    const v = new V(await ctx.optionalBody());
    const reason = v.str('reason', { max: 300 });
    v.done();
    await ctx.sql.batch([
      ctx.sql.stmt('INSERT OR IGNORE INTO user_blocks(blocker_id,blocked_id,reason) VALUES(?,?,?)', viewer.id, user.id, reason ?? null),
      // A block ends softer relationships: contacts, Circle, pending requests and introductions.
      ctx.sql.stmt('DELETE FROM contacts WHERE (user_id=?1 AND contact_user_id=?2) OR (user_id=?2 AND contact_user_id=?1)', viewer.id, user.id),
      ctx.sql.stmt('DELETE FROM circle_members WHERE (user_id=?1 AND member_user_id=?2) OR (user_id=?2 AND member_user_id=?1)', viewer.id, user.id),
      ctx.sql.stmt("UPDATE circle_requests SET status='revoked',responded_at=CURRENT_TIMESTAMP WHERE status IN ('pending','accepted') AND ((requester_id=?1 AND recipient_id=?2) OR (requester_id=?2 AND recipient_id=?1))", viewer.id, user.id),
      ctx.sql.stmt("UPDATE contact_requests SET status='cancelled',responded_at=CURRENT_TIMESTAMP WHERE status='pending' AND ((requester_id=?1 AND recipient_id=?2) OR (requester_id=?2 AND recipient_id=?1))", viewer.id, user.id),
      auditStmt(ctx.sql, viewer.id, 'user_blocked', 'user', user.id, ctx.requestId),
    ]);
    return { blocked: true };
  });

  r.add('DELETE', '/api/users/:handle/block', { tag: 'Safety', summary: 'Unblock a member', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const user = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!user) throw notFound();
    await ctx.sql.run('DELETE FROM user_blocks WHERE blocker_id=? AND blocked_id=?', viewer.id, user.id);
    return { blocked: false };
  });

  r.add('GET', '/api/me/export', { tag: 'Privacy', summary: 'Download a JSON copy of my data (GDPR access/portability)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const u = viewer.id;
    const q = (sql: string) => ctx.sql.all(sql, u);
    const data = {
      exportedAt: new Date().toISOString(),
      profile: (await myProfile(ctx, viewer)),
      consents: await q('SELECT consent_type,policy_version,granted,recorded_at,source FROM consent_records WHERE user_id=?'),
      talents: await q('SELECT ut.*,t.name FROM user_talents ut JOIN talents t ON t.id=ut.talent_id WHERE ut.user_id=?'),
      dreams: await q('SELECT d.* FROM dreams d JOIN dream_owners o ON o.dream_id=d.id WHERE o.user_id=? AND o.status=\'accepted\''),
      dreamEntries: await q('SELECT * FROM dream_entries WHERE author_id=?'),
      offers: await q('SELECT * FROM dream_help_offers WHERE offered_by=?'),
      publications: await q('SELECT * FROM publications WHERE author_id=?'),
      fire: await q('SELECT * FROM fire_saves WHERE user_id=?'),
      fireFolders: await q('SELECT f.*, (SELECT json_group_array(publication_id) FROM fire_folder_items i WHERE i.folder_id=f.id) AS items FROM fire_folders f WHERE f.user_id=?'),
      prayers: await q('SELECT * FROM prayer_list WHERE user_id=?'),
      prayerReminders: await q('SELECT * FROM prayer_saves WHERE user_id=?'),
      contacts: await q('SELECT contact_user_id,added_at FROM contacts WHERE user_id=?'),
      circle: await q('SELECT member_user_id,relationship_label,added_at FROM circle_members WHERE user_id=?'),
      blocks: await q('SELECT blocked_id,created_at FROM user_blocks WHERE blocker_id=?'),
      messagesSent: await q('SELECT id,conversation_id,message_type,body,sent_at,edited_at,deleted_at FROM messages WHERE sender_id=?'),
      events: await q('SELECT * FROM agenda_events WHERE creator_id=?'),
      invitations: await q('SELECT * FROM agenda_invites WHERE user_id=?'),
      notifications: await q('SELECT notification_type,entity_type,entity_id,created_at,read_at FROM notifications WHERE user_id=?'),
      media: await q('SELECT id,media_type,mime_type,bytes,purpose,external_url,attribution,created_at FROM media_assets WHERE owner_id=?'),
      devices: await q('SELECT id,platform,created_at,revoked_at FROM user_devices WHERE user_id=?'),
    };
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="jenlow-export.json"', 'Cache-Control': 'no-store' },
    });
  });

  const deletionRequest = async (ctx: Ctx) => {
    const viewer = await ctx.user();
    await ctx.sql.batch([
      ctx.sql.stmt("UPDATE users SET account_status='deleting',updated_at=CURRENT_TIMESTAMP WHERE id=?", viewer.id),
      ctx.sql.stmt('UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL', viewer.id),
      ctx.sql.stmt('UPDATE user_devices SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL', viewer.id),
      auditStmt(ctx.sql, viewer.id, 'account_deletion_requested', 'user', viewer.id, ctx.requestId),
    ]);
    return { accepted: true, status: 'deleting', message: 'Account deactivated and sessions revoked. Erasure is completed by an operator workflow (see middleware/README.md).' };
  };
  r.add('POST', '/api/me/deletion-request', { tag: 'Privacy', summary: 'Request account deletion (deactivates now, erasure by operator)', auth: 'required', status: 202 }, deletionRequest);
  r.add('POST', '/v1/account/deletion-request', { tag: 'Privacy', summary: 'Alias kept from the OAuth prototype', auth: 'required', status: 202 }, deletionRequest);

  r.add('POST', '/api/me/consents', { tag: 'Privacy', summary: 'Record consent to a policy version', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const type = v.oneOf('consentType', ['terms', 'privacy', 'marketing', 'recording', 'external_share'] as const, { required: true });
    const version = v.str('policyVersion', { required: true, max: 40 });
    const granted = v.bool('granted', { required: true });
    v.done();
    await ctx.sql.run('INSERT INTO consent_records(id,user_id,consent_type,policy_version,granted,source) VALUES(?,?,?,?,?,?)', crypto.randomUUID(), viewer.id, type!, version!, granted ? 1 : 0, 'api');
    return { recorded: true };
  });
}

/** Talent tiles for profiles. Private talents are shown to their owner only. */
export async function talentTiles(ctx: Ctx, userId: string, isSelf: boolean) {
  const locale = await ctx.locale();
  const viewer = await ctx.viewer();
  const rows = await ctx.sql.all<{ talent_id: string; name: string; slug: string | null; category: string; level: number; can_teach: number; wants_to_learn: number; wants_tandem: number; available_for_projects: number; description: string | null; experience: string | null; illustration: string | null; t_illustration: string | null; visibility: string; post_id: string | null }>(
    `SELECT ut.talent_id,t.name,t.slug,t.category,ut.level,ut.can_teach,ut.wants_to_learn,ut.wants_tandem,ut.available_for_projects,ut.description,ut.experience,
       ut.illustration,t.illustration AS t_illustration,ut.visibility,
       (SELECT tp.publication_id FROM talent_publications tp JOIN publications p ON p.id=tp.publication_id WHERE tp.user_id=ut.user_id AND tp.talent_id=ut.talent_id AND p.deleted_at IS NULL) AS post_id
     FROM user_talents ut JOIN talents t ON t.id=ut.talent_id WHERE ut.user_id=? ORDER BY ut.level DESC, t.name`,
    userId,
  );
  const visible = rows.filter(x => isSelf || x.visibility === 'public' || (x.visibility === 'members' && !!viewer));
  const mediaRows = visible.length
    ? await ctx.sql.all<{ talent_id: string; media_id: string }>(`SELECT talent_id,media_id FROM user_talent_media WHERE user_id=? AND talent_id IN (${marks(visible.length)}) ORDER BY sort_order`, userId, ...visible.map(x => x.talent_id))
    : [];
  const media = await mediaMap(ctx, mediaRows.map(x => x.media_id));
  return visible.map(x => ({
    talentId: x.talent_id, showcaseId: x.post_id, name: x.name, slug: x.slug, category: x.category, level: x.level, levelLabel: levelLabel(x.level, locale),
    illustration: x.illustration || x.t_illustration, description: x.description, experience: x.experience, seeking: seekingFrom(x, locale),
    canTeach: x.can_teach === 1, wantsToLearn: x.wants_to_learn === 1, wantsTandem: x.wants_tandem === 1, availableForProjects: x.available_for_projects === 1,
    visibility: x.visibility, locked: isSelf && x.visibility !== 'public',
    samples: mediaRows.filter(m => m.talent_id === x.talent_id).map(m => media.get(m.media_id)).filter(Boolean),
  }));
}
