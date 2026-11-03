import type { Ctx, Viewer, Locale } from '../http/context';
import type { D1Value } from '../platform/cf';
import type { AuthorSummary, BibleCard, DreamCard, FeedItem, MusicCard, NeedSummary, TalentCard } from '../contracts/dto';
import type { Cursor } from '../http/cursor';
import type { MediaDTO } from '../modules/media';
import { AUTHOR_VISIBLE_SQL, NOT_BLOCKED_SQL } from './access';
import { mediaMap } from '../modules/media';
import { phaseLabel, toApiPhase, type DbPhase } from '../domain/phases';
import { levelLabel, seekingFrom } from '../domain/talents';
import { viewerActions } from '../domain/actions';
import { encodeCursor } from '../http/cursor';
import { iso, marks, parseJson, truthy, uniq } from '../lib/util';

export type ContentType = 'dream' | 'bible' | 'music' | 'talent';

export type FeedQuery = {
  viewer: Viewer | null;
  cursor: Cursor | null;
  limit: number;
  types?: ContentType[];
  phase?: DbPhase | null;
  search?: string | null;
  authorId?: string | null;
  /** Author reading their own profile: includes their private drafts, shown as locked. */
  ownerView?: boolean;
  includeDemo: boolean;
  /** Discovery shows a Dream only once it has a cover image. */
  requireDreamCover?: boolean;
  ids?: string[];
};

type PubRow = { id: string; type: 'dream' | 'bible' | 'music'; author_id: string; dream_id: string | null; title: string; cover_asset_id: string | null; visibility: 'private' | 'members' | 'public'; created_at: string; updated_at: string; moderation_hidden_at: string | null };
type TalentRow = { id: string; user_id: string; talent_id: string; visibility: 'private' | 'members' | 'public'; created_at: string; updated_at: string };

const likeEscape = (s: string) => '%' + s.replace(/[\\%_]/g, c => '\\' + c) + '%';

function cursorClause(alias: string, cursor: Cursor | null, args: D1Value[]): string | null {
  if (!cursor) return null;
  args.push(cursor.t, cursor.t, cursor.id);
  return `(${alias}.created_at < ? OR (${alias}.created_at = ? AND ${alias}.id < ?))`;
}

export async function queryPublications(ctx: Ctx, q: FeedQuery): Promise<PubRow[]> {
  const types = (q.types ?? ['dream', 'bible', 'music', 'talent']).filter(t => t !== 'talent');
  if (!types.length) return [];
  const where: string[] = ['p.deleted_at IS NULL', `p.type IN (${marks(types.length)})`];
  const args: D1Value[] = [...types];
  if (q.ownerView && q.authorId) {
    where.push('p.author_id=?');
    args.push(q.authorId);
    where.push("(p.type<>'dream' OR EXISTS(SELECT 1 FROM dreams d WHERE d.id=p.dream_id AND d.deleted_at IS NULL))");
  } else {
    where.push('p.moderation_hidden_at IS NULL', AUTHOR_VISIBLE_SQL('u'));
    where.push(q.viewer ? "p.visibility IN ('public','members')" : "p.visibility='public'");
    where.push(`(p.type<>'dream' OR EXISTS(SELECT 1 FROM dreams d WHERE d.id=p.dream_id AND d.deleted_at IS NULL AND d.moderation_hidden_at IS NULL${q.requireDreamCover ? ' AND d.cover_media_id IS NOT NULL' : ''}))`);
    where.push("(p.type<>'music' OR NOT EXISTS(SELECT 1 FROM music_tracks t WHERE t.publication_id=p.id AND t.withdrawn_at IS NOT NULL))");
    if (!q.includeDemo) where.push('u.is_demo=0');
    if (q.authorId) {
      where.push('p.author_id=?');
      args.push(q.authorId);
    }
    if (q.viewer) {
      where.push(NOT_BLOCKED_SQL('p.author_id'));
      args.push(q.viewer.id, q.viewer.id);
    }
  }
  if (q.phase) {
    where.push("p.type='dream' AND EXISTS(SELECT 1 FROM dreams d2 WHERE d2.id=p.dream_id AND d2.phase=?)");
    args.push(q.phase);
  }
  if (q.search) {
    where.push("(p.title LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')");
    args.push(likeEscape(q.search), likeEscape(q.search));
  }
  if (q.ids?.length) {
    where.push(`p.id IN (${marks(q.ids.length)})`);
    args.push(...q.ids);
  }
  const c = cursorClause('p', q.cursor, args);
  if (c) where.push(c);
  args.push(q.limit + 1);
  return ctx.sql.all<PubRow>(
    `SELECT p.id,p.type,p.author_id,p.dream_id,p.title,p.cover_asset_id,p.visibility,p.created_at,p.updated_at,p.moderation_hidden_at
     FROM publications p JOIN users u ON u.id=p.author_id WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    ...args,
  );
}

export async function queryTalentPosts(ctx: Ctx, q: FeedQuery): Promise<TalentRow[]> {
  if (q.types && !q.types.includes('talent')) return [];
  if (q.phase) return [];
  const where: string[] = ['tp.deleted_at IS NULL'];
  const args: D1Value[] = [];
  if (q.ownerView && q.authorId) {
    where.push('tp.user_id=?');
    args.push(q.authorId);
  } else {
    where.push('tp.moderation_hidden_at IS NULL', AUTHOR_VISIBLE_SQL('u'));
    where.push(q.viewer ? "tp.visibility IN ('public','members') AND ut.visibility IN ('public','members')" : "tp.visibility='public' AND ut.visibility='public'");
    if (!q.includeDemo) where.push('u.is_demo=0');
    if (q.authorId) {
      where.push('tp.user_id=?');
      args.push(q.authorId);
    }
    if (q.viewer) {
      where.push(NOT_BLOCKED_SQL('tp.user_id'));
      args.push(q.viewer.id, q.viewer.id);
    }
  }
  if (q.search) {
    where.push("(t.name LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')");
    args.push(likeEscape(q.search), likeEscape(q.search));
  }
  if (q.ids?.length) {
    where.push(`tp.id IN (${marks(q.ids.length)})`);
    args.push(...q.ids);
  }
  const c = cursorClause('tp', q.cursor, args);
  if (c) where.push(c);
  args.push(q.limit + 1);
  return ctx.sql.all<TalentRow>(
    `SELECT tp.id,tp.user_id,tp.talent_id,tp.visibility,tp.created_at,tp.updated_at
     FROM talent_posts tp JOIN user_talents ut ON ut.user_id=tp.user_id AND ut.talent_id=tp.talent_id
     JOIN talents t ON t.id=tp.talent_id JOIN users u ON u.id=tp.user_id
     WHERE ${where.join(' AND ')} ORDER BY tp.created_at DESC, tp.id DESC LIMIT ?`,
    ...args,
  );
}

/** Merge both sources newest-first with one shared keyset cursor. */
export async function feedPage(ctx: Ctx, q: FeedQuery): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const [pubs, talents] = await Promise.all([queryPublications(ctx, q), queryTalentPosts(ctx, q)]);
  type Entry = { kind: 'pub'; row: PubRow } | { kind: 'talent'; row: TalentRow };
  const merged: Entry[] = [
    ...pubs.map(row => ({ kind: 'pub' as const, row })),
    ...talents.map(row => ({ kind: 'talent' as const, row })),
  ].sort((a, b) => (a.row.created_at === b.row.created_at ? (a.row.id < b.row.id ? 1 : -1) : a.row.created_at < b.row.created_at ? 1 : -1));
  const page = merged.slice(0, q.limit);
  const more = merged.length > q.limit;
  const items = await hydrate(
    ctx,
    q.viewer,
    page.filter((e): e is { kind: 'pub'; row: PubRow } => e.kind === 'pub').map(e => e.row),
    page.filter((e): e is { kind: 'talent'; row: TalentRow } => e.kind === 'talent').map(e => e.row),
  );
  const order = new Map(page.map((e, i) => [e.row.id, i]));
  items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const last = page[page.length - 1];
  return { items, nextCursor: more && last ? encodeCursor({ t: last.row.created_at, id: last.row.id }) : null };
}

type UserRow = { id: string; handle: string; display_name: string; church_name: string | null; avatar_media_id: string | null; is_demo: number; show_church: number | null };

async function authors(ctx: Ctx, ids: string[]): Promise<Map<string, AuthorSummary>> {
  const out = new Map<string, AuthorSummary>();
  if (!ids.length) return out;
  const rows = await ctx.sql.all<UserRow>(
    `SELECT u.id,u.handle,u.display_name,u.church_name,u.avatar_media_id,u.is_demo,p.show_church
     FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id IN (${marks(ids.length)})`,
    ...ids,
  );
  const media = await mediaMap(ctx, rows.map(r => r.avatar_media_id));
  for (const r of rows) out.set(r.id, authorSummary(r, media));
  return out;
}

export function authorSummary(r: UserRow, media: Map<string, MediaDTO>): AuthorSummary {
  return {
    id: r.id,
    handle: r.handle,
    displayName: r.display_name,
    avatarUrl: r.avatar_media_id ? media.get(r.avatar_media_id)?.url ?? null : null,
    church: r.church_name && (truthy(r.show_church) || r.is_demo === 1) ? r.church_name : null,
    isDemo: r.is_demo === 1,
  };
}

export async function authorMap(ctx: Ctx, ids: string[]): Promise<Map<string, AuthorSummary>> {
  return authors(ctx, uniq(ids));
}

type DreamData = {
  id: string; title: string; summary: string; phase: DbPhase; visibility: string; category: string | null; cover_media_id: string | null;
  motivation: string | null; goal_date: string | null; paused: number; started_at: string | null; growing_at: string | null; completed_at: string | null;
  testimony_text: string | null; testimony_primary_asset_id: string | null; created_by: string;
};
type NeedRow = {
  id: string; dream_id: string; label: string; category: NeedSummary['category']; talent_id: string | null; talent_name: string | null; required_level: number | null;
  is_required: number; slots_total: number; slots_filled: number; illustration: string | null; description: string | null; amount_cents: number | null; currency: string | null; pending: number;
};

export async function needSummaries(ctx: Ctx, dreamIds: string[], ownerDreams: Set<string>, locale: Locale): Promise<Map<string, NeedSummary[]>> {
  const out = new Map<string, NeedSummary[]>();
  if (!dreamIds.length) return out;
  const rows = await ctx.sql.all<NeedRow>(
    `SELECT n.id,n.dream_id,n.label,n.category,n.talent_id,t.name AS talent_name,n.required_level,n.is_required,n.slots_total,n.slots_filled,
       coalesce(n.illustration,t.illustration) AS illustration,n.description,n.amount_cents,n.currency,
       (SELECT count(*) FROM dream_help_offers o WHERE o.need_id=n.id AND o.status='pending') AS pending
     FROM dream_needs n LEFT JOIN talents t ON t.id=n.talent_id WHERE n.dream_id IN (${marks(dreamIds.length)})
     ORDER BY n.sort_order, n.created_at, n.id`,
    ...dreamIds,
  );
  for (const r of rows) {
    const list = out.get(r.dream_id) ?? [];
    list.push({
      id: r.id, label: r.label, category: r.category, talent: r.talent_id ? { id: r.talent_id, name: r.talent_name || r.label } : null,
      requiredLevel: r.required_level, requiredLevelLabel: levelLabel(r.required_level, locale), isRequired: r.is_required === 1,
      slotsTotal: r.slots_total, slotsFilled: r.slots_filled, confirmed: r.slots_filled >= r.slots_total,
      illustration: r.illustration, description: r.description,
      amount: r.amount_cents ? { cents: r.amount_cents, currency: r.currency || 'EUR' } : null,
      ...(ownerDreams.has(r.dream_id) ? { pendingOffers: r.pending } : {}),
    });
    out.set(r.dream_id, list);
  }
  return out;
}

async function idSet(ctx: Ctx, sql: string, args: D1Value[]): Promise<Set<string>> {
  const rows = await ctx.sql.all<{ k: string }>(sql, ...args);
  return new Set(rows.map(r => r.k));
}

async function counter(ctx: Ctx, sql: string, args: D1Value[]): Promise<Map<string, number>> {
  const rows = await ctx.sql.all<{ k: string; n: number }>(sql, ...args);
  return new Map(rows.map(r => [r.k, r.n]));
}

/** Turn publication and talent rows into typed, viewer-aware feed items. */
export async function hydrate(ctx: Ctx, viewer: Viewer | null, pubs: PubRow[], talents: TalentRow[], opts: { detail?: boolean } = {}): Promise<FeedItem[]> {
  const locale = await ctx.locale();
  const authorById = await authors(ctx, uniq([...pubs.map(p => p.author_id), ...talents.map(t => t.user_id)]));
  const pubIds = pubs.map(p => p.id);
  const vid = viewer?.id ?? null;

  const fire = vid && pubIds.length ? await idSet(ctx, `SELECT publication_id AS k FROM fire_saves WHERE user_id=? AND publication_id IN (${marks(pubIds.length)})`, [vid, ...pubIds]) : new Set<string>();
  const prayerTargets = [...pubIds, ...talents.map(t => t.id)];
  const prayer = vid && prayerTargets.length ? await idSet(ctx, `SELECT target_id AS k FROM prayer_list WHERE user_id=? AND target_id IN (${marks(prayerTargets.length)})`, [vid, ...prayerTargets]) : new Set<string>();

  // Dreams
  const dreamPubs = pubs.filter(p => p.type === 'dream' && p.dream_id);
  const dreamIds = dreamPubs.map(p => p.dream_id!) as string[];
  const dreams = new Map<string, DreamData>();
  let owned = new Set<string>();
  let sameCount = new Map<string, number>(), fruitCount = new Map<string, number>(), encCount = new Map<string, number>();
  let mySame = new Set<string>(), myEnc = new Set<string>();
  const galleries = new Map<string, string[]>();
  const journal = new Map<string, { text: string; date: string | null }>();
  if (dreamIds.length) {
    const ph = marks(dreamIds.length);
    for (const d of await ctx.sql.all<DreamData>(`SELECT id,title,summary,phase,visibility,category,cover_media_id,motivation,goal_date,paused,started_at,growing_at,completed_at,testimony_text,testimony_primary_asset_id,created_by FROM dreams WHERE id IN (${ph})`, ...dreamIds))
      dreams.set(d.id, d);
    if (vid) {
      owned = await idSet(ctx, `SELECT dream_id AS k FROM dream_owners WHERE user_id=? AND status='accepted' AND dream_id IN (${ph})`, [vid, ...dreamIds]);
      mySame = await idSet(ctx, `SELECT dream_id AS k FROM dream_same_dream WHERE user_id=? AND dream_id IN (${ph})`, [vid, ...dreamIds]);
      myEnc = await idSet(ctx, `SELECT dream_id AS k FROM dream_encouragements WHERE user_id=? AND dream_id IN (${ph})`, [vid, ...dreamIds]);
    }
    sameCount = await counter(ctx, `SELECT dream_id AS k, count(*) AS n FROM dream_same_dream WHERE dream_id IN (${ph}) GROUP BY dream_id`, dreamIds);
    fruitCount = await counter(ctx, `SELECT l.originating_dream_id AS k, count(*) AS n FROM dream_lineage l JOIN dreams c ON c.id=l.inspired_dream_id AND c.deleted_at IS NULL WHERE l.originating_dream_id IN (${ph}) GROUP BY l.originating_dream_id`, dreamIds);
    const ownedIds = dreamIds.filter(id => owned.has(id));
    // Encouragement counts are computed only for Dreams this viewer co-owns. Never public.
    if (ownedIds.length) encCount = await counter(ctx, `SELECT dream_id AS k, count(*) AS n FROM dream_encouragements WHERE dream_id IN (${marks(ownedIds.length)}) GROUP BY dream_id`, ownedIds);
    for (const g of await ctx.sql.all<{ dream_id: string; media_id: string }>(`SELECT dream_id,media_id FROM dream_media WHERE role IN ('gallery','semence') AND dream_id IN (${ph}) ORDER BY sort_order, created_at`, ...dreamIds)) {
      const list = galleries.get(g.dream_id) ?? [];
      if (opts.detail || list.length < 6) list.push(g.media_id);
      galleries.set(g.dream_id, list);
    }
    for (const j of await ctx.sql.all<{ dream_id: string; body: string; entry_date: string | null; created_at: string }>(
      `SELECT e.dream_id,e.body,e.entry_date,e.created_at FROM dream_entries e WHERE e.entry_type='progress_comment' AND e.visibility='public' AND e.deleted_at IS NULL
       AND e.dream_id IN (${ph}) AND e.created_at=(SELECT max(created_at) FROM dream_entries x WHERE x.dream_id=e.dream_id AND x.entry_type='progress_comment' AND x.visibility='public' AND x.deleted_at IS NULL)`,
      ...dreamIds,
    ))
      journal.set(j.dream_id, { text: j.body, date: j.entry_date || iso(j.created_at) });
  }
  const needs = await needSummaries(ctx, dreamIds, owned, locale);

  // Bible
  const biblePubIds = pubs.filter(p => p.type === 'bible').map(p => p.id);
  const bible = new Map<string, { edition_code: string; edition_name: string; copyright_notice: string | null; book_code: string; book_name: string; chapter: number; start_verse: number; end_verse: number; caption: string | null; custom_image_asset_id: string | null; edition_id: string; book_id: string }>();
  const excerpts = new Map<string, string>();
  if (biblePubIds.length) {
    const rows = await ctx.sql.all<{ publication_id: string; edition_code: string; edition_name: string; copyright_notice: string | null; book_code: string; book_name: string; chapter: number; start_verse: number; end_verse: number; caption: string | null; custom_image_asset_id: string | null; edition_id: string; book_id: string }>(
      `SELECT bp.publication_id,e.code AS edition_code,e.name AS edition_name,e.copyright_notice,b.book_code,b.name AS book_name,bp.chapter,bp.start_verse,bp.end_verse,bp.caption,bp.custom_image_asset_id,bp.edition_id,bp.book_id
       FROM bible_posts bp JOIN bible_editions e ON e.id=bp.edition_id JOIN bible_books b ON b.id=bp.book_id WHERE bp.publication_id IN (${marks(biblePubIds.length)})`,
      ...biblePubIds,
    );
    for (const r of rows) {
      bible.set(r.publication_id, r);
      const verses = await ctx.sql.all<{ text: string }>('SELECT text FROM bible_verses WHERE edition_id=? AND book_id=? AND chapter=? AND verse BETWEEN ? AND ? ORDER BY verse', r.edition_id, r.book_id, r.chapter, r.start_verse, r.end_verse);
      excerpts.set(r.publication_id, verses.map(v => v.text).join(' '));
    }
  }

  // Music
  const musicPubIds = pubs.filter(p => p.type === 'music').map(p => p.id);
  type TrackRow = { id: string; publication_id: string; publisher_id: string; audio_asset_id: string | null; external_stream_url: string | null; cover_asset_id: string | null; original_track_id: string | null; duration_ms: number | null; description: string | null; song_author: string | null; license_type: string; attribution_text: string; adaptations_allowed: number; reviewed_status: string; original_creator_name: string; rights_holder_name: string; original_source_url: string | null };
  const tracks = new Map<string, TrackRow>();
  const credits = new Map<string, MusicCard['credits']>();
  if (musicPubIds.length) {
    for (const t of await ctx.sql.all<TrackRow>(
      `SELECT t.id,t.publication_id,t.publisher_id,t.audio_asset_id,t.external_stream_url,t.cover_asset_id,t.original_track_id,t.duration_ms,t.description,t.song_author,
         r.license_type,r.attribution_text,r.adaptations_allowed,r.reviewed_status,r.original_creator_name,r.rights_holder_name,r.original_source_url
       FROM music_tracks t JOIN music_rights r ON r.id=t.rights_id WHERE t.publication_id IN (${marks(musicPubIds.length)})`,
      ...musicPubIds,
    ))
      tracks.set(t.publication_id, t);
    const trackIds = Array.from(tracks.values()).map(t => t.id);
    if (trackIds.length)
      for (const c of await ctx.sql.all<{ track_id: string; credit_order: number; display_name: string; contribution: string; handle: string | null }>(
        `SELECT c.track_id,c.credit_order,c.display_name,c.contribution,u.handle FROM music_contributors c LEFT JOIN users u ON u.id=c.user_id WHERE c.track_id IN (${marks(trackIds.length)}) ORDER BY c.credit_order`,
        ...trackIds,
      )) {
        const list = credits.get(c.track_id) ?? [];
        list.push({ order: c.credit_order, displayName: c.display_name, contribution: c.contribution, handle: c.handle });
        credits.set(c.track_id, list);
      }
  }

  // Talents
  type TalentData = { post_id: string; user_id: string; talent_id: string; name: string; slug: string | null; category: string; level: number; can_teach: number; wants_to_learn: number; wants_tandem: number; available_for_projects: number; description: string | null; experience: string | null; illustration: string | null; t_illustration: string | null };
  const talentData = new Map<string, TalentData>();
  const talentSamples = new Map<string, string[]>();
  let talentEnc = new Map<string, number>(), myTalentEnc = new Set<string>();
  if (talents.length) {
    const ids = talents.map(t => t.id);
    for (const t of await ctx.sql.all<TalentData>(
      `SELECT tp.id AS post_id,ut.user_id,ut.talent_id,t.name,t.slug,t.category,ut.level,ut.can_teach,ut.wants_to_learn,ut.wants_tandem,ut.available_for_projects,
         ut.description,ut.experience,ut.illustration,t.illustration AS t_illustration
       FROM talent_posts tp JOIN user_talents ut ON ut.user_id=tp.user_id AND ut.talent_id=tp.talent_id JOIN talents t ON t.id=tp.talent_id WHERE tp.id IN (${marks(ids.length)})`,
      ...ids,
    ))
      talentData.set(t.post_id, t);
    for (const m of await ctx.sql.all<{ user_id: string; talent_id: string; media_id: string }>(
      `SELECT user_id,talent_id,media_id FROM user_talent_media WHERE (user_id||'|'||talent_id) IN (${marks(talents.length)}) ORDER BY sort_order`,
      ...talents.map(t => t.user_id + '|' + t.talent_id),
    )) {
      const key = m.user_id + '|' + m.talent_id;
      talentSamples.set(key, [...(talentSamples.get(key) ?? []), m.media_id]);
    }
    const mine = talents.filter(t => t.user_id === vid).map(t => t.id);
    if (mine.length) talentEnc = await counter(ctx, `SELECT talent_post_id AS k, count(*) AS n FROM talent_post_encouragements WHERE talent_post_id IN (${marks(mine.length)}) GROUP BY talent_post_id`, mine);
    if (vid) myTalentEnc = await idSet(ctx, `SELECT talent_post_id AS k FROM talent_post_encouragements WHERE user_id=? AND talent_post_id IN (${marks(ids.length)})`, [vid, ...ids]);
  }

  // Media for everything at once
  const mediaIds: (string | null)[] = [];
  for (const d of dreams.values()) mediaIds.push(d.cover_media_id, d.testimony_primary_asset_id, ...(galleries.get(d.id) ?? []));
  for (const p of pubs) mediaIds.push(p.cover_asset_id);
  for (const b of bible.values()) mediaIds.push(b.custom_image_asset_id);
  for (const t of tracks.values()) mediaIds.push(t.cover_asset_id, t.audio_asset_id);
  for (const list of talentSamples.values()) mediaIds.push(...list);
  const media = await mediaMap(ctx, mediaIds);
  const m = (id: string | null | undefined) => (id ? media.get(id) ?? null : null);

  const items: FeedItem[] = [];
  for (const p of pubs) {
    const author = authorById.get(p.author_id);
    if (!author) continue;
    const isOwnerAuthor = vid === p.author_id;
    const base = {
      id: p.id, author, createdAt: iso(p.created_at), updatedAt: iso(p.updated_at), visibility: p.visibility,
      locked: isOwnerAuthor && p.visibility !== 'public', isDemo: author.isDemo,
    };
    if (p.type === 'dream') {
      const d = dreams.get(p.dream_id!);
      if (!d) continue;
      const phase = toApiPhase(d.phase);
      const isOwner = owned.has(d.id);
      const dn = needs.get(d.id) ?? [];
      const required = dn.filter(n => n.isRequired);
      const card: DreamCard = {
        ...base, type: 'dream', dreamId: d.id, phase, phaseLabel: phaseLabel(phase, locale), title: d.title, summary: d.summary, category: d.category,
        locked: isOwner && d.visibility !== 'public',
        cover: m(d.cover_media_id) ?? m(p.cover_asset_id), gallery: (galleries.get(d.id) ?? []).map(id => m(id)).filter((x): x is MediaDTO => !!x),
        motivation: d.motivation, goalDate: d.goal_date, paused: d.paused === 1, startedAt: iso(d.started_at), growingAt: iso(d.growing_at), completedAt: iso(d.completed_at),
        needs: dn,
        needsProgress: { requiredFilled: required.filter(n => n.confirmed).length, requiredTotal: required.length, slotsFilled: dn.reduce((s, n) => s + n.slotsFilled, 0), slotsTotal: dn.reduce((s, n) => s + n.slotsTotal, 0) },
        journalPreview: phase === 'croissance' || phase === 'floraison' ? journal.get(d.id) ?? null : null,
        result: phase === 'floraison' ? { text: d.testimony_text || '', media: m(d.testimony_primary_asset_id), completedAt: iso(d.completed_at) } : null,
        counts: { sameDream: sameCount.get(d.id) ?? 0, inspiredDreams: fruitCount.get(d.id) ?? 0, ...(isOwner ? { encouragements: encCount.get(d.id) ?? 0 } : {}) },
        viewer: {
          isOwner, actions: viewerActions('dream', phase, { authenticated: !!viewer, isOwner }),
          fire: fire.has(p.id), prayer: prayer.has(p.id), sameDream: mySame.has(d.id), encouraged: myEnc.has(d.id),
        },
      };
      items.push(card);
    } else if (p.type === 'bible') {
      const b = bible.get(p.id);
      if (!b) continue;
      const label = `${b.book_name} ${b.chapter}:${b.start_verse}${b.end_verse > b.start_verse ? '-' + b.end_verse : ''}`;
      const card: BibleCard = {
        ...base, type: 'bible', title: p.title,
        reference: { label, edition: { code: b.edition_code, name: b.edition_name, attribution: b.copyright_notice }, book: { code: b.book_code, name: b.book_name }, chapter: b.chapter, startVerse: b.start_verse, endVerse: b.end_verse },
        excerpt: excerpts.get(p.id) || '', caption: b.caption, image: m(b.custom_image_asset_id) ?? m(p.cover_asset_id),
        viewer: { isOwner: isOwnerAuthor, actions: viewerActions('bible', null, { authenticated: !!viewer, isOwner: isOwnerAuthor }), fire: fire.has(p.id), prayer: prayer.has(p.id) },
      };
      items.push(card);
    } else if (p.type === 'music') {
      const t = tracks.get(p.id);
      if (!t) continue;
      const audio = m(t.audio_asset_id);
      const appAsset = audio?.url?.startsWith('app-asset:') ? audio.url.slice('app-asset:'.length) : null;
      const url = appAsset ? null : audio?.url ?? t.external_stream_url ?? null;
      const card: MusicCard = {
        ...base, type: 'music', trackId: t.id, title: p.title, description: t.description, songAuthor: t.song_author,
        cover: m(t.cover_asset_id) ?? m(p.cover_asset_id), durationMs: t.duration_ms ?? audio?.durationMs ?? null,
        playback: { available: !!(url || appAsset), url, appAsset, mimeType: audio?.mimeType ?? null },
        credits: credits.get(t.id) ?? [],
        rights: { licenseType: t.license_type, attribution: t.attribution_text, adaptationsAllowed: t.adaptations_allowed === 1, reviewStatus: t.reviewed_status, originalCreator: t.original_creator_name, rightsHolder: t.rights_holder_name, sourceUrl: t.original_source_url },
        originalTrackId: t.original_track_id, downloadable: false,
        viewer: { isOwner: isOwnerAuthor, actions: viewerActions('music', null, { authenticated: !!viewer, isOwner: isOwnerAuthor }), fire: fire.has(p.id), prayer: prayer.has(p.id) },
      };
      items.push(card);
    }
  }
  for (const t of talents) {
    const author = authorById.get(t.user_id);
    const d = talentData.get(t.id);
    if (!author || !d) continue;
    const isOwner = vid === t.user_id;
    const card: TalentCard = {
      id: t.id, author, createdAt: iso(t.created_at), updatedAt: iso(t.updated_at), visibility: t.visibility, locked: isOwner && t.visibility !== 'public', isDemo: author.isDemo,
      type: 'talent', talent: { id: d.talent_id, name: d.name, slug: d.slug, category: d.category }, level: d.level, levelLabel: levelLabel(d.level, locale),
      illustration: d.illustration || d.t_illustration, description: d.description, experience: d.experience, seeking: seekingFrom(d, locale),
      availableForProjects: d.available_for_projects === 1, canTeach: d.can_teach === 1, wantsToLearn: d.wants_to_learn === 1, wantsTandem: d.wants_tandem === 1,
      samples: (talentSamples.get(t.user_id + '|' + t.talent_id) ?? []).map(id => m(id)).filter((x): x is MediaDTO => !!x),
      counts: isOwner ? { encouragements: talentEnc.get(t.id) ?? 0 } : {},
      viewer: { isOwner, actions: viewerActions('talent', null, { authenticated: !!viewer, isOwner }), fire: false, prayer: prayer.has(t.id), encouraged: myTalentEnc.has(t.id) },
    };
    items.push(card);
  }
  return items;
}

/** Load one publication or talent showcase the viewer may see (same rules as Discovery). */
export async function loadItem(ctx: Ctx, id: string, opts: { includeDemo: boolean; allowOwnPrivate?: boolean } = { includeDemo: true }): Promise<FeedItem | null> {
  const viewer = await ctx.viewer();
  const base = { viewer, cursor: null, limit: 1, includeDemo: true, ids: [id] } as FeedQuery;
  let pubs = await queryPublications(ctx, base);
  let talents = pubs.length ? [] : await queryTalentPosts(ctx, base);
  if (!pubs.length && !talents.length && viewer && opts.allowOwnPrivate !== false) {
    // The author (or an accepted Dream owner) may open their own private item.
    pubs = await queryPublications(ctx, { ...base, ownerView: true, authorId: viewer.id });
    if (!pubs.length) {
      const own = await ctx.sql.first<{ author_id: string }>(
        "SELECT p.author_id FROM publications p JOIN dream_owners o ON o.dream_id=p.dream_id AND o.user_id=? AND o.status='accepted' WHERE p.id=? AND p.deleted_at IS NULL",
        viewer.id, id,
      );
      if (own) pubs = await queryPublications(ctx, { ...base, ownerView: true, authorId: own.author_id });
    }
    if (!pubs.length) talents = await queryTalentPosts(ctx, { ...base, ownerView: true, authorId: viewer.id });
  }
  const items = await hydrate(ctx, viewer, pubs, talents, { detail: true });
  return items[0] ?? null;
}

export { parseJson };
