import type { Ctx, Viewer } from '../http/context';
import type { D1PreparedStatement } from '../platform/cf';
import type { DreamCard, FeedItem } from '../contracts/dto';
import { V, isCalendarDate, type Obj } from '../http/validate';
import { conflict, forbidden, notFound, unprocessable } from '../http/errors';
import { mapSqlError } from '../http/errors';
import { iso, newId, sqlNow, sqlNowMs } from '../lib/util';
import { auditStmt, loadVisibleDream, requireDreamOwner, type DreamRole, type DreamRow } from './access';
import { notifyStmt } from './notifications';
import { hydrate, authorMap, queryPublications } from './feed';
import { requireOwnedMedia, mediaMap } from '../modules/media';
import { EDITABLE_FIELDS, nextPhase, parsePhase, phaseLabel, toApiPhase, toDbPhase, type Phase } from '../domain/phases';
import { parseLevel } from '../domain/talents';

export const TITLE_RULES = { required: true, min: 3, max: 120 } as const;
export const dreamConversationId = (dreamId: string) => 'dconv_' + dreamId;

export type NeedInput = {
  label: string; category: 'person' | 'practical' | 'financial' | 'logistics'; talentId: string | null; requiredLevel: number | null;
  slotsTotal: number; isRequired: boolean; description: string | null; amountCents: number | null; currency: string | null; illustration: string | null; sortOrder: number;
};

export function parseNeed(raw: unknown, partial = false): { value?: Partial<NeedInput>; errors?: V } {
  const v = new V((raw && typeof raw === 'object' ? raw : {}) as Obj);
  const label = v.str('label', { required: !partial, min: 1, max: 80 });
  const category = v.oneOf('category', ['person', 'practical', 'financial', 'logistics'] as const);
  const talentId = v.id('talentId', { nullable: true });
  const rawLevel = (raw as Obj | null)?.requiredLevel;
  const requiredLevel = rawLevel === undefined ? undefined : rawLevel === null ? null : parseLevel(rawLevel);
  if (rawLevel !== undefined && rawLevel !== null && requiredLevel === null) v.addError('requiredLevel', 'invalid_level', 'expected 1..5');
  const slotsTotal = v.int('slotsTotal', { min: 1, max: 50 });
  const isRequired = v.bool('isRequired');
  const description = v.str('description', { max: 1000, nullable: true });
  const amountCents = v.int('amountCents', { min: 1, max: 100_000_000, nullable: true });
  const currency = v.str('currency', { pattern: /^[A-Z]{3}$/, nullable: true });
  const illustration = v.str('illustration', { max: 40, nullable: true });
  const sortOrder = v.int('sortOrder', { min: 0, max: 1000 });
  const value: Partial<NeedInput> = {};
  if (label !== undefined) value.label = label!;
  if (category !== undefined) value.category = category!;
  if (talentId !== undefined) value.talentId = talentId;
  if (requiredLevel !== undefined) value.requiredLevel = requiredLevel;
  if (slotsTotal !== undefined) value.slotsTotal = slotsTotal!;
  if (isRequired !== undefined) value.isRequired = isRequired;
  if (description !== undefined) value.description = description;
  if (amountCents !== undefined) value.amountCents = amountCents;
  if (currency !== undefined) value.currency = currency;
  if (illustration !== undefined) value.illustration = illustration;
  if (sortOrder !== undefined) value.sortOrder = sortOrder!;
  return { value, errors: v };
}

export function needInsert(ctx: Ctx, dreamId: string, n: Partial<NeedInput>, id = newId()): D1PreparedStatement {
  return ctx.sql.stmt(
    `INSERT INTO dream_needs(id,dream_id,talent_id,label,slots_total,note,category,required_level,description,is_required,amount_cents,currency,illustration,sort_order,updated_at)
     VALUES(?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
    id, dreamId, n.talentId ?? null, n.label!, n.slotsTotal ?? 1, n.category ?? 'person', n.requiredLevel ?? null, n.description ?? null,
    n.isRequired === false ? 0 : 1, n.amountCents ?? null, n.amountCents ? n.currency ?? 'EUR' : null, n.illustration ?? null, n.sortOrder ?? 0,
  );
}

export type CreateDreamInput = {
  title: string; summary: string; coverMediaId?: string | null; category?: string | null; motivation?: string | null;
  visibility?: 'private' | 'members' | 'public'; needs?: Partial<NeedInput>[]; inspiredByPublicationId?: string | null; lineageFromDreamId?: string | null;
};

/** Creates a Semence Dream, its owner row and its publication read model in one transaction. */
export async function createDream(ctx: Ctx, viewer: Viewer, input: CreateDreamInput): Promise<string> {
  if (input.coverMediaId) await requireOwnedMedia(ctx.sql, input.coverMediaId, viewer.id, ['image']);
  const id = newId();
  const visibility = input.visibility ?? 'private';
  const statements: D1PreparedStatement[] = [
    ctx.sql.stmt(
      'INSERT INTO dreams(id,title,summary,phase,visibility,created_by,cover_media_id,category,motivation) VALUES(?,?,?,?,?,?,?,?,?)',
      id, input.title, input.summary, 'dream', visibility, viewer.id, input.coverMediaId ?? null, input.category ?? null, input.motivation ?? null,
    ),
    ctx.sql.stmt("INSERT INTO dream_owners(dream_id,user_id,invited_by,status,accepted_at) VALUES(?,?,NULL,'accepted',CURRENT_TIMESTAMP)", id, viewer.id),
    ctx.sql.stmt("INSERT INTO publications(id,type,author_id,dream_id,title,cover_asset_id,visibility) VALUES(?,'dream',?,?,?,?,?)", newId(), viewer.id, id, input.title, input.coverMediaId ?? null, visibility),
    ctx.sql.stmt("INSERT INTO dream_phase_history(id,dream_id,from_phase,to_phase,changed_by,reason) VALUES(?,?,NULL,'dream',?,'created')", newId(), id, viewer.id),
    auditStmt(ctx.sql, viewer.id, 'dream_created', 'dream', id, ctx.requestId),
  ];
  (input.needs ?? []).forEach((n, i) => statements.push(needInsert(ctx, id, { ...n, sortOrder: n.sortOrder ?? i })));
  if (input.inspiredByPublicationId)
    statements.push(ctx.sql.stmt('INSERT OR IGNORE INTO dream_inspirations(dream_id,publication_id,added_by) VALUES(?,?,?)', id, input.inspiredByPublicationId, viewer.id));
  if (input.lineageFromDreamId)
    statements.push(ctx.sql.stmt('INSERT OR IGNORE INTO dream_lineage(originating_dream_id,inspired_dream_id) VALUES(?,?)', input.lineageFromDreamId, id));
  try {
    await ctx.sql.batch(statements);
  } catch (e) {
    if (String(e).includes('dream_needs.dream_id, dream_needs.label') || String(e).includes('UNIQUE constraint failed: dream_needs')) throw conflict('need_label_exists');
    mapSqlError(e);
  }
  return id;
}

export function parseCreate(body: Obj): CreateDreamInput {
  const v = new V(body);
  const title = v.str('title', TITLE_RULES);
  const summary = v.str('summary', { max: 1000 }) ?? '';
  const coverMediaId = v.id('coverMediaId', { nullable: true });
  const category = v.str('category', { max: 60, nullable: true });
  const motivation = v.str('motivation', { max: 2000, nullable: true });
  const visibility = v.oneOf('visibility', ['private', 'members', 'public'] as const);
  const needs = v.array('needs', item => {
    const { value, errors } = parseNeed(item);
    try { errors!.done(); } catch { return undefined; }
    return value;
  }, { max: 30 });
  v.done();
  return { title: title!, summary, coverMediaId, category, motivation, visibility: visibility ?? undefined, needs };
}

/** Edit allowed fields for the current phase. Title and phase are never editable here. */
export async function patchDream(ctx: Ctx, viewer: Viewer, dreamId: string, body: Obj): Promise<void> {
  const { dream } = await requireDreamOwner(ctx.sql, dreamId, viewer);
  if ('title' in body) throw unprocessable('title_immutable', 'A Dream title cannot change after creation.');
  if ('phase' in body) throw unprocessable('use_transition_endpoint', 'Use POST /api/dreams/:id/transitions.');
  const phase = toApiPhase(dream.phase);
  const v = new V(body);
  const summary = v.str('summary', { max: 1000 });
  const coverMediaId = v.id('coverMediaId', { nullable: true });
  const motivation = v.str('motivation', { max: 2000, nullable: true });
  const goalDate = v.date('goalDate', { nullable: true });
  const paused = v.bool('paused');
  const category = v.str('category', { max: 60, nullable: true });
  const visibility = v.oneOf('visibility', ['private', 'members', 'public'] as const);
  const expected = v.int('expectedVersion', { min: 1 }) ?? (ctx.request.headers.get('if-match') ? Number(ctx.request.headers.get('if-match')) : undefined);
  v.done();
  const changes: [string, string, string | number | null][] = [];
  if (summary !== undefined) changes.push(['summary', 'summary', summary ?? '']);
  if (coverMediaId !== undefined) changes.push(['cover', 'cover_media_id', coverMediaId]);
  if (motivation !== undefined) changes.push(['motivation', 'motivation', motivation]);
  if (goalDate !== undefined) changes.push(['goalDate', 'goal_date', goalDate]);
  if (paused !== undefined) changes.push(['paused', 'paused', paused ? 1 : 0]);
  if (category !== undefined) changes.push(['category', 'category', category]);
  if (visibility !== undefined) changes.push(['visibility', 'visibility', visibility]);
  if (!changes.length) return;
  const locked = changes.filter(([field]) => !EDITABLE_FIELDS[phase].includes(field)).map(([field]) => field);
  if (locked.length)
    throw unprocessable('field_locked_for_phase', `Not editable in ${phase}: ${locked.join(', ')}`, locked.map(f => ({ field: f, code: 'locked' })));
  if (coverMediaId) await requireOwnedMedia(ctx.sql, coverMediaId, viewer.id, ['image']);
  const sets = changes.map(([, col]) => col + '=?').join(',');
  const args = changes.map(([, , val]) => val);
  const versionClause = Number.isInteger(expected) ? ' AND version=?' : '';
  const statements = [
    ctx.sql.stmt(`UPDATE dreams SET ${sets},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?${versionClause}`, ...args, dreamId, ...(versionClause ? [expected as number] : [])),
  ];
  if (coverMediaId !== undefined) statements.push(ctx.sql.stmt("UPDATE publications SET cover_asset_id=?,updated_at=CURRENT_TIMESTAMP WHERE dream_id=? AND type='dream'", coverMediaId, dreamId));
  try {
    const before = dream.version;
    await ctx.sql.batch(statements);
    if (versionClause) {
      const after = await ctx.sql.first<{ version: number }>('SELECT version FROM dreams WHERE id=?', dreamId);
      if (after?.version === before) throw conflict('version_conflict', 'The Dream changed since you loaded it.');
    }
  } catch (e) {
    mapSqlError(e);
  }
}

export type Readiness = { ready: boolean; missing: { code: string; needId?: string; label?: string; slotsFilled?: number; slotsTotal?: number }[] };

/** What still blocks the next phase. The same rules are re-checked inside the atomic UPDATE. */
export async function readiness(ctx: Ctx, dream: DreamRow): Promise<Readiness> {
  const phase = toApiPhase(dream.phase);
  const missing: Readiness['missing'] = [];
  if (phase === 'semence') {
    if (!dream.cover_media_id) missing.push({ code: 'cover_required' });
  } else if (phase === 'germination') {
    if (!dream.goal_date || !isCalendarDate(dream.goal_date)) missing.push({ code: 'goal_date_required' });
    const open = await ctx.sql.all<{ id: string; label: string; slots_filled: number; slots_total: number }>(
      'SELECT id,label,slots_filled,slots_total FROM dream_needs WHERE dream_id=? AND is_required=1 AND slots_filled<slots_total ORDER BY sort_order,created_at',
      dream.id,
    );
    for (const n of open) missing.push({ code: 'need_not_confirmed', needId: n.id, label: n.label, slotsFilled: n.slots_filled, slotsTotal: n.slots_total });
  } else if (phase === 'croissance') {
    missing.push({ code: 'result_required' });
  } else {
    missing.push({ code: 'final_phase' });
  }
  return { ready: missing.length === 0 || (phase === 'croissance' && missing.every(m => m.code === 'result_required')), missing };
}

/**
 * Forward-only phase transition. Idempotent: repeating it when the Dream is already in the
 * target phase changes nothing. All writes for a transition are one D1 batch, and every
 * side effect is guarded by "the Dream is now in the target phase", so a lost race cannot
 * create a conversation, history row or notification for a transition that did not happen.
 */
export async function transitionDream(ctx: Ctx, viewer: Viewer, dreamId: string, body: Obj): Promise<{ changed: boolean; phase: Phase }> {
  const target = parsePhase(body.to);
  if (!target) throw unprocessable('validation_failed', 'to must be semence, germination, croissance or floraison', [{ field: 'to', code: 'invalid_value' }]);
  const { dream } = await requireDreamOwner(ctx.sql, dreamId, viewer);
  const current = toApiPhase(dream.phase);
  if (current === target) return { changed: false, phase: current };
  if (nextPhase(current) !== target) throw unprocessable('invalid_phase_transition', `Dreams move forward one phase at a time (${current} → ${nextPhase(current) ?? 'none'}).`);
  const toDb = toDbPhase(target);
  const fromDb = dream.phase;
  const now = sqlNow();
  const inTarget = 'EXISTS(SELECT 1 FROM dreams WHERE id=? AND phase=?)';
  const statements: D1PreparedStatement[] = [];

  if (target === 'germination') {
    const ready = await readiness(ctx, dream);
    if (!ready.ready) throw unprocessable('transition_not_ready', 'Add a cover image before the Dream becomes public.', ready.missing.map(m => ({ code: m.code })));
    const visibility = body.visibility === 'members' ? 'members' : 'public';
    statements.push(ctx.sql.stmt(
      "UPDATE dreams SET phase='initiation',started_at=?,visibility=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND phase='dream' AND cover_media_id IS NOT NULL",
      now, visibility, dreamId,
    ));
  } else if (target === 'croissance') {
    const ready = await readiness(ctx, dream);
    if (!ready.ready) throw unprocessable('transition_not_ready', 'A target date and every required resource must be confirmed.', ready.missing.map(m => ({ code: m.code, field: m.needId, message: m.label })));
    statements.push(ctx.sql.stmt(
      `UPDATE dreams SET phase='growth',growing_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND phase='initiation' AND goal_date IS NOT NULL
         AND NOT EXISTS(SELECT 1 FROM dream_needs WHERE dream_id=? AND is_required=1 AND slots_filled<slots_total)`,
      now, dreamId, dreamId,
    ));
    // The Dream group conversation is created exactly once, at the start of Croissance.
    const convId = dreamConversationId(dreamId);
    statements.push(
      ctx.sql.stmt(`INSERT OR IGNORE INTO conversations(id,type,dream_id,title,created_by,last_message_at) SELECT ?,'dream',?,?,?,? WHERE ${inTarget}`, convId, dreamId, dream.title, viewer.id, now, dreamId, toDb),
      ctx.sql.stmt(`INSERT OR IGNORE INTO conversation_members(conversation_id,user_id,role) SELECT ?,user_id,'admin' FROM dream_owners WHERE dream_id=? AND status='accepted' AND ${inTarget}`, convId, dreamId, dreamId, toDb),
      ctx.sql.stmt(`INSERT OR IGNORE INTO conversation_members(conversation_id,user_id,role) SELECT ?,user_id,'member' FROM dream_collaborators WHERE dream_id=? AND status='accepted' AND ${inTarget}`, convId, dreamId, dreamId, toDb),
      ctx.sql.stmt(`INSERT OR IGNORE INTO messages(id,conversation_id,sender_id,message_type,body,sent_at) SELECT ?,?,NULL,'system','dream.conversation.created',? WHERE ${inTarget}`, 'sys_' + convId, convId, sqlNowMs(), dreamId, toDb),
    );
  } else if (target === 'floraison') {
    const v = new V(body);
    const testimony = v.str('testimony', { required: true, min: 1, max: 5000 });
    const resultMediaIds = v.array('resultMediaIds', x => (typeof x === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(x) ? x : undefined), { required: true, max: 10 });
    const primaryMediaId = v.id('primaryMediaId');
    v.done();
    const unique = Array.from(new Set(resultMediaIds!));
    if (!unique.length) throw unprocessable('result_media_required', 'A Floraison needs at least one photograph of the result.');
    const rows = [];
    for (const id of unique) rows.push(await requireOwnedMedia(ctx.sql, id, viewer.id));
    const images = rows.filter(r => r.media_type === 'image');
    if (!images.length) throw unprocessable('result_photo_required', 'A Floraison needs at least one photograph of the result.');
    const primary = primaryMediaId && images.some(r => r.id === primaryMediaId) ? primaryMediaId : images[0].id;
    unique.forEach((mediaId, i) =>
      statements.push(ctx.sql.stmt(
        "INSERT OR IGNORE INTO dream_media(dream_id,media_id,role,sort_order,added_by) SELECT ?,?,'result',?,? WHERE EXISTS(SELECT 1 FROM dreams WHERE id=? AND phase='growth')",
        dreamId, mediaId, i, viewer.id, dreamId,
      )),
    );
    statements.push(ctx.sql.stmt(
      "UPDATE dreams SET phase='testimony',completed_at=?,testimony_text=?,testimony_primary_asset_id=?,cover_media_id=coalesce(cover_media_id,?),version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND phase='growth'",
      now, testimony!, primary, primary, dreamId,
    ));
  }

  statements.push(
    ctx.sql.stmt(`INSERT OR IGNORE INTO dream_phase_history(id,dream_id,from_phase,to_phase,changed_by,changed_at,reason) SELECT ?,?,?,?,?,?,? WHERE ${inTarget}`,
      newId(), dreamId, fromDb, toDb, viewer.id, now, typeof body.reason === 'string' ? body.reason.slice(0, 300) : null, dreamId, toDb),
    auditStmt(ctx.sql, viewer.id, 'dream_phase_transition', 'dream', dreamId, ctx.requestId, { from: current, to: target }),
  );
  // Everyone involved hears about it once (dedupe key per Dream and phase).
  const recipients = await ctx.sql.all<{ user_id: string }>(
    "SELECT user_id FROM dream_owners WHERE dream_id=?1 AND status='accepted' UNION SELECT user_id FROM dream_collaborators WHERE dream_id=?1 AND status='accepted'",
    dreamId,
  );
  for (const r of recipients) {
    if (r.user_id === viewer.id) continue;
    statements.push(notifyStmt(ctx.sql, {
      userId: r.user_id, type: 'dream.phase.changed', category: 'dreams', actorId: viewer.id, entityType: 'dream', entityId: dreamId,
      params: { dream: dream.title, phase: phaseLabel(target, 'fr') }, deepLink: `/dream/${dreamId}`, dedupeKey: `phase:${dreamId}:${target}`,
    }));
  }
  try {
    await ctx.sql.batch(statements);
  } catch (e) {
    mapSqlError(e);
  }
  const after = await ctx.sql.first<{ phase: string }>('SELECT phase FROM dreams WHERE id=?', dreamId);
  const reached = after ? toApiPhase(after.phase) : current;
  if (reached !== target) throw conflict('transition_conflict', 'The Dream changed while transitioning; reload and try again.');
  return { changed: true, phase: target };
}

/** Full Dream detail: the card plus owners, collaborators, history and phase content by permission. */
export async function dreamDetail(ctx: Ctx, dreamId: string): Promise<Record<string, unknown>> {
  const viewer = await ctx.viewer();
  const { dream, role } = await loadVisibleDream(ctx.sql, dreamId, viewer);
  const locale = await ctx.locale();
  const pub = await ctx.sql.first<{ id: string; type: 'dream'; author_id: string; dream_id: string; title: string; cover_asset_id: string | null; visibility: 'private' | 'members' | 'public'; created_at: string; updated_at: string; moderation_hidden_at: string | null }>(
    "SELECT id,type,author_id,dream_id,title,cover_asset_id,visibility,created_at,updated_at,moderation_hidden_at FROM publications WHERE dream_id=? AND type='dream' AND deleted_at IS NULL",
    dreamId,
  );
  const row = pub ?? { id: dream.id, type: 'dream' as const, author_id: dream.created_by, dream_id: dream.id, title: dream.title, cover_asset_id: null, visibility: dream.visibility, created_at: dream.created_at, updated_at: dream.updated_at, moderation_hidden_at: null };
  const [card] = (await hydrate(ctx, viewer, [row], { detail: true })) as DreamCard[];
  const insider = role.isOwner || role.isCollaborator;
  const owners = await ctx.sql.all<{ user_id: string; accepted_at: string | null }>("SELECT user_id,accepted_at FROM dream_owners WHERE dream_id=? AND status='accepted' ORDER BY accepted_at", dreamId);
  const collaborators = await ctx.sql.all<{ user_id: string; status: string; role_title: string | null; accepted_at: string | null }>(
    `SELECT user_id,status,role_title,accepted_at FROM dream_collaborators WHERE dream_id=? ${role.isOwner ? "AND status IN ('invited','offered','accepted')" : "AND status='accepted'"} ORDER BY created_at`,
    dreamId,
  );
  const people = await authorMap(ctx, [...owners.map(o => o.user_id), ...collaborators.map(c => c.user_id)]);
  // Phases are entered once and in order, so order by phase (timestamps tie within a second).
  const history = await ctx.sql.all<{ from_phase: string | null; to_phase: string; changed_at: string }>(
    "SELECT from_phase,to_phase,changed_at FROM dream_phase_history WHERE dream_id=? ORDER BY CASE to_phase WHEN 'dream' THEN 0 WHEN 'initiation' THEN 1 WHEN 'growth' THEN 2 ELSE 3 END",
    dreamId,
  );
  const entryVis = role.isOwner ? "('owners','participants','public')" : role.isCollaborator ? "('participants','public')" : "('public')";
  const entries = await ctx.sql.all<{ id: string; author_id: string; entry_type: string; body: string; entry_date: string | null; visibility: string; created_at: string; edited_at: string | null }>(
    `SELECT id,author_id,entry_type,body,entry_date,visibility,created_at,edited_at FROM dream_entries WHERE dream_id=? AND deleted_at IS NULL AND visibility IN ${entryVis} ORDER BY coalesce(entry_date,substr(created_at,1,10)) DESC, created_at DESC, rowid DESC LIMIT 100`,
    dreamId,
  );
  const resultMedia = toApiPhase(dream.phase) === 'floraison'
    ? await ctx.sql.all<{ media_id: string }>("SELECT media_id FROM dream_media WHERE dream_id=? AND role='result' ORDER BY sort_order", dreamId)
    : [];
  const media = await mediaMap(ctx, resultMedia.map(r => r.media_id));
  const inspiredBy = await ctx.sql.all<{ publication_id: string; type: string; title: string }>(
    "SELECT i.publication_id,p.type,p.title FROM dream_inspirations i JOIN publications p ON p.id=i.publication_id AND p.deleted_at IS NULL AND p.visibility='public' WHERE i.dream_id=?",
    dreamId,
  );
  const conversation = insider
    ? await ctx.sql.first<{ id: string }>("SELECT c.id FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=? AND m.left_at IS NULL WHERE c.dream_id=? AND c.type='dream'", viewer!.id, dreamId)
    : null;
  return {
    dream: {
      ...card,
      owners: owners.map(o => ({ ...people.get(o.user_id), role: o.user_id === dream.created_by ? 'creator' : 'co_owner', since: iso(o.accepted_at) })),
      collaborators: collaborators.map(c => ({ ...people.get(c.user_id), roleTitle: c.role_title, status: c.status, since: iso(c.accepted_at) })),
      phaseHistory: history.map(h => ({ from: h.from_phase ? toApiPhase(h.from_phase) : null, to: toApiPhase(h.to_phase), toLabel: phaseLabel(toApiPhase(h.to_phase), locale), at: iso(h.changed_at) })),
      entries: entries.map(e => ({ id: e.id, type: e.entry_type === 'progress_comment' ? 'progress' : e.entry_type, body: e.body, date: e.entry_date, visibility: e.visibility, createdAt: iso(e.created_at), editedAt: iso(e.edited_at), mine: e.author_id === viewer?.id })),
      resultMedia: resultMedia.map(r => media.get(r.media_id)).filter(Boolean),
      inspiredBy: inspiredBy.map(i => ({ publicationId: i.publication_id, type: i.type, title: i.title })),
      conversationId: conversation?.id ?? null,
      permissions: await permissions(ctx, dream, role),
    },
  };
}

async function permissions(ctx: Ctx, dream: DreamRow, role: DreamRole) {
  const phase = toApiPhase(dream.phase);
  if (!role.isOwner) return { canEdit: false, editableFields: [], canTransition: false, nextPhase: null, readiness: null, canDelete: false, canManageNeeds: false, canInvite: false };
  const next = nextPhase(phase);
  return {
    canEdit: phase !== 'floraison',
    editableFields: EDITABLE_FIELDS[phase],
    canTransition: !!next,
    nextPhase: next,
    readiness: next ? await readiness(ctx, dream) : null,
    canDelete: role.isCreator || role.ownerCount === 1,
    canManageNeeds: phase !== 'floraison',
    canInvite: phase !== 'floraison',
  };
}

export async function softDeleteDream(ctx: Ctx, viewer: Viewer, dreamId: string): Promise<void> {
  const { role } = await requireDreamOwner(ctx.sql, dreamId, viewer);
  if (!(role.isCreator || role.ownerCount === 1)) throw forbidden('creator_only', 'Only the creator (or a sole remaining owner) can delete a Dream.');
  await ctx.sql.batch([
    ctx.sql.stmt('UPDATE dreams SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL', dreamId),
    ctx.sql.stmt("UPDATE conversations SET archived_at=CURRENT_TIMESTAMP WHERE dream_id=? AND type='dream' AND archived_at IS NULL", dreamId),
    ctx.sql.stmt("UPDATE dream_owner_invitations SET status='revoked',answered_at=CURRENT_TIMESTAMP WHERE dream_id=? AND status='pending'", dreamId),
    ctx.sql.stmt("UPDATE dream_help_offers SET status='declined',responded_at=CURRENT_TIMESTAMP,responded_by=? WHERE dream_id=? AND status='pending'", viewer.id, dreamId),
    ctx.sql.stmt("UPDATE introductions SET status='cancelled' WHERE dream_id=? AND status='pending'", dreamId),
    auditStmt(ctx.sql, viewer.id, 'dream_deleted', 'dream', dreamId, ctx.requestId),
  ]);
}

/** Load the visible items for a list of publication ids, preserving order (Fire list, inspirations). */
export async function itemsByPublicationIds(ctx: Ctx, ids: string[]): Promise<FeedItem[]> {
  if (!ids.length) return [];
  const viewer = await ctx.viewer();
  const out: FeedItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50);
    const pubs = await queryPublications(ctx, { viewer, cursor: null, limit: part.length, includeDemo: true, ids: part });
    out.push(...(await hydrate(ctx, viewer, pubs)));
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  return out.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function dreamTitle(ctx: Ctx, dreamId: string): Promise<string> {
  const row = await ctx.sql.first<{ title: string }>('SELECT title FROM dreams WHERE id=?', dreamId);
  if (!row) throw notFound();
  return row.title;
}

