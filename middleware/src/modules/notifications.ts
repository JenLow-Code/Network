import type { Router } from '../http/router';
import { V } from '../http/validate';
import { notFound } from '../http/errors';
import { decodeCursor, encodeCursor, pageLimit } from '../http/cursor';
import { iso, newId, sha256Hex } from '../lib/util';
import { renderNotification } from '../services/notifications';
import { authorMap } from '../services/feed';

export function registerNotifications(r: Router): void {
  r.add('GET', '/api/notifications', { tag: 'Notifications', summary: 'My in-app notifications, localized at read time (?unread=1)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const locale = await ctx.locale();
    const cursor = decodeCursor(ctx.query('cursor'));
    const limit = pageLimit(ctx.query('limit'), 30, 100);
    const unreadOnly = ctx.query('unread') === '1';
    const rows = await ctx.sql.all<{ id: string; notification_type: string; category: string | null; actor_id: string | null; entity_type: string | null; entity_id: string | null; body: string | null; deep_link: string | null; read_at: string | null; created_at: string }>(
      `SELECT id,notification_type,category,actor_id,entity_type,entity_id,body,deep_link,read_at,created_at FROM notifications
       WHERE user_id=? AND status='sent' ${unreadOnly ? 'AND read_at IS NULL' : ''} ${cursor ? 'AND (created_at<? OR (created_at=? AND id<?))' : ''}
       ORDER BY created_at DESC, id DESC LIMIT ?`,
      ...(cursor ? [viewer.id, cursor.t, cursor.t, cursor.id, limit + 1] : [viewer.id, limit + 1]),
    );
    const page = rows.slice(0, limit);
    const actors = await authorMap(ctx, page.map(n => n.actor_id).filter((x): x is string => !!x));
    const last = page[page.length - 1];
    return {
      items: page.map(n => ({
        id: n.id, type: n.notification_type, category: n.category, ...renderNotification(n.notification_type, n.body, locale),
        actor: n.actor_id ? actors.get(n.actor_id) ?? null : null, entity: n.entity_type ? { type: n.entity_type, id: n.entity_id } : null,
        deepLink: n.deep_link, read: !!n.read_at, createdAt: iso(n.created_at),
      })),
      nextCursor: rows.length > limit && last ? encodeCursor({ t: last.created_at, id: last.id }) : null,
    };
  });

  r.add('GET', '/api/notifications/unread-count', { tag: 'Notifications', summary: 'Unread notification count', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const n = await ctx.sql.first<{ n: number }>("SELECT count(*) AS n FROM notifications WHERE user_id=? AND status='sent' AND read_at IS NULL", viewer.id);
    return { count: n?.n ?? 0 };
  });

  r.add('POST', '/api/notifications/:id/read', { tag: 'Notifications', summary: 'Mark one notification read', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const changed = await ctx.sql.run('UPDATE notifications SET read_at=coalesce(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?', ctx.param('id'), viewer.id);
    if (!changed) throw notFound();
    return { read: true };
  });

  r.add('POST', '/api/notifications/read-all', { tag: 'Notifications', summary: 'Mark all notifications read', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const n = await ctx.sql.run('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL', viewer.id);
    return { updated: n };
  });

  r.add('POST', '/api/me/devices', { tag: 'Notifications', summary: 'Register this device for push (stored hashed; delivery provider not configured)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const platform = v.oneOf('platform', ['ios', 'android', 'web'] as const, { required: true });
    const pushToken = v.str('pushToken', { required: true, max: 4096 });
    v.done();
    const hash = await sha256Hex(pushToken!);
    const existing = await ctx.sql.first<{ id: string; user_id: string }>('SELECT id,user_id FROM user_devices WHERE push_token_hash=?', hash);
    const id = existing?.id ?? newId();
    // Token ciphertext is not stored until a push provider and encryption key are configured.
    if (existing) await ctx.sql.run('UPDATE user_devices SET user_id=?,platform=?,last_seen_at=CURRENT_TIMESTAMP,revoked_at=NULL WHERE id=?', viewer.id, platform!, id);
    else await ctx.sql.run('INSERT INTO user_devices(id,user_id,platform,push_token_hash,last_seen_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)', id, viewer.id, platform!, hash);
    return { device: { id, platform }, push: { status: 'not_configured', reason: 'No push provider credentials are configured on the server.' } };
  });

  r.add('GET', '/api/me/devices', { tag: 'Notifications', summary: 'My registered devices', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ id: string; platform: string; created_at: string; last_seen_at: string | null; revoked_at: string | null }>('SELECT id,platform,created_at,last_seen_at,revoked_at FROM user_devices WHERE user_id=? ORDER BY created_at DESC', viewer.id);
    return { items: rows.map(d => ({ id: d.id, platform: d.platform, createdAt: iso(d.created_at), lastSeenAt: iso(d.last_seen_at), revoked: !!d.revoked_at })) };
  });

  r.add('DELETE', '/api/me/devices/:id', { tag: 'Notifications', summary: 'Revoke a device', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const changed = await ctx.sql.run('UPDATE user_devices SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', ctx.param('id'), viewer.id);
    if (!changed) throw notFound();
    return { revoked: true };
  });
}
