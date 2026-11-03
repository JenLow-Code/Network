import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import { V } from '../http/validate';
import { conflict, forbidden, notFound, unprocessable } from '../http/errors';
import { decodeCursor, encodeCursor, pageLimit } from '../http/cursor';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId, sqlNowMs, toSqlTime, marks } from '../lib/util';
import { activeMemberByHandle, areContacts, blockedBetween, inCircle } from '../services/access';
import { notifyStmt } from '../services/notifications';
import { authorMap, loadItem } from '../services/feed';
import { mediaMap, requireOwnedMedia } from './media';

/**
 * Messages are persisted in D1 first; clients poll (/api/updates or ?after=) for new ones.
 * No push channel is claimed. Membership (and blocks for direct threads) is checked on
 * every read and write.
 */
type ConvRow = { id: string; type: string; dream_id: string | null; title: string | null; created_by: string | null; created_at: string; archived_at: string | null; last_message_at: string | null; direct_key: string | null };
type MemberRow = { conversation_id: string; user_id: string; role: string; last_read_at: string | null; muted_until: string | null; left_at: string | null; archived_at: string | null };

async function membership(ctx: Ctx, conversationId: string, viewer: Viewer): Promise<{ conv: ConvRow; me: MemberRow }> {
  const conv = await ctx.sql.first<ConvRow>('SELECT * FROM conversations WHERE id=?', conversationId);
  if (!conv) throw notFound();
  const me = await ctx.sql.first<MemberRow>('SELECT * FROM conversation_members WHERE conversation_id=? AND user_id=?', conversationId, viewer.id);
  if (!me || me.left_at) throw notFound();
  if (conv.type === 'direct') {
    const other = await ctx.sql.first<{ user_id: string }>('SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>?', conversationId, viewer.id);
    if (other && (await blockedBetween(ctx.sql, viewer.id, other.user_id))) throw notFound();
  }
  if (conv.dream_id && conv.type === 'dream' && (await ctx.sql.exists('SELECT 1 FROM dreams WHERE id=? AND deleted_at IS NOT NULL', conv.dream_id))) throw notFound();
  return { conv, me };
}

type MessageRow = { seq?: number; id: string; conversation_id: string; sender_id: string | null; message_type: string; body: string | null; publication_id: string | null; media_id: string | null; agenda_event_id: string | null; sent_at: string; edited_at: string | null; deleted_at: string | null; moderation_hidden_at: string | null; client_message_id: string | null };

async function renderMessages(ctx: Ctx, viewer: Viewer, rows: MessageRow[]) {
  const people = await authorMap(ctx, rows.map(r => r.sender_id).filter((x): x is string => !!x));
  const media = await mediaMap(ctx, rows.map(r => (r.deleted_at ? null : r.media_id)));
  const reactions = rows.length ? await ctx.sql.all<{ message_id: string; reaction: string; n: number; mine: number }>(
    `SELECT message_id,reaction,count(*) AS n,max(user_id=?) AS mine FROM message_reactions WHERE message_id IN (${marks(rows.length)}) GROUP BY message_id,reaction`,
    viewer.id, ...rows.map(r => r.id),
  ) : [];
  const out = [];
  for (const m of rows) {
    const removed = !!(m.deleted_at || m.moderation_hidden_at);
    // Shared publications are re-checked for this reader: a later private or deleted item is not shown.
    const shared = !removed && m.publication_id ? await loadItem(ctx, m.publication_id, { includeDemo: true }) : null;
    out.push({
      id: m.id, conversationId: m.conversation_id, sender: m.sender_id ? people.get(m.sender_id) ?? null : null, type: m.message_type,
      body: removed ? null : m.body, removed, publication: shared, media: m.media_id ? media.get(m.media_id) ?? null : null, agendaEventId: removed ? null : m.agenda_event_id,
      sentAt: iso(m.sent_at), editedAt: iso(m.edited_at), mine: m.sender_id === viewer.id, clientMessageId: m.sender_id === viewer.id ? m.client_message_id : null,
      reactions: reactions.filter(x => x.message_id === m.id).map(x => ({ reaction: x.reaction, count: x.n, mine: !!x.mine })),
    });
  }
  return out;
}

export function registerMessaging(r: Router): void {
  r.add('GET', '/api/conversations', { tag: 'Messages', summary: 'My conversations by recent activity, with unread counts', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const archived = ctx.query('archived') === '1';
    const rows = await ctx.sql.all<ConvRow & { last_read_at: string | null; muted_until: string | null; unread: number; my_archived: string | null }>(
      `SELECT c.*,m.last_read_at,m.muted_until,m.archived_at AS my_archived,
         (SELECT count(*) FROM messages x WHERE x.conversation_id=c.id AND x.deleted_at IS NULL AND (x.sender_id IS NULL OR x.sender_id<>?1) AND (m.last_read_at IS NULL OR x.sent_at>m.last_read_at)) AS unread
       FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=?1 AND m.left_at IS NULL
       WHERE ${archived ? 'm.archived_at IS NOT NULL' : 'm.archived_at IS NULL'}
         AND NOT (c.type='direct' AND EXISTS(SELECT 1 FROM conversation_members o JOIN user_blocks b ON (b.blocker_id=?1 AND b.blocked_id=o.user_id) OR (b.blocker_id=o.user_id AND b.blocked_id=?1) WHERE o.conversation_id=c.id AND o.user_id<>?1))
       ORDER BY coalesce(c.last_message_at,c.created_at) DESC LIMIT 100`,
      viewer.id,
    );
    const ids = rows.map(x => x.id);
    const members = ids.length ? await ctx.sql.all<{ conversation_id: string; user_id: string }>(`SELECT conversation_id,user_id FROM conversation_members WHERE left_at IS NULL AND conversation_id IN (${marks(ids.length)})`, ...ids) : [];
    const last = ids.length ? await ctx.sql.all<MessageRow>(
      `SELECT * FROM messages x WHERE x.conversation_id IN (${marks(ids.length)}) AND x.sent_at=(SELECT max(sent_at) FROM messages y WHERE y.conversation_id=x.conversation_id) GROUP BY x.conversation_id`, ...ids,
    ) : [];
    const people = await authorMap(ctx, members.map(m => m.user_id));
    return {
      items: rows.map(c => {
        const others = members.filter(m => m.conversation_id === c.id && m.user_id !== viewer.id).map(m => people.get(m.user_id));
        const lm = last.find(l => l.conversation_id === c.id);
        return {
          id: c.id, type: c.type, dreamId: c.dream_id, title: c.type === 'direct' ? others[0]?.displayName ?? null : c.title, members: others, unread: c.unread,
          muted: !!(c.muted_until && Date.parse(iso(c.muted_until) || '') > Date.now()), archived: !!c.my_archived,
          lastMessage: lm ? { type: lm.message_type, preview: lm.deleted_at || lm.moderation_hidden_at ? null : (lm.body || '').slice(0, 140), sentAt: iso(lm.sent_at), mine: lm.sender_id === viewer.id } : null,
          lastActivityAt: iso(c.last_message_at || c.created_at),
        };
      }),
    };
  });

  r.add('POST', '/api/conversations', { tag: 'Messages', summary: 'Open (or reuse) a direct conversation with a contact or Circle member', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    v.done();
    const other = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (!(await areContacts(ctx.sql, viewer.id, other.id)) && !(await inCircle(ctx.sql, viewer.id, other.id))) throw unprocessable('contact_required', 'Direct messages are between contacts or Circle members.');
    const key = [viewer.id, other.id].sort().join(':');
    const id = 'direct_' + key;
    await ctx.sql.batch([
      ctx.sql.stmt("INSERT OR IGNORE INTO conversations(id,type,created_by,direct_key,last_message_at) VALUES(?,'direct',?,?,CURRENT_TIMESTAMP)", id, viewer.id, key),
      ctx.sql.stmt('INSERT OR IGNORE INTO conversation_members(conversation_id,user_id) VALUES(?,?)', id, viewer.id),
      ctx.sql.stmt('INSERT OR IGNORE INTO conversation_members(conversation_id,user_id) VALUES(?,?)', id, other.id),
      ctx.sql.stmt('UPDATE conversation_members SET left_at=NULL WHERE conversation_id=? AND user_id IN (?,?)', id, viewer.id, other.id),
    ]);
    return { conversationId: id };
  });

  r.add('GET', '/api/conversations/:id', { tag: 'Messages', summary: 'Conversation detail and members', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const { conv, me } = await membership(ctx, ctx.param('id'), viewer);
    const members = await ctx.sql.all<{ user_id: string; role: string }>('SELECT user_id,role FROM conversation_members WHERE conversation_id=? AND left_at IS NULL', conv.id);
    const people = await authorMap(ctx, members.map(m => m.user_id));
    return { conversation: { id: conv.id, type: conv.type, dreamId: conv.dream_id, title: conv.title, members: members.map(m => ({ ...people.get(m.user_id), role: m.role })), lastReadAt: iso(me.last_read_at), mutedUntil: iso(me.muted_until), archived: !!me.archived_at } };
  });

  r.add('GET', '/api/conversations/:id/messages', { tag: 'Messages', summary: 'Messages, newest first (?cursor= for older, ?after=<iso> for new ones since)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    const limit = pageLimit(ctx.query('limit'), 30, 100);
    const after = ctx.query('after');
    if (after) {
      const since = after.includes('T') ? toSqlTime(after) : after;
      const rows = await ctx.sql.all<MessageRow>('SELECT rowid AS seq,* FROM messages WHERE conversation_id=? AND (sent_at>? OR edited_at>? OR deleted_at>?) ORDER BY sent_at,rowid LIMIT ?', conv.id, since, since, since, limit);
      return { items: await renderMessages(ctx, viewer, rows), nextCursor: null, serverTime: new Date().toISOString() };
    }
    const cursor = decodeCursor(ctx.query('cursor'));
    // Insertion order (rowid) breaks ties between messages sent in the same millisecond.
    const rows = await ctx.sql.all<MessageRow>(
      `SELECT rowid AS seq,* FROM messages WHERE conversation_id=? ${cursor ? 'AND (sent_at<? OR (sent_at=? AND rowid<?))' : ''} ORDER BY sent_at DESC, rowid DESC LIMIT ?`,
      ...(cursor ? [conv.id, cursor.t, cursor.t, Number(cursor.id), limit + 1] : [conv.id, limit + 1]),
    );
    const page = rows.slice(0, limit);
    const lastRow = page[page.length - 1];
    return { items: await renderMessages(ctx, viewer, page), nextCursor: rows.length > limit && lastRow ? encodeCursor({ t: lastRow.sent_at, id: String(lastRow.seq) }) : null, serverTime: new Date().toISOString() };
  });

  r.add('POST', '/api/conversations/:id/messages', { tag: 'Messages', summary: 'Send text, a publication, an image/PDF or an event invite (idempotent with clientMessageId)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'message', viewer.id, LIMITS.message);
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    if (conv.archived_at) throw conflict('conversation_archived');
    const v = new V(await ctx.body());
    const type = v.oneOf('type', ['text', 'publication', 'asset', 'agenda_invite'] as const) ?? 'text';
    const body = v.str('body', { max: 4000, trim: false });
    const publicationId = v.id('publicationId');
    const mediaId = v.id('mediaId');
    const agendaEventId = v.id('agendaEventId');
    const clientMessageId = v.str('clientMessageId', { max: 80 });
    v.done();
    if (type === 'text' && !body?.trim()) throw unprocessable('body_required');
    if (type === 'publication') {
      if (!publicationId) throw unprocessable('publication_required');
      const item = await loadItem(ctx, publicationId, { includeDemo: true });
      if (!item || item.visibility === 'private') throw unprocessable('publication_not_shareable');
    }
    if (type === 'asset') {
      if (!mediaId) throw unprocessable('media_required');
      await requireOwnedMedia(ctx.sql, mediaId, viewer.id, ['image', 'document']);
    }
    if (type === 'agenda_invite') {
      if (!agendaEventId) throw unprocessable('event_required');
      if (!(await ctx.sql.exists('SELECT 1 FROM agenda_events WHERE id=? AND creator_id=?', agendaEventId, viewer.id))) throw unprocessable('event_not_found');
    }
    if (clientMessageId) {
      const prior = await ctx.sql.first<MessageRow>('SELECT * FROM messages WHERE conversation_id=? AND sender_id=? AND client_message_id=?', conv.id, viewer.id, clientMessageId);
      if (prior) return { message: (await renderMessages(ctx, viewer, [prior]))[0], replayed: true };
    }
    const id = newId();
    const now = sqlNowMs();
    const recipients = await ctx.sql.all<{ user_id: string }>('SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>? AND left_at IS NULL AND (muted_until IS NULL OR muted_until<?)', conv.id, viewer.id, now);
    await ctx.sql.batch([
      ctx.sql.stmt('INSERT INTO messages(id,conversation_id,sender_id,message_type,body,publication_id,media_id,agenda_event_id,sent_at,client_message_id) VALUES(?,?,?,?,?,?,?,?,?,?)',
        id, conv.id, viewer.id, type, body ?? null, publicationId ?? null, mediaId ?? null, agendaEventId ?? null, now, clientMessageId ?? null),
      ctx.sql.stmt('UPDATE conversations SET last_message_at=? WHERE id=?', now, conv.id),
      ctx.sql.stmt('UPDATE conversation_members SET last_read_at=?,archived_at=NULL WHERE conversation_id=? AND user_id=?', now, conv.id, viewer.id),
      // One unread notification per conversation per recipient, not one per message.
      ...recipients.map(rc => notifyStmt(ctx.sql, { userId: rc.user_id, type: 'message.received', category: 'messages', actorId: viewer.id, entityType: 'conversation', entityId: conv.id, params: { actor: viewer.displayName }, deepLink: `/chat/${conv.id}`, dedupeKey: `msg:${conv.id}:${rc.user_id}:unread` })),
    ]);
    const row = await ctx.sql.first<MessageRow>('SELECT * FROM messages WHERE id=?', id);
    return { message: (await renderMessages(ctx, viewer, [row!]))[0] };
  });

  r.add('POST', '/api/conversations/:id/read', { tag: 'Messages', summary: 'Mark the conversation read up to now', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    await ctx.sql.batch([
      ctx.sql.stmt('UPDATE conversation_members SET last_read_at=? WHERE conversation_id=? AND user_id=?', sqlNowMs(), conv.id, viewer.id),
      // Clearing the unread notification lets the next message notify again.
      ctx.sql.stmt('UPDATE notifications SET read_at=CURRENT_TIMESTAMP,dedupe_key=NULL WHERE user_id=? AND dedupe_key=?', viewer.id, `msg:${conv.id}:${viewer.id}:unread`),
    ]);
    return { read: true };
  });

  r.add('POST', '/api/conversations/:id/mute', { tag: 'Messages', summary: 'Mute until an instant (or unmute with null)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    const v = new V(await ctx.body());
    const until = v.instant('until', { nullable: true, required: true });
    v.done();
    await ctx.sql.run('UPDATE conversation_members SET muted_until=? WHERE conversation_id=? AND user_id=?', until ? toSqlTime(until) : null, conv.id, viewer.id);
    return { mutedUntil: until };
  });

  const archive = (on: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    await ctx.sql.run(`UPDATE conversation_members SET archived_at=${on ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE conversation_id=? AND user_id=?`, conv.id, viewer.id);
    return { archived: on };
  };
  r.add('POST', '/api/conversations/:id/archive', { tag: 'Messages', summary: 'Archive for me', auth: 'required' }, archive(true));
  r.add('POST', '/api/conversations/:id/unarchive', { tag: 'Messages', summary: 'Unarchive', auth: 'required' }, archive(false));

  r.add('POST', '/api/conversations/:id/leave', { tag: 'Messages', summary: 'Leave a group or Dream conversation', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const { conv } = await membership(ctx, ctx.param('id'), viewer);
    if (conv.type === 'direct') throw unprocessable('cannot_leave_direct', 'Archive or block instead.');
    await ctx.sql.run('UPDATE conversation_members SET left_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?', conv.id, viewer.id);
    return { left: true };
  });

  const ownMessage = async (ctx: Ctx, viewer: Viewer) => {
    const m = await ctx.sql.first<MessageRow>('SELECT * FROM messages WHERE id=?', ctx.param('id'));
    if (!m) throw notFound();
    await membership(ctx, m.conversation_id, viewer);
    return m;
  };
  r.add('PATCH', '/api/messages/:id', { tag: 'Messages', summary: 'Edit my text message within 24 hours', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ownMessage(ctx, viewer);
    if (m.sender_id !== viewer.id || m.message_type !== 'text' || m.deleted_at) throw forbidden('not_editable');
    if (Date.now() - Date.parse(iso(m.sent_at) || '') > 86400000) throw unprocessable('edit_window_closed');
    const v = new V(await ctx.body());
    const body = v.str('body', { required: true, max: 4000, trim: false });
    v.done();
    if (!body!.trim()) throw unprocessable('body_required');
    await ctx.sql.run('UPDATE messages SET body=?,edited_at=? WHERE id=?', body!, sqlNowMs(), m.id);
    return { message: (await renderMessages(ctx, viewer, [(await ctx.sql.first<MessageRow>('SELECT * FROM messages WHERE id=?', m.id))!]))[0] };
  });
  r.add('DELETE', '/api/messages/:id', { tag: 'Messages', summary: 'Delete my message (content removed for everyone)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ownMessage(ctx, viewer);
    if (m.sender_id !== viewer.id) throw forbidden('not_sender');
    await ctx.sql.run('UPDATE messages SET deleted_at=?,body=NULL WHERE id=? AND deleted_at IS NULL', sqlNowMs(), m.id);
    return { deleted: true };
  });
  r.add('POST', '/api/messages/:id/reactions', { tag: 'Messages', summary: 'React to a message', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ownMessage(ctx, viewer);
    const v = new V(await ctx.body());
    const reaction = v.str('reaction', { required: true, max: 16 });
    v.done();
    await ctx.sql.run('INSERT OR IGNORE INTO message_reactions(message_id,user_id,reaction) VALUES(?,?,?)', m.id, viewer.id, reaction!);
    return { reacted: true };
  });
  r.add('DELETE', '/api/messages/:id/reactions/:reaction', { tag: 'Messages', summary: 'Remove my reaction', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ownMessage(ctx, viewer);
    await ctx.sql.run('DELETE FROM message_reactions WHERE message_id=? AND user_id=? AND reaction=?', m.id, viewer.id, ctx.param('reaction'));
    return { reacted: false };
  });

  r.add('GET', '/api/updates', { tag: 'Messages', summary: 'Polling endpoint: unread totals and conversations changed since ?since=<iso>', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const sinceRaw = ctx.query('since');
    const since = sinceRaw ? toSqlTime(sinceRaw) : '1970-01-01 00:00:00';
    const unread = await ctx.sql.first<{ messages: number; notifications: number }>(
      `SELECT (SELECT count(*) FROM messages x JOIN conversation_members m ON m.conversation_id=x.conversation_id AND m.user_id=?1 AND m.left_at IS NULL
                WHERE x.deleted_at IS NULL AND (x.sender_id IS NULL OR x.sender_id<>?1) AND (m.last_read_at IS NULL OR x.sent_at>m.last_read_at)) AS messages,
              (SELECT count(*) FROM notifications WHERE user_id=?1 AND read_at IS NULL AND status='sent') AS notifications`,
      viewer.id,
    );
    const changed = await ctx.sql.all<{ id: string }>('SELECT c.id FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=? AND m.left_at IS NULL WHERE c.last_message_at>? ORDER BY c.last_message_at DESC LIMIT 50', viewer.id, since);
    return { unreadMessages: unread?.messages ?? 0, unreadNotifications: unread?.notifications ?? 0, changedConversations: changed.map(c => c.id), serverTime: new Date().toISOString(), realtime: 'polling' };
  });
}
