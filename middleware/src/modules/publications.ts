import type { Router } from '../http/router';
import type { Ctx } from '../http/context';
import type { FeedItem } from '../contracts/dto';
import { includeDemo } from '../config/env';
import { V } from '../http/validate';
import { conflict, notFound, unprocessable } from '../http/errors';
import { decodeCursor, encodeCursor, pageLimit } from '../http/cursor';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId, todayIn, marks } from '../lib/util';
import { feedPage, loadItem, type ContentType } from '../services/feed';
import { createDream, dreamDetail, itemsByPublicationIds, parseCreate } from '../services/dreams';
import { notifyStmt } from '../services/notifications';
import { activeMemberByHandle, areContacts, inCircle } from '../services/access';
import { parsePhase, toDbPhase } from '../domain/phases';
import { json } from '../http/respond';

const TYPES: readonly ContentType[] = ['dream', 'bible', 'music', 'talent'];

/** Require a visible item and that the action is allowed for it (content- and phase-specific). */
async function actionable(ctx: Ctx, id: string, action: string): Promise<FeedItem> {
  const item = await loadItem(ctx, id, { includeDemo: true });
  if (!item) throw notFound();
  const allowed = item.viewer.actions as string[];
  if (!allowed.includes(action)) throw unprocessable('action_not_allowed', `“${action}” is not available for this ${item.type}${item.type === 'dream' ? ' in ' + item.phase : ''}.`);
  return item;
}

export function registerPublications(r: Router): void {
  r.add('GET', '/api/discovery', { tag: 'Discovery', summary: 'Mixed editorial feed (Dreams, Bible, Music, Talents), newest first, cursor-paginated', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const typeParam = ctx.query('type');
    const types = typeParam ? (typeParam.split(',').filter(t => (TYPES as readonly string[]).includes(t)) as ContentType[]) : undefined;
    if (typeParam && !types?.length) throw unprocessable('invalid_type');
    const phaseParam = ctx.query('phase');
    const phase = phaseParam ? parsePhase(phaseParam) : null;
    if (phaseParam && !phase) throw unprocessable('invalid_phase');
    const search = (ctx.query('q') || '').trim().slice(0, 80) || null;
    const page = await feedPage(ctx, {
      viewer, cursor: decodeCursor(ctx.query('cursor')), limit: pageLimit(ctx.query('limit'), 24, 50), types, phase: phase ? toDbPhase(phase) : null,
      search, includeDemo: includeDemo(ctx.env), requireDreamCover: true,
    });
    // Ranking policy: transparent reverse-chronological order; no engagement-based boosting.
    return { ...page, policy: 'chronological' };
  });

  r.add('GET', '/api/publications/:id', { tag: 'Discovery', summary: 'Typed publication or talent showcase detail (same object from Discovery and profiles)', auth: 'optional' }, async ctx => {
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    if (!item) throw notFound();
    if (item.type === 'dream') return { item, ...(await dreamDetail(ctx, item.dreamId)) };
    if (item.type === 'bible') {
      const chapter = await chapterContext(ctx, item.id);
      return { item, chapter };
    }
    if (item.type === 'music') {
      const extra = await ctx.sql.first<{ lyrics_json: string | null }>('SELECT lyrics_json FROM music_tracks WHERE id=?', item.trackId);
      return { item: { ...item, lyrics: extra?.lyrics_json ? JSON.parse(extra.lyrics_json) : [] } };
    }
    return { item };
  });

  // ------------------------------------------------------------------ Fire
  r.add('POST', '/api/publications/:id/fire', { tag: 'Fire', summary: 'Save to my Fire list (idempotent)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const item = await actionable(ctx, ctx.param('id'), 'fire');
    await ctx.sql.run('INSERT OR IGNORE INTO fire_saves(user_id,publication_id) VALUES(?,?)', viewer.id, item.id);
    return { fire: true };
  });
  r.add('DELETE', '/api/publications/:id/fire', { tag: 'Fire', summary: 'Remove from my Fire list', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await ctx.sql.batch([
      ctx.sql.stmt('DELETE FROM fire_saves WHERE user_id=? AND publication_id=?', viewer.id, ctx.param('id')),
      ctx.sql.stmt('DELETE FROM fire_folder_items WHERE publication_id=? AND folder_id IN (SELECT id FROM fire_folders WHERE user_id=?)', ctx.param('id'), viewer.id),
    ]);
    return { fire: false };
  });

  r.add('GET', '/api/me/fire', { tag: 'Fire', summary: 'My Fire list (only items still visible to me)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const cursor = decodeCursor(ctx.query('cursor'));
    const limit = pageLimit(ctx.query('limit'), 30, 50);
    const rows = await ctx.sql.all<{ publication_id: string; created_at: string }>(
      `SELECT publication_id,created_at FROM fire_saves WHERE user_id=? ${cursor ? 'AND (created_at<? OR (created_at=? AND publication_id<?))' : ''} ORDER BY created_at DESC, publication_id DESC LIMIT ?`,
      ...(cursor ? [viewer.id, cursor.t, cursor.t, cursor.id, limit + 1] : [viewer.id, limit + 1]),
    );
    const page = rows.slice(0, limit);
    const items = await itemsByPublicationIds(ctx, page.map(x => x.publication_id));
    const last = page[page.length - 1];
    return { items, nextCursor: rows.length > limit && last ? encodeCursor({ t: last.created_at, id: last.publication_id }) : null };
  });

  r.add('GET', '/api/me/fire/folders', { tag: 'Fire', summary: 'My Fire folders', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const folders = await ctx.sql.all<{ id: string; name: string; created_at: string }>('SELECT id,name,created_at FROM fire_folders WHERE user_id=? ORDER BY created_at', viewer.id);
    const items = folders.length ? await ctx.sql.all<{ folder_id: string; publication_id: string }>(`SELECT folder_id,publication_id FROM fire_folder_items WHERE folder_id IN (${marks(folders.length)}) ORDER BY added_at`, ...folders.map(f => f.id)) : [];
    return { items: folders.map(f => ({ id: f.id, name: f.name, publicationIds: items.filter(i => i.folder_id === f.id).map(i => i.publication_id), createdAt: iso(f.created_at) })) };
  });
  r.add('POST', '/api/me/fire/folders', { tag: 'Fire', summary: 'Create a Fire folder', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const name = v.str('name', { required: true, max: 60 });
    v.done();
    const count = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM fire_folders WHERE user_id=?', viewer.id);
    if ((count?.n ?? 0) >= 50) throw conflict('too_many_folders');
    const id = newId();
    await ctx.sql.run('INSERT INTO fire_folders(id,user_id,name) VALUES(?,?,?)', id, viewer.id, name!);
    return { id, name, publicationIds: [] };
  });
  const folderOf = async (ctx: Ctx, userId: string) => {
    const f = await ctx.sql.first<{ id: string }>('SELECT id FROM fire_folders WHERE id=? AND user_id=?', ctx.param('id'), userId);
    if (!f) throw notFound();
    return f;
  };
  r.add('PATCH', '/api/me/fire/folders/:id', { tag: 'Fire', summary: 'Rename a Fire folder', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const f = await folderOf(ctx, viewer.id);
    const v = new V(await ctx.body());
    const name = v.str('name', { required: true, max: 60 });
    v.done();
    await ctx.sql.run('UPDATE fire_folders SET name=? WHERE id=?', name!, f.id);
    return { id: f.id, name };
  });
  r.add('DELETE', '/api/me/fire/folders/:id', { tag: 'Fire', summary: 'Delete a Fire folder (saves stay in Fire)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const f = await folderOf(ctx, viewer.id);
    await ctx.sql.run('DELETE FROM fire_folders WHERE id=?', f.id);
    return { deleted: true };
  });
  r.add('POST', '/api/me/fire/folders/:id/items/:publicationId', { tag: 'Fire', summary: 'Put a Fire item in a folder', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const f = await folderOf(ctx, viewer.id);
    const pubId = ctx.param('publicationId');
    if (!(await ctx.sql.exists('SELECT 1 FROM fire_saves WHERE user_id=? AND publication_id=?', viewer.id, pubId))) throw unprocessable('not_in_fire');
    await ctx.sql.run('INSERT OR IGNORE INTO fire_folder_items(folder_id,publication_id) VALUES(?,?)', f.id, pubId);
    return { added: true };
  });
  r.add('DELETE', '/api/me/fire/folders/:id/items/:publicationId', { tag: 'Fire', summary: 'Take an item out of a folder', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const f = await folderOf(ctx, viewer.id);
    await ctx.sql.run('DELETE FROM fire_folder_items WHERE folder_id=? AND publication_id=?', f.id, ctx.param('publicationId'));
    return { removed: true };
  });

  // ------------------------------------------------------------------ Prayer (distinct from Fire)
  const prayerOn = (targetType: 'publication' | 'talent_post') => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const item = await actionable(ctx, ctx.param('id'), 'prayer');
    if ((item.type === 'talent') !== (targetType === 'talent_post')) throw notFound();
    const v = new V(await ctx.optionalBody());
    const repeat = v.oneOf('repeat', ['once', 'daily', 'weekly'] as const) ?? 'daily';
    const startDate = v.date('startDate') ?? todayIn(viewer.timezone);
    v.done();
    await ctx.sql.run(
      `INSERT INTO prayer_list(user_id,target_type,target_id,repeat_mode,start_date) VALUES(?,?,?,?,?)
       ON CONFLICT(user_id,target_type,target_id) DO UPDATE SET repeat_mode=excluded.repeat_mode,start_date=excluded.start_date`,
      viewer.id, targetType, item.id, repeat, startDate,
    );
    return { prayer: true, repeat, startDate };
  };
  const prayerOff = (targetType: 'publication' | 'talent_post') => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    await ctx.sql.run('DELETE FROM prayer_list WHERE user_id=? AND target_type=? AND target_id=?', viewer.id, targetType, ctx.param('id'));
    return { prayer: false };
  };
  r.add('POST', '/api/publications/:id/prayer', { tag: 'Prayer', summary: 'Add to my prayers (repeat once/daily/weekly; no fabricated dates)', auth: 'required' }, prayerOn('publication'));
  r.add('DELETE', '/api/publications/:id/prayer', { tag: 'Prayer', summary: 'Remove from my prayers', auth: 'required' }, prayerOff('publication'));
  r.add('POST', '/api/talent-posts/:id/prayer', { tag: 'Prayer', summary: 'Pray for a talent showcase', auth: 'required' }, prayerOn('talent_post'));
  r.add('DELETE', '/api/talent-posts/:id/prayer', { tag: 'Prayer', summary: 'Remove a talent showcase from my prayers', auth: 'required' }, prayerOff('talent_post'));

  r.add('GET', '/api/me/prayers', { tag: 'Prayer', summary: 'My prayers; with ?date=YYYY-MM-DD only those due that day (repeat rules applied)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const date = ctx.query('date');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw unprocessable('invalid_date');
    const rows = await ctx.sql.all<{ target_type: string; target_id: string; repeat_mode: string; start_date: string | null; created_at: string }>(
      'SELECT target_type,target_id,repeat_mode,start_date,created_at FROM prayer_list WHERE user_id=? ORDER BY created_at DESC LIMIT 300',
      viewer.id,
    );
    const due = (row: (typeof rows)[number]) => {
      if (!date) return true;
      const start = row.start_date || row.created_at.slice(0, 10);
      const days = Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000);
      return days >= 0 && (row.repeat_mode === 'daily' || (row.repeat_mode === 'weekly' && days % 7 === 0) || (row.repeat_mode === 'once' && days === 0));
    };
    const selected = rows.filter(due);
    const pubItems = await itemsByPublicationIds(ctx, selected.filter(x => x.target_type === 'publication').map(x => x.target_id));
    const talentIds = selected.filter(x => x.target_type === 'talent_post').map(x => x.target_id);
    const talentItems = [] as FeedItem[];
    for (const id of talentIds) {
      const it = await loadItem(ctx, id, { includeDemo: true });
      if (it) talentItems.push(it);
    }
    const byId = new Map([...pubItems, ...talentItems].map(i => [i.id, i]));
    return {
      date: date ?? null,
      items: selected.filter(x => byId.has(x.target_id)).map(x => ({ repeat: x.repeat_mode, startDate: x.start_date, item: byId.get(x.target_id) })),
    };
  });

  r.add('POST', '/api/me/prayer-reminders', { tag: 'Prayer', summary: 'Schedule an explicit dated prayer reminder (opt-in notification)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const publicationId = v.id('publicationId', { required: true });
    const scheduledFor = v.instant('scheduledFor', { required: true });
    v.done();
    if (Date.parse(scheduledFor!) < Date.now() - 60000) throw unprocessable('in_the_past');
    const item = await actionable(ctx, publicationId!, 'prayer');
    const prefs = await ctx.sql.first<{ prayer_reminders_enabled: number }>('SELECT prayer_reminders_enabled FROM user_preferences WHERE user_id=?', viewer.id);
    await ctx.sql.run(
      "INSERT OR IGNORE INTO prayer_saves(user_id,publication_id,scheduled_for,reminder_status) VALUES(?,?,?,?)",
      viewer.id, item.id, scheduledFor!, prefs?.prayer_reminders_enabled ? 'scheduled' : 'none',
    );
    return { publicationId: item.id, scheduledFor, reminderStatus: prefs?.prayer_reminders_enabled ? 'scheduled' : 'none', note: prefs?.prayer_reminders_enabled ? undefined : 'Prayer reminders are off in your preferences; the date is saved without a notification.' };
  });
  r.add('GET', '/api/me/prayer-reminders', { tag: 'Prayer', summary: 'My dated prayer reminders', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ publication_id: string; scheduled_for: string; reminder_status: string }>("SELECT publication_id,scheduled_for,reminder_status FROM prayer_saves WHERE user_id=? AND reminder_status<>'cancelled' ORDER BY scheduled_for", viewer.id);
    return { items: rows.map(x => ({ publicationId: x.publication_id, scheduledFor: x.scheduled_for, status: x.reminder_status })) };
  });
  r.add('DELETE', '/api/me/prayer-reminders', { tag: 'Prayer', summary: 'Cancel a dated prayer reminder', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const publicationId = v.id('publicationId', { required: true });
    const scheduledFor = v.instant('scheduledFor', { required: true });
    v.done();
    await ctx.sql.run("UPDATE prayer_saves SET reminder_status='cancelled' WHERE user_id=? AND publication_id=? AND scheduled_for=?", viewer.id, publicationId!, scheduledFor!);
    return { cancelled: true };
  });

  // ------------------------------------------------------------------ Share & inspire
  r.add('POST', '/api/publications/:id/shares', { tag: 'Discovery', summary: 'Record a share; internal shares to a contact or Circle member post it in your direct thread', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const v = new V(await ctx.body());
    const channel = v.oneOf('channel', ['internal', 'external'] as const, { required: true });
    const toHandle = v.str('toHandle', { max: 40 });
    v.done();
    const item = await actionable(ctx, ctx.param('id'), channel === 'internal' ? 'share-internal' : 'share-external');
    if (item.type === 'talent') throw unprocessable('action_not_allowed');
    if (item.visibility === 'private') throw unprocessable('private_content_cannot_be_shared');
    let recipientId: string | null = null;
    let conversationId: string | null = null;
    if (channel === 'internal' && toHandle) {
      const recipient = await activeMemberByHandle(ctx.sql, toHandle, viewer);
      if (!(await areContacts(ctx.sql, viewer.id, recipient.id)) && !(await inCircle(ctx.sql, viewer.id, recipient.id))) throw unprocessable('contact_required', 'Direct shares go to your contacts or Circle.');
      recipientId = recipient.id;
      const key = [viewer.id, recipient.id].sort().join(':');
      conversationId = 'direct_' + key.replace(/[^A-Za-z0-9:_-]/g, '');
      await ctx.sql.batch([
        ctx.sql.stmt("INSERT OR IGNORE INTO conversations(id,type,created_by,direct_key,last_message_at) VALUES(?,'direct',?,?,CURRENT_TIMESTAMP)", conversationId, viewer.id, key),
        ctx.sql.stmt("INSERT OR IGNORE INTO conversation_members(conversation_id,user_id) VALUES(?,?)", conversationId, viewer.id),
        ctx.sql.stmt("INSERT OR IGNORE INTO conversation_members(conversation_id,user_id) VALUES(?,?)", conversationId, recipient.id),
        ctx.sql.stmt("INSERT INTO messages(id,conversation_id,sender_id,message_type,publication_id) VALUES(?,?,?,'publication',?)", newId(), conversationId, viewer.id, item.id),
        ctx.sql.stmt('UPDATE conversations SET last_message_at=CURRENT_TIMESTAMP WHERE id=?', conversationId),
        notifyStmt(ctx.sql, { userId: recipient.id, type: 'message.received', category: 'messages', actorId: viewer.id, entityType: 'conversation', entityId: conversationId, params: { actor: viewer.displayName }, deepLink: `/chat/${conversationId}` }),
      ]);
    }
    await ctx.sql.run('INSERT INTO publication_shares(id,publication_id,shared_by,channel,shared_to_user_id) VALUES(?,?,?,?,?)', newId(), item.id, viewer.id, channel!, recipientId);
    return { shared: true, channel, conversationId };
  });

  r.add('POST', '/api/publications/:id/inspired-dreams', { tag: 'Inspiration', summary: 'Start my own Dream inspired by a Bible verse, a song or a Floraison', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const item = await actionable(ctx, ctx.param('id'), 'inspire');
    const input = parseCreate({ ...(await ctx.body()), needs: undefined });
    const lineage = item.type === 'dream' && item.phase === 'floraison' ? item.dreamId : null;
    const id = await createDream(ctx, viewer, { ...input, inspiredByPublicationId: item.id, lineageFromDreamId: lineage });
    return json(await dreamDetail(ctx, id), 201, { Location: `/api/dreams/${id}` });
  });
}

/** Whole chapter around a Bible post: preceding, selected and following verses. */
export async function chapterContext(ctx: Ctx, publicationId: string) {
  const post = await ctx.sql.first<{ edition_id: string; book_id: string; chapter: number; start_verse: number; end_verse: number }>('SELECT edition_id,book_id,chapter,start_verse,end_verse FROM bible_posts WHERE publication_id=?', publicationId);
  if (!post) return null;
  const verses = await ctx.sql.all<{ verse: number; text: string }>('SELECT verse,text FROM bible_verses WHERE edition_id=? AND book_id=? AND chapter=? ORDER BY verse', post.edition_id, post.book_id, post.chapter);
  return {
    chapter: post.chapter,
    selected: { start: post.start_verse, end: post.end_verse },
    verses: verses.map(v => ({ number: v.verse, text: v.text, position: v.verse < post.start_verse ? 'before' : v.verse > post.end_verse ? 'after' : 'selected' })),
  };
}
