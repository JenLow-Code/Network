import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import type { D1PreparedStatement } from '../platform/cf';
import { V, type Obj } from '../http/validate';
import { conflict, forbidden, mapSqlError, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId, marks } from '../lib/util';
import { json } from '../http/respond';
import { activeMemberByHandle, auditStmt, blockedBetween, loadVisibleDream, requireDreamOwner, userByHandle } from '../services/access';
import { notifyStmt } from '../services/notifications';
import { idempotent } from '../services/idempotency';
import { authorMap } from '../services/feed';
import { createDream, dreamDetail, needInsert, parseCreate, parseNeed, patchDream, softDeleteDream, transitionDream, itemsByPublicationIds } from '../services/dreams';
import { requireOwnedMedia } from './media';
import { allows } from '../domain/actions';
import { ENTRY_TYPES_BY_PHASE, toApiPhase } from '../domain/phases';
import { levelLabel } from '../domain/talents';

type NeedRow = { id: string; dream_id: string; label: string; category: string; slots_total: number; slots_filled: number; manual_confirmed: number; talent_id: string | null; required_level: number | null };
type OfferRow = { id: string; need_id: string; dream_id: string; offered_by: string; message: string | null; status: string; created_at: string; responded_at: string | null; talent_id: string | null };

async function needWithDream(ctx: Ctx, needId: string) {
  const need = await ctx.sql.first<NeedRow>('SELECT * FROM dream_needs WHERE id=?', needId);
  if (!need) throw notFound();
  return need;
}

async function offerContext(ctx: Ctx, offerId: string) {
  const offer = await ctx.sql.first<OfferRow & { label: string; title: string }>(
    'SELECT o.*,n.label,d.title FROM dream_help_offers o JOIN dream_needs n ON n.id=o.need_id JOIN dreams d ON d.id=o.dream_id WHERE o.id=? AND d.deleted_at IS NULL',
    offerId,
  );
  if (!offer) throw notFound();
  return offer;
}

const ownersOf = (ctx: Ctx, dreamId: string) => ctx.sql.all<{ user_id: string }>("SELECT user_id FROM dream_owners WHERE dream_id=? AND status='accepted'", dreamId);

/** Statements that remove a member from a Dream's collaboration once they have no accepted role left. */
function releaseCollaboratorStmts(ctx: Ctx, dreamId: string, userId: string): D1PreparedStatement[] {
  return [
    ctx.sql.stmt(
      `UPDATE dream_collaborators SET status='removed' WHERE dream_id=?1 AND user_id=?2 AND status='accepted'
        AND NOT EXISTS(SELECT 1 FROM dream_help_offers WHERE dream_id=?1 AND offered_by=?2 AND status='accepted')`,
      dreamId, userId,
    ),
    ctx.sql.stmt(
      `UPDATE conversation_members SET left_at=CURRENT_TIMESTAMP WHERE user_id=?2 AND left_at IS NULL
        AND conversation_id=(SELECT id FROM conversations WHERE dream_id=?1 AND type='dream')
        AND NOT EXISTS(SELECT 1 FROM dream_owners WHERE dream_id=?1 AND user_id=?2 AND status='accepted')
        AND NOT EXISTS(SELECT 1 FROM dream_collaborators WHERE dream_id=?1 AND user_id=?2 AND status='accepted')`,
      dreamId, userId,
    ),
  ];
}

/** Add someone to the Dream conversation if it exists (after Croissance began). */
function joinDreamConversationStmts(ctx: Ctx, dreamId: string, userId: string, role: 'admin' | 'member'): D1PreparedStatement[] {
  return [
    ctx.sql.stmt("INSERT OR IGNORE INTO conversation_members(conversation_id,user_id,role) SELECT id,?,? FROM conversations WHERE dream_id=? AND type='dream'", userId, role, dreamId),
    ctx.sql.stmt("UPDATE conversation_members SET left_at=NULL WHERE user_id=? AND conversation_id=(SELECT id FROM conversations WHERE dream_id=? AND type='dream')", userId, dreamId),
  ];
}

export function registerDreams(r: Router): void {
  // ---------------------------------------------------------------- core
  r.add('POST', '/api/dreams', { tag: 'Dreams', summary: 'Create a Semence Dream (private by default; title becomes immutable)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'write', viewer.id, LIMITS.write);
    const id = await createDream(ctx, viewer, parseCreate(await ctx.body()));
    return json(await dreamDetail(ctx, id), 201, { Location: `/api/dreams/${id}` });
  });

  r.add('GET', '/api/dreams/:id', { tag: 'Dreams', summary: 'Dream detail with phase content, people and viewer permissions', auth: 'optional' }, ctx => dreamDetail(ctx, ctx.param('id')));

  r.add('PATCH', '/api/dreams/:id', { tag: 'Dreams', summary: 'Edit fields allowed in the current phase (title and phase are never editable)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await patchDream(ctx, viewer, ctx.param('id'), await ctx.body());
    return dreamDetail(ctx, ctx.param('id'));
  });

  r.add('DELETE', '/api/dreams/:id', { tag: 'Dreams', summary: 'Soft-delete a Dream (creator or sole owner)', auth: 'required' }, async ctx => {
    await softDeleteDream(ctx, await ctx.user(), ctx.param('id'));
    return { deleted: true };
  });

  r.add('POST', '/api/dreams/:id/transitions', { tag: 'Dreams', summary: 'Move to the next phase (guarded, atomic, idempotent; Croissance opens the Dream conversation once)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const body = await ctx.body();
    return idempotent(ctx, viewer, 'transition:' + id, async () => {
      const result = await transitionDream(ctx, viewer, id, body);
      return { status: 200, body: { changed: result.changed, ...(await dreamDetail(ctx, id)) } };
    });
  });

  r.add('GET', '/api/dreams/:id/phase-history', { tag: 'Dreams', summary: 'Phase history', auth: 'optional' }, async ctx => {
    const detail = (await dreamDetail(ctx, ctx.param('id'))) as { dream: { phaseHistory: unknown } };
    return { items: detail.dream.phaseHistory };
  });

  r.add('GET', '/api/dreams/:id/readiness', { tag: 'Dreams', summary: 'What still blocks the next phase (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await requireDreamOwner(ctx.sql, ctx.param('id'), viewer);
    const detail = (await dreamDetail(ctx, ctx.param('id'))) as { dream: { permissions: unknown } };
    return { permissions: detail.dream.permissions };
  });

  r.add('GET', '/api/dreams/:id/conversation', { tag: 'Dreams', summary: 'The Dream group conversation id (members only)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await loadVisibleDream(ctx.sql, ctx.param('id'), viewer);
    const row = await ctx.sql.first<{ id: string }>(
      "SELECT c.id FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=? AND m.left_at IS NULL WHERE c.dream_id=? AND c.type='dream'",
      viewer.id, ctx.param('id'),
    );
    if (!row) throw notFound('conversation_not_found');
    return { conversationId: row.id };
  });

  // ---------------------------------------------------------------- media & composition
  r.add('POST', '/api/dreams/:id/media', { tag: 'Dreams', summary: 'Add an image to the Semence gallery', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const v = new V(await ctx.body());
    const mediaId = v.id('mediaId', { required: true });
    const role = v.oneOf('role', ['gallery', 'semence'] as const) ?? 'gallery';
    const caption = v.str('caption', { max: 300 });
    v.done();
    await requireOwnedMedia(ctx.sql, mediaId!, viewer.id, ['image']);
    try {
      await ctx.sql.run(
        'INSERT OR IGNORE INTO dream_media(dream_id,media_id,role,sort_order,caption,added_by) VALUES(?,?,?,(SELECT coalesce(max(sort_order),-1)+1 FROM dream_media WHERE dream_id=?),?,?)',
        id, mediaId!, role, id, caption ?? null, viewer.id,
      );
    } catch (e) { mapSqlError(e); }
    return dreamDetail(ctx, id);
  });

  r.add('DELETE', '/api/dreams/:id/media/:mediaId', { tag: 'Dreams', summary: 'Remove an image from the gallery', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await requireDreamOwner(ctx.sql, ctx.param('id'), viewer);
    try {
      await ctx.sql.run("DELETE FROM dream_media WHERE dream_id=? AND media_id=? AND role<>'result'", ctx.param('id'), ctx.param('mediaId'));
    } catch (e) { mapSqlError(e); }
    return { removed: true };
  });

  r.add('GET', '/api/dreams/:id/blocks', { tag: 'Dreams', summary: 'Semence studio composition (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await requireDreamOwner(ctx.sql, ctx.param('id'), viewer);
    const rows = await ctx.sql.all<{ id: string; position: number; kind: string; title: string | null; content: string; props_json: string; updated_at: string }>(
      'SELECT id,position,kind,title,content,props_json,updated_at FROM dream_blocks WHERE dream_id=? ORDER BY position,created_at', ctx.param('id'),
    );
    return { items: rows.map(b => ({ id: b.id, position: b.position, kind: b.kind, title: b.title, content: b.content, props: JSON.parse(b.props_json), updatedAt: iso(b.updated_at) })) };
  });

  const BLOCK_KINDS = ['text', 'heading1', 'heading2', 'heading3', 'quote', 'callout', 'bullet', 'numbered', 'todo', 'toggle', 'accordion', 'divider', 'spacer', 'image', 'gallery', 'audio', 'music', 'video', 'document', 'pdf', 'bookmark', 'link', 'embed', 'code', 'equation', 'table', 'toc', 'date', 'columns', 'collection'] as const;
  const PROP_KEYS = ['size', 'span', 'height', 'tone', 'font', 'align', 'frame', 'ink', 'caption', 'icon', 'media', 'checked'];
  const parseProps = (raw: unknown, v: V): string | undefined => {
    if (raw === undefined) return undefined;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { v.addError('props', 'invalid_type'); return undefined; }
    const clean = Object.fromEntries(Object.entries(raw as Obj).filter(([k]) => PROP_KEYS.includes(k)));
    const text = JSON.stringify(clean);
    if (text.length > 8000) { v.addError('props', 'too_large'); return undefined; }
    return text;
  };

  r.add('POST', '/api/dreams/:id/blocks', { tag: 'Dreams', summary: 'Add a Semence block (Semence only)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const body = await ctx.body();
    const v = new V(body);
    const kind = v.oneOf('kind', BLOCK_KINDS, { required: true });
    const title = v.str('title', { max: 200, nullable: true });
    const content = v.str('content', { max: 10000, trim: false }) ?? '';
    const position = v.int('position', { min: 0, max: 10000 });
    const props = parseProps(body.props, v) ?? '{}';
    v.done();
    const blockId = newId();
    try {
      await ctx.sql.run(
        'INSERT INTO dream_blocks(id,dream_id,position,kind,title,content,props_json,created_by) VALUES(?,?,coalesce(?,(SELECT coalesce(max(position),-1)+1 FROM dream_blocks WHERE dream_id=?)),?,?,?,?,?)',
        blockId, id, position ?? null, id, kind!, title ?? null, content, props, viewer.id,
      );
    } catch (e) { mapSqlError(e); }
    return { id: blockId };
  });

  r.add('PATCH', '/api/dream-blocks/:id', { tag: 'Dreams', summary: 'Edit a Semence block', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const block = await ctx.sql.first<{ dream_id: string }>('SELECT dream_id FROM dream_blocks WHERE id=?', ctx.param('id'));
    if (!block) throw notFound();
    await requireDreamOwner(ctx.sql, block.dream_id, viewer);
    const body = await ctx.body();
    const v = new V(body);
    const kind = v.oneOf('kind', BLOCK_KINDS);
    const title = v.str('title', { max: 200, nullable: true });
    const content = v.str('content', { max: 10000, trim: false });
    const position = v.int('position', { min: 0, max: 10000 });
    const props = parseProps(body.props, v);
    v.done();
    try {
      await ctx.sql.run(
        'UPDATE dream_blocks SET kind=coalesce(?,kind),title=CASE WHEN ? THEN ? ELSE title END,content=coalesce(?,content),position=coalesce(?,position),props_json=coalesce(?,props_json),updated_at=CURRENT_TIMESTAMP WHERE id=?',
        kind ?? null, title !== undefined ? 1 : 0, title ?? null, content ?? null, position ?? null, props ?? null, ctx.param('id'),
      );
    } catch (e) { mapSqlError(e); }
    return { updated: true };
  });

  r.add('DELETE', '/api/dream-blocks/:id', { tag: 'Dreams', summary: 'Delete a Semence block', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const block = await ctx.sql.first<{ dream_id: string }>('SELECT dream_id FROM dream_blocks WHERE id=?', ctx.param('id'));
    if (!block) throw notFound();
    await requireDreamOwner(ctx.sql, block.dream_id, viewer);
    try { await ctx.sql.run('DELETE FROM dream_blocks WHERE id=?', ctx.param('id')); } catch (e) { mapSqlError(e); }
    return { deleted: true };
  });

  r.add('PUT', '/api/dreams/:id/blocks/order', { tag: 'Dreams', summary: 'Reorder Semence blocks', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const v = new V(await ctx.body());
    const ids = v.array('ids', x => (typeof x === 'string' ? x : undefined), { required: true, max: 200 });
    v.done();
    try {
      await ctx.sql.batch(ids!.map((blockId, i) => ctx.sql.stmt('UPDATE dream_blocks SET position=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND dream_id=?', i, blockId, id)));
    } catch (e) { mapSqlError(e); }
    return { reordered: ids!.length };
  });

  // ---------------------------------------------------------------- needs
  r.add('GET', '/api/dreams/:id/needs', { tag: 'Needs', summary: 'Needs with confirmed slots and required levels (owners also see pending offer counts)', auth: 'optional' }, async ctx => {
    const detail = (await dreamDetail(ctx, ctx.param('id'))) as { dream: { needs: unknown; needsProgress: unknown } };
    return { items: detail.dream.needs, progress: detail.dream.needsProgress };
  });

  r.add('POST', '/api/dreams/:id/needs', { tag: 'Needs', summary: 'Add a need (person, practical, financial or logistics)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const { value, errors } = parseNeed(await ctx.body());
    errors!.done();
    if (value!.talentId && !(await ctx.sql.exists('SELECT 1 FROM talents WHERE id=? AND is_active=1', value!.talentId))) throw unprocessable('talent_not_found');
    const needId = newId();
    try {
      await ctx.sql.batch([needInsert(ctx, id, value!, needId), auditStmt(ctx.sql, viewer.id, 'need_created', 'dream_need', needId, ctx.requestId)]);
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw conflict('need_label_exists');
      mapSqlError(e);
    }
    return { id: needId, ...((await dreamDetail(ctx, id)) as object) };
  });

  r.add('PATCH', '/api/needs/:id', { tag: 'Needs', summary: 'Edit a need (slots cannot drop below confirmed slots)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const need = await needWithDream(ctx, ctx.param('id'));
    await requireDreamOwner(ctx.sql, need.dream_id, viewer);
    const { value, errors } = parseNeed(await ctx.body(), true);
    errors!.done();
    const map: Record<string, string> = { label: 'label', category: 'category', talentId: 'talent_id', requiredLevel: 'required_level', slotsTotal: 'slots_total', isRequired: 'is_required', description: 'description', amountCents: 'amount_cents', currency: 'currency', illustration: 'illustration', sortOrder: 'sort_order' };
    const entries = Object.entries(value!).filter(([k]) => map[k]);
    if (!entries.length) return { need: await ctx.sql.first('SELECT * FROM dream_needs WHERE id=?', need.id) };
    if (value!.slotsTotal !== undefined && value!.slotsTotal < need.slots_filled) throw conflict('slots_below_confirmed', 'Release helpers before reducing slots.');
    try {
      await ctx.sql.run(
        `UPDATE dream_needs SET ${entries.map(([k]) => map[k] + '=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        ...entries.map(([k, val]) => (k === 'isRequired' ? (val ? 1 : 0) : (val as string | number | null))), need.id,
      );
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw conflict('need_label_exists');
      mapSqlError(e);
    }
    return dreamDetail(ctx, need.dream_id);
  });

  r.add('DELETE', '/api/needs/:id', { tag: 'Needs', summary: 'Remove a need (refused while helpers are accepted)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const need = await needWithDream(ctx, ctx.param('id'));
    const { dream } = await requireDreamOwner(ctx.sql, need.dream_id, viewer);
    if(await ctx.sql.exists("SELECT 1 FROM dream_need_invitations WHERE need_id=? AND status IN ('pending','accepted')",need.id))
      throw conflict('active_talent_invitation','Retire d’abord les personnes invitées ; chacune doit être prévenue.');
    const pending = await ctx.sql.all<{ offered_by: string }>("SELECT offered_by FROM dream_help_offers WHERE need_id=? AND status='pending'", need.id);
    try {
      await ctx.sql.batch([
        ...pending.map(p => notifyStmt(ctx.sql, { userId: p.offered_by, type: 'dream.offer.declined', category: 'collaboration', actorId: viewer.id, entityType: 'dream', entityId: need.dream_id, params: { need: need.label, dream: dream.title }, dedupeKey: `offer-closed:${need.id}:${p.offered_by}` })),
        ctx.sql.stmt('DELETE FROM dream_needs WHERE id=?', need.id),
        auditStmt(ctx.sql, viewer.id, 'need_deleted', 'dream_need', need.id, ctx.requestId),
      ]);
    } catch (e) { mapSqlError(e); }
    return { deleted: true };
  });

  r.add('POST', '/api/needs/:id/confirm', { tag: 'Needs', summary: 'Owner confirms one slot without a helper offer (e.g. a venue secured)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const need = await needWithDream(ctx, ctx.param('id'));
    await requireDreamOwner(ctx.sql, need.dream_id, viewer);
    if(need.category==='person') throw unprocessable('talent_requires_acceptance','Un talent ne peut être confirmé que par une personne ayant accepté.');
    let changed = 0;
    try {
      changed = await ctx.sql.run('UPDATE dream_needs SET manual_confirmed=manual_confirmed+1,slots_filled=slots_filled+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND slots_filled<slots_total', need.id);
    } catch (e) { mapSqlError(e); }
    if (!changed) throw conflict('need_full');
    return dreamDetail(ctx, need.dream_id);
  });

  r.add('POST', '/api/needs/:id/unconfirm', { tag: 'Needs', summary: 'Undo an owner confirmation', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const need = await needWithDream(ctx, ctx.param('id'));
    await requireDreamOwner(ctx.sql, need.dream_id, viewer);
    if(need.category==='person') throw unprocessable('talent_requires_acceptance','Un talent ne peut être retiré que par le circuit des invitations.');
    let changed = 0;
    try {
      changed = await ctx.sql.run('UPDATE dream_needs SET manual_confirmed=manual_confirmed-1,slots_filled=slots_filled-1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND manual_confirmed>0', need.id);
    } catch (e) { mapSqlError(e); }
    if (!changed) throw conflict('nothing_to_unconfirm');
    return dreamDetail(ctx, need.dream_id);
  });

  r.add('GET', '/api/needs/:id/matches', { tag: 'Needs', summary: 'Members whose self-reported talent and level match a need (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const need = await needWithDream(ctx, ctx.param('id'));
    await requireDreamOwner(ctx.sql, need.dream_id, viewer);
    if (!need.talent_id) return { items: [], reason: 'need_has_no_talent' };
    const locale = await ctx.locale();
    const rows = await ctx.sql.all<{ user_id: string; level: number; available_for_projects: number }>(
      `SELECT ut.user_id,ut.level,ut.available_for_projects FROM user_talents ut JOIN users u ON u.id=ut.user_id JOIN user_preferences p ON p.user_id=u.id
       WHERE ut.talent_id=?1 AND ut.level>=?2 AND ut.visibility='public' AND u.account_status='active' AND p.discoverable=1 AND u.id<>?3
         AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=?3 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=?3))
       ORDER BY ut.available_for_projects DESC, ut.level DESC, ut.updated_at DESC LIMIT 30`,
      need.talent_id, need.required_level ?? 1, viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => x.user_id));
    return { items: rows.map(x => ({ member: people.get(x.user_id), level: x.level, levelLabel: levelLabel(x.level, locale), availableForProjects: x.available_for_projects === 1 })), policy: 'Self-reported talent and level ≥ required, discoverable members only. Suggestions, not endorsements.' };
  });

  // ---------------------------------------------------------------- offers
  r.add('POST', '/api/needs/:id/offers', { tag: 'Needs', summary: 'Offer help for a need (pending until an owner accepts)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const need = await needWithDream(ctx, ctx.param('id'));
    const { dream, role } = await loadVisibleDream(ctx.sql, need.dream_id, viewer);
    if (role.isOwner) throw unprocessable('own_dream', 'Owners confirm their own resources directly.');
    const phase = toApiPhase(dream.phase);
    if (phase !== 'germination' && phase !== 'croissance') throw unprocessable('action_not_allowed_for_phase');
    if (need.slots_filled >= need.slots_total) throw conflict('need_full');
    const v = new V(await ctx.optionalBody());
    const message = v.str('message', { max: 1000 });
    const talentId = v.id('talentId');
    v.done();
    const existing = await ctx.sql.first<{ id: string; status: string }>('SELECT id,status FROM dream_help_offers WHERE need_id=? AND offered_by=?', need.id, viewer.id);
    if (existing && (existing.status === 'pending' || existing.status === 'accepted')) throw conflict('offer_exists');
    const offerId = existing?.id ?? newId();
    const owners = await ownersOf(ctx, dream.id);
    try {
      await ctx.sql.batch([
        existing
          ? ctx.sql.stmt("UPDATE dream_help_offers SET status='pending',message=?,talent_id=?,responded_at=NULL,responded_by=NULL,created_at=CURRENT_TIMESTAMP WHERE id=?", message ?? null, talentId ?? null, offerId)
          : ctx.sql.stmt("INSERT INTO dream_help_offers(id,need_id,dream_id,offered_by,message,status,talent_id) VALUES(?,?,?,?,?,'pending',?)", offerId, need.id, dream.id, viewer.id, message ?? null, talentId ?? null),
        ...owners.map(o => notifyStmt(ctx.sql, { userId: o.user_id, type: 'dream.offer.received', category: 'collaboration', actorId: viewer.id, entityType: 'offer', entityId: offerId, params: { actor: viewer.displayName, need: need.label, dream: dream.title }, deepLink: `/dream/${dream.id}`, dedupeKey: `offer:${offerId}:${Date.now()}` })),
      ]);
    } catch (e) { mapSqlError(e); }
    return { offer: { id: offerId, needId: need.id, dreamId: dream.id, status: 'pending' } };
  });

  r.add('GET', '/api/dreams/:id/offers', { tag: 'Needs', summary: 'Offers received for a Dream (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const locale = await ctx.locale();
    const status = ctx.query('status');
    const rows = await ctx.sql.all<OfferRow & { label: string; level: number | null }>(
      `SELECT o.*,n.label,(SELECT level FROM user_talents ut WHERE ut.user_id=o.offered_by AND ut.talent_id=coalesce(o.talent_id,n.talent_id)) AS level
       FROM dream_help_offers o JOIN dream_needs n ON n.id=o.need_id WHERE o.dream_id=? ${status ? 'AND o.status=?' : ''} ORDER BY o.created_at DESC LIMIT 200`,
      ...(status ? [id, status] : [id]),
    );
    const people = await authorMap(ctx, rows.map(x => x.offered_by));
    return { items: rows.map(o => ({ id: o.id, needId: o.need_id, need: o.label, status: o.status, message: o.message, helper: people.get(o.offered_by), helperLevel: o.level, helperLevelLabel: levelLabel(o.level, locale), createdAt: iso(o.created_at), respondedAt: iso(o.responded_at) })) };
  });

  r.add('GET', '/api/me/offers', { tag: 'Needs', summary: 'My offers of help', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<OfferRow & { label: string; title: string; phase: string }>(
      'SELECT o.*,n.label,d.title,d.phase FROM dream_help_offers o JOIN dream_needs n ON n.id=o.need_id JOIN dreams d ON d.id=o.dream_id WHERE o.offered_by=? AND d.deleted_at IS NULL ORDER BY o.created_at DESC LIMIT 200',
      viewer.id,
    );
    return { items: rows.map(o => ({ id: o.id, dreamId: o.dream_id, dreamTitle: o.title, phase: toApiPhase(o.phase), needId: o.need_id, need: o.label, status: o.status, createdAt: iso(o.created_at), respondedAt: iso(o.responded_at) })) };
  });

  const respond = (action: 'accept' | 'decline' | 'release') => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const offer = await offerContext(ctx, ctx.param('id'));
    await requireDreamOwner(ctx.sql, offer.dream_id, viewer);
    const from = action === 'release' ? 'accepted' : 'pending';
    if (offer.status !== from) throw conflict(action === 'release' ? 'offer_not_accepted' : 'offer_not_pending');
    if (action === 'accept' && (await blockedBetween(ctx.sql, viewer.id, offer.offered_by))) throw notFound();
    const status = action === 'accept' ? 'accepted' : 'declined';
    const stmts: D1PreparedStatement[] = [
      ctx.sql.stmt('UPDATE dream_help_offers SET status=?,responded_at=CURRENT_TIMESTAMP,responded_by=? WHERE id=? AND status=?', status, viewer.id, offer.id, from),
    ];
    if (action === 'accept') {
      // Accepting fills one slot (trigger) and makes the helper an accepted collaborator — never a co-owner.
      stmts.push(
        ctx.sql.stmt(
          `INSERT INTO dream_collaborators(dream_id,user_id,status,role_title,invited_by,accepted_at)
           SELECT ?1,?2,'accepted',?3,?4,CURRENT_TIMESTAMP WHERE EXISTS(SELECT 1 FROM dream_help_offers WHERE id=?5 AND status='accepted')
           ON CONFLICT(dream_id,user_id) DO UPDATE SET status='accepted',accepted_at=CURRENT_TIMESTAMP,role_title=coalesce(dream_collaborators.role_title,excluded.role_title)`,
          offer.dream_id, offer.offered_by, offer.label, viewer.id, offer.id,
        ),
        ...joinDreamConversationStmts(ctx, offer.dream_id, offer.offered_by, 'member'),
      );
    } else if (action === 'release') {
      stmts.push(...releaseCollaboratorStmts(ctx, offer.dream_id, offer.offered_by));
    }
    stmts.push(
      notifyStmt(ctx.sql, { userId: offer.offered_by, type: action === 'accept' ? 'dream.offer.accepted' : action === 'release' ? 'dream.offer.released' : 'dream.offer.declined', category: 'collaboration', actorId: viewer.id, entityType: 'dream', entityId: offer.dream_id, params: { need: offer.label, dream: offer.title }, deepLink: `/dream/${offer.dream_id}`, dedupeKey: `offer-${action}:${offer.id}:${Date.now()}` }),
      auditStmt(ctx.sql, viewer.id, 'offer_' + action, 'offer', offer.id, ctx.requestId),
    );
    try {
      await ctx.sql.batch(stmts);
    } catch (e) {
      if (String(e).includes('slots_filled') || String(e).includes('CHECK constraint failed')) throw conflict('need_full', 'This need is already complete.');
      mapSqlError(e);
    }
    const after = await ctx.sql.first<{ status: string }>('SELECT status FROM dream_help_offers WHERE id=?', offer.id);
    if (after?.status !== status) throw conflict('offer_changed');
    return dreamDetail(ctx, offer.dream_id);
  };
  r.add('POST', '/api/offers/:id/accept', { tag: 'Needs', summary: 'Accept a pending offer (fills one slot atomically; never overfills)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    return idempotent(ctx, viewer, 'offer-accept:' + ctx.param('id'), async () => ({ status: 200, body: await respond('accept')(ctx) }));
  });
  r.add('POST', '/api/offers/:id/decline', { tag: 'Needs', summary: 'Decline a pending offer', auth: 'required' }, respond('decline'));
  r.add('POST', '/api/offers/:id/release', { tag: 'Needs', summary: 'Release an accepted helper (frees the slot)', auth: 'required' }, respond('release'));

  r.add('POST', '/api/offers/:id/withdraw', { tag: 'Needs', summary: 'Withdraw my own offer (pending or accepted)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const offer = await offerContext(ctx, ctx.param('id'));
    if (offer.offered_by !== viewer.id) throw notFound();
    if (offer.status !== 'pending' && offer.status !== 'accepted') throw conflict('offer_not_active');
    try {
      await ctx.sql.batch([
        ctx.sql.stmt("UPDATE dream_help_offers SET status='withdrawn',responded_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','accepted')", offer.id),
        ...releaseCollaboratorStmts(ctx, offer.dream_id, viewer.id),
        auditStmt(ctx.sql, viewer.id, 'offer_withdrawn', 'offer', offer.id, ctx.requestId),
      ]);
    } catch (e) { mapSqlError(e); }
    return { offer: { id: offer.id, status: 'withdrawn' } };
  });

  // ---------------------------------------------------------------- co-owners
  r.add('POST', '/api/dreams/:id/owner-invitations', { tag: 'Roles', summary: 'Invite a member to co-own the Dream (explicit acceptance required)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream } = await requireDreamOwner(ctx.sql, id, viewer);
    if (toApiPhase(dream.phase) === 'floraison') throw unprocessable('floraison_locked');
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    const message = v.str('message', { max: 500 });
    v.done();
    const invitee = await activeMemberByHandle(ctx.sql, handle!, viewer);
    if (await ctx.sql.exists("SELECT 1 FROM dream_owners WHERE dream_id=? AND user_id=? AND status='accepted'", id, invitee.id)) throw conflict('already_owner');
    const existing = await ctx.sql.first<{ id: string; status: string }>('SELECT id,status FROM dream_owner_invitations WHERE dream_id=? AND invited_user_id=?', id, invitee.id);
    if (existing?.status === 'pending') throw conflict('invitation_pending');
    const invId = existing?.id ?? newId();
    await ctx.sql.batch([
      existing
        ? ctx.sql.stmt("UPDATE dream_owner_invitations SET status='pending',invited_by_user_id=?,message=?,created_at=CURRENT_TIMESTAMP,answered_at=NULL WHERE id=?", viewer.id, message ?? null, invId)
        : ctx.sql.stmt("INSERT INTO dream_owner_invitations(id,dream_id,invited_user_id,invited_by_user_id,status,message) VALUES(?,?,?,?,'pending',?)", invId, id, invitee.id, viewer.id, message ?? null),
      notifyStmt(ctx.sql, { userId: invitee.id, type: 'dream.owner_invitation.received', category: 'collaboration', actorId: viewer.id, entityType: 'owner_invitation', entityId: invId, params: { actor: viewer.displayName, dream: dream.title }, deepLink: `/dream/${id}`, dedupeKey: `owner-inv:${invId}:${Date.now()}` }),
      auditStmt(ctx.sql, viewer.id, 'owner_invited', 'dream', id, ctx.requestId, { invitee: invitee.id }),
    ]);
    return { invitation: { id: invId, status: 'pending', invitee: invitee.handle } };
  });

  r.add('GET', '/api/dreams/:id/owner-invitations', { tag: 'Roles', summary: 'Co-owner invitations of a Dream (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await requireDreamOwner(ctx.sql, ctx.param('id'), viewer);
    const rows = await ctx.sql.all<{ id: string; invited_user_id: string; status: string; created_at: string; answered_at: string | null }>('SELECT * FROM dream_owner_invitations WHERE dream_id=? ORDER BY created_at DESC', ctx.param('id'));
    const people = await authorMap(ctx, rows.map(x => x.invited_user_id));
    return { items: rows.map(x => ({ id: x.id, invitee: people.get(x.invited_user_id), status: x.status, createdAt: iso(x.created_at), answeredAt: iso(x.answered_at) })) };
  });

  r.add('GET', '/api/me/owner-invitations', { tag: 'Roles', summary: 'Co-owner invitations I received', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ id: string; dream_id: string; title: string; summary: string; phase: string; invited_by_user_id: string; message: string | null; created_at: string }>(
      "SELECT i.id,i.dream_id,d.title,d.summary,d.phase,i.invited_by_user_id,i.message,i.created_at FROM dream_owner_invitations i JOIN dreams d ON d.id=i.dream_id AND d.deleted_at IS NULL WHERE i.invited_user_id=? AND i.status='pending' ORDER BY i.created_at DESC",
      viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => x.invited_by_user_id));
    return { items: rows.map(x => ({ id: x.id, dream: { id: x.dream_id, title: x.title, summary: x.summary, phase: toApiPhase(x.phase) }, invitedBy: people.get(x.invited_by_user_id), message: x.message, createdAt: iso(x.created_at) })) };
  });

  const answerInvitation = (accept: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const inv = await ctx.sql.first<{ id: string; dream_id: string; invited_user_id: string; invited_by_user_id: string; status: string; title: string }>(
      'SELECT i.*,d.title FROM dream_owner_invitations i JOIN dreams d ON d.id=i.dream_id AND d.deleted_at IS NULL WHERE i.id=?', ctx.param('id'),
    );
    if (!inv || inv.invited_user_id !== viewer.id) throw notFound();
    if (inv.status !== 'pending') throw conflict('invitation_not_pending');
    const stmts: D1PreparedStatement[] = [ctx.sql.stmt("UPDATE dream_owner_invitations SET status=?,answered_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'", accept ? 'accepted' : 'declined', inv.id)];
    if (accept) {
      stmts.push(
        ctx.sql.stmt(
          `INSERT INTO dream_owners(dream_id,user_id,invited_by,status,accepted_at) VALUES(?,?,?,'accepted',CURRENT_TIMESTAMP)
           ON CONFLICT(dream_id,user_id) DO UPDATE SET status='accepted',accepted_at=CURRENT_TIMESTAMP,removed_at=NULL,invited_by=excluded.invited_by`,
          inv.dream_id, viewer.id, inv.invited_by_user_id,
        ),
        ...joinDreamConversationStmts(ctx, inv.dream_id, viewer.id, 'admin'),
        ...(await ownersOf(ctx, inv.dream_id)).map(o => notifyStmt(ctx.sql, { userId: o.user_id, type: 'dream.owner_invitation.accepted', category: 'collaboration', actorId: viewer.id, entityType: 'dream', entityId: inv.dream_id, params: { actor: viewer.displayName, dream: inv.title }, dedupeKey: `owner-acc:${inv.id}` })),
      );
    }
    stmts.push(auditStmt(ctx.sql, viewer.id, accept ? 'owner_invitation_accepted' : 'owner_invitation_declined', 'dream', inv.dream_id, ctx.requestId));
    await ctx.sql.batch(stmts);
    return { invitation: { id: inv.id, status: accept ? 'accepted' : 'declined' }, dreamId: inv.dream_id };
  };
  r.add('POST', '/api/owner-invitations/:id/accept', { tag: 'Roles', summary: 'Accept a co-owner invitation', auth: 'required' }, answerInvitation(true));
  r.add('POST', '/api/owner-invitations/:id/decline', { tag: 'Roles', summary: 'Decline a co-owner invitation', auth: 'required' }, answerInvitation(false));

  r.add('POST', '/api/owner-invitations/:id/revoke', { tag: 'Roles', summary: 'Revoke a pending co-owner invitation (owners)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const inv = await ctx.sql.first<{ id: string; dream_id: string; status: string }>('SELECT id,dream_id,status FROM dream_owner_invitations WHERE id=?', ctx.param('id'));
    if (!inv) throw notFound();
    await requireDreamOwner(ctx.sql, inv.dream_id, viewer);
    const changed = await ctx.sql.run("UPDATE dream_owner_invitations SET status='revoked',answered_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'", inv.id);
    if (!changed) throw conflict('invitation_not_pending');
    return { invitation: { id: inv.id, status: 'revoked' } };
  });

  r.add('DELETE', '/api/dreams/:id/owners/:handle', { tag: 'Roles', summary: 'Leave co-ownership or (creator) remove a co-owner; the last owner can never be removed', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { role } = await requireDreamOwner(ctx.sql, id, viewer);
    const target = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!target) throw notFound();
    if (target.id !== viewer.id && !role.isCreator) throw forbidden('creator_only');
    const changed = await ctx.sql.run(
      `UPDATE dream_owners SET status='removed',removed_at=CURRENT_TIMESTAMP WHERE dream_id=?1 AND user_id=?2 AND status='accepted'
        AND (SELECT count(*) FROM dream_owners WHERE dream_id=?1 AND status='accepted')>1`,
      id, target.id,
    );
    if (!changed) throw conflict('last_owner', 'A Dream always keeps at least one accepted owner.');
    await ctx.sql.batch([...releaseCollaboratorStmts(ctx, id, target.id), auditStmt(ctx.sql, viewer.id, 'owner_removed', 'dream', id, ctx.requestId, { target: target.id })]);
    return { removed: true };
  });

  // ---------------------------------------------------------------- collaborators & participants
  r.add('POST', '/api/dreams/:id/collaborators', { tag: 'Roles', summary: 'Invite a collaborator (not an owner)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream } = await requireDreamOwner(ctx.sql, id, viewer);
    const v = new V(await ctx.body());
    const handle = v.str('handle', { required: true, max: 40 });
    const roleTitle = v.str('roleTitle', { max: 80 });
    v.done();
    const invitee = await activeMemberByHandle(ctx.sql, handle!, viewer);
    await ctx.sql.batch([
      ctx.sql.stmt(
        `INSERT INTO dream_collaborators(dream_id,user_id,status,role_title,invited_by) VALUES(?,?,'invited',?,?)
         ON CONFLICT(dream_id,user_id) DO UPDATE SET status='invited',role_title=excluded.role_title,invited_by=excluded.invited_by WHERE dream_collaborators.status IN ('declined','removed')`,
        id, invitee.id, roleTitle ?? null, viewer.id,
      ),
      notifyStmt(ctx.sql, { userId: invitee.id, type: 'dream.collaborator.invited', category: 'collaboration', actorId: viewer.id, entityType: 'dream', entityId: id, params: { actor: viewer.displayName, dream: dream.title }, deepLink: `/dream/${id}`, dedupeKey: `collab-inv:${id}:${invitee.id}:${Date.now()}` }),
    ]);
    const row = await ctx.sql.first<{ status: string }>('SELECT status FROM dream_collaborators WHERE dream_id=? AND user_id=?', id, invitee.id);
    return { collaborator: { handle: invitee.handle, status: row?.status } };
  });

  r.add('POST', '/api/dreams/:id/collaborators/respond', { tag: 'Roles', summary: 'Accept or decline a collaboration invitation', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const v = new V(await ctx.body());
    const accept = v.bool('accept', { required: true });
    v.done();
    const changed = await ctx.sql.run("UPDATE dream_collaborators SET status=?,accepted_at=CASE WHEN ?='accepted' THEN CURRENT_TIMESTAMP END WHERE dream_id=? AND user_id=? AND status='invited'", accept ? 'accepted' : 'declined', accept ? 'accepted' : 'declined', id, viewer.id);
    if (!changed) throw notFound('invitation_not_found');
    if (accept) await ctx.sql.batch(joinDreamConversationStmts(ctx, id, viewer.id, 'member'));
    return { status: accept ? 'accepted' : 'declined' };
  });

  r.add('DELETE', '/api/dreams/:id/collaborators/:handle', { tag: 'Roles', summary: 'Remove a collaborator (owners) or leave (self); releases their slots', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const target = await userByHandle(ctx.sql, ctx.param('handle'));
    if (!target) throw notFound();
    const { dream, role } = await loadVisibleDream(ctx.sql, id, viewer);
    if (target.id !== viewer.id && !role.isOwner) throw forbidden('owner_only');
    if (toApiPhase(dream.phase) === 'floraison') throw unprocessable('floraison_locked', 'Credits of a completed Dream are preserved.');
    if(await ctx.sql.exists("SELECT 1 FROM dream_need_invitations WHERE dream_id=? AND invited_user_id=? AND status IN ('pending','accepted')",id,target.id))
      throw conflict('active_talent_invitation','Retire cette personne depuis sa demande de talent pour lui envoyer une notification.');

    try {
      await ctx.sql.batch([
        ctx.sql.stmt("UPDATE dream_help_offers SET status='declined',responded_at=CURRENT_TIMESTAMP,responded_by=? WHERE dream_id=? AND offered_by=? AND status='accepted'", viewer.id, id, target.id),
        ctx.sql.stmt("UPDATE dream_collaborators SET status='removed' WHERE dream_id=? AND user_id=? AND status IN ('invited','offered','accepted')", id, target.id),
        ...releaseCollaboratorStmts(ctx, id, target.id),
        auditStmt(ctx.sql, viewer.id, 'collaborator_removed', 'dream', id, ctx.requestId, { target: target.id }),
      ]);
    } catch (e) { mapSqlError(e); }
    return { removed: true };
  });

  const participants = async (ctx: Ctx, legacy: boolean) => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { role } = await loadVisibleDream(ctx.sql, id, viewer);
    const same = await ctx.sql.all<{ user_id: string; created_at: string }>("SELECT s.user_id,s.created_at FROM dream_same_dream s JOIN users u ON u.id=s.user_id AND u.account_status='active' WHERE s.dream_id=? ORDER BY s.created_at DESC LIMIT 100", id);
    if (legacy) {
      if (!role.isOwner) throw forbidden('owner_only');
      const rows = await ctx.sql.all("SELECT u.id,u.handle,u.display_name FROM dream_same_dream s JOIN users u ON s.user_id=u.id WHERE s.dream_id=? AND u.account_status='active' ORDER BY s.created_at DESC LIMIT 100", id);
      return { dreamId: id, participants: rows };
    }
    const people = await authorMap(ctx, same.map(s => s.user_id));
    return { sameDreamCount: same.length, ...(role.isOwner ? { sameDream: same.map(s => ({ ...people.get(s.user_id), since: iso(s.created_at) })) } : {}) };
  };
  r.add('GET', '/api/dreams/:id/participants', { tag: 'Roles', summary: '“Moi aussi” participants (list visible to owners only; count public)', auth: 'required' }, ctx => participants(ctx, false));
  r.add('GET', '/v1/dreams/:id/participants', { tag: 'Roles', summary: 'Legacy owner-only participant list (OAuth prototype contract)', auth: 'required' }, ctx => participants(ctx, true));

  // ---------------------------------------------------------------- Moi aussi & encouragement
  const toggle = (table: 'dream_same_dream' | 'dream_encouragements', action: 'same-dream' | 'encourage', on: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream, role } = await loadVisibleDream(ctx.sql, id, viewer);
    if (on) {
      if (role.isOwner) throw unprocessable('own_dream');
      if (!allows('dream', action, toApiPhase(dream.phase))) throw unprocessable('action_not_allowed_for_phase');
      await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
      await ctx.sql.run(`INSERT OR IGNORE INTO ${table}(dream_id,user_id) VALUES(?,?)`, id, viewer.id);
    } else {
      await ctx.sql.run(`DELETE FROM ${table} WHERE dream_id=? AND user_id=?`, id, viewer.id);
    }
    if (table === 'dream_same_dream') {
      const n = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM dream_same_dream WHERE dream_id=?', id);
      return { sameDream: on, sameDreamCount: n?.n ?? 0 };
    }
    // Encouragement totals are never returned to the encourager.
    return { encouraged: on };
  };
  r.add('POST', '/api/dreams/:id/same-dream', { tag: 'Reactions', summary: '“Moi aussi” (public count; never grants a role)', auth: 'required' }, toggle('dream_same_dream', 'same-dream', true));
  r.add('DELETE', '/api/dreams/:id/same-dream', { tag: 'Reactions', summary: 'Undo “Moi aussi”', auth: 'required' }, toggle('dream_same_dream', 'same-dream', false));
  r.add('POST', '/api/dreams/:id/encouragements', { tag: 'Reactions', summary: 'Encourage (count visible to accepted owners only)', auth: 'required' }, toggle('dream_encouragements', 'encourage', true));
  r.add('DELETE', '/api/dreams/:id/encouragements', { tag: 'Reactions', summary: 'Withdraw encouragement', auth: 'required' }, toggle('dream_encouragements', 'encourage', false));
  r.add('GET', '/api/dreams/:id/encouragements', { tag: 'Reactions', summary: 'Encouragement count (accepted owners only)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await requireDreamOwner(ctx.sql, ctx.param('id'), viewer);
    const n = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM dream_encouragements WHERE dream_id=?', ctx.param('id'));
    return { count: n?.n ?? 0 };
  });

  // ---------------------------------------------------------------- journal
  r.add('POST', '/api/dreams/:id/entries', { tag: 'Journal', summary: 'Add a note, an inspiration addition or a dated progress entry (owners)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream } = await requireDreamOwner(ctx.sql, id, viewer);
    const v = new V(await ctx.body());
    const type = v.oneOf('type', ['note', 'addition', 'progress'] as const, { required: true });
    const body = v.str('body', { required: true, max: 5000 });
    const entryDate = v.date('entryDate', { nullable: true });
    const visibility = v.oneOf('visibility', ['owners', 'participants', 'public'] as const);
    v.done();
    const phase = toApiPhase(dream.phase);
    if (!ENTRY_TYPES_BY_PHASE[phase].includes(type!)) throw unprocessable('entry_not_allowed_for_phase');
    const entryId = newId();
    try {
      await ctx.sql.run(
        'INSERT INTO dream_entries(id,dream_id,author_id,entry_type,body,entry_date,visibility) VALUES(?,?,?,?,?,?,?)',
        entryId, id, viewer.id, type === 'progress' ? 'progress_comment' : type!, body!, entryDate ?? null, visibility ?? (type === 'progress' ? 'public' : 'owners'),
      );
    } catch (e) { mapSqlError(e); }
    return { id: entryId };
  });

  r.add('PATCH', '/api/entries/:id', { tag: 'Journal', summary: 'Edit my journal entry (frozen once the Dream reaches Floraison)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const entry = await ctx.sql.first<{ id: string; dream_id: string; author_id: string; entry_type: string; phase: string }>('SELECT e.id,e.dream_id,e.author_id,e.entry_type,d.phase FROM dream_entries e JOIN dreams d ON d.id=e.dream_id WHERE e.id=? AND e.deleted_at IS NULL', ctx.param('id'));
    if (!entry || entry.author_id !== viewer.id) throw notFound();
    if (entry.phase === 'testimony' || entry.entry_type === 'testimony') throw unprocessable('floraison_locked');
    const v = new V(await ctx.body());
    const body = v.str('body', { max: 5000, min: 1 });
    const entryDate = v.date('entryDate', { nullable: true });
    const visibility = v.oneOf('visibility', ['owners', 'participants', 'public'] as const);
    v.done();
    await ctx.sql.run(
      'UPDATE dream_entries SET body=coalesce(?,body),entry_date=CASE WHEN ? THEN ? ELSE entry_date END,visibility=coalesce(?,visibility),edited_at=CURRENT_TIMESTAMP WHERE id=?',
      body ?? null, entryDate !== undefined ? 1 : 0, entryDate ?? null, visibility ?? null, entry.id,
    );
    return { updated: true };
  });

  r.add('DELETE', '/api/entries/:id', { tag: 'Journal', summary: 'Delete my journal entry', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const changed = await ctx.sql.run("UPDATE dream_entries SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND author_id=? AND entry_type<>'testimony' AND deleted_at IS NULL", ctx.param('id'), viewer.id);
    if (!changed) throw notFound();
    return { deleted: true };
  });

  r.add('GET', '/api/dreams/:id/entries', { tag: 'Journal', summary: 'Journal entries visible to me', auth: 'optional' }, async ctx => {
    const detail = (await dreamDetail(ctx, ctx.param('id'))) as { dream: { entries: unknown } };
    return { items: detail.dream.entries };
  });

  // ---------------------------------------------------------------- habits & milestones
  const insiderOnly = async (ctx: Ctx, dreamId: string, viewer: Viewer) => {
    const loaded = await loadVisibleDream(ctx.sql, dreamId, viewer);
    if (!loaded.role.isOwner && !loaded.role.isCollaborator) throw forbidden('participants_only');
    return loaded;
  };

  r.add('GET', '/api/dreams/:id/habits', { tag: 'Journal', summary: 'Croissance habits with check-ins (owners and collaborators)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await insiderOnly(ctx, id, viewer);
    const habits = await ctx.sql.all<{ id: string; title: string; frequency: string; created_at: string }>('SELECT id,title,frequency,created_at FROM dream_habits WHERE dream_id=? AND archived_at IS NULL ORDER BY created_at', id);
    const checks = habits.length ? await ctx.sql.all<{ habit_id: string; day: string }>(`SELECT habit_id,day FROM dream_habit_checks WHERE habit_id IN (${marks(habits.length)}) ORDER BY day`, ...habits.map(h => h.id)) : [];
    return { items: habits.map(h => ({ id: h.id, title: h.title, frequency: h.frequency, completed: checks.filter(c => c.habit_id === h.id).map(c => c.day), createdAt: iso(h.created_at) })) };
  });

  r.add('POST', '/api/dreams/:id/habits', { tag: 'Journal', summary: 'Add a habit (Croissance, owners)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream } = await requireDreamOwner(ctx.sql, id, viewer);
    if (toApiPhase(dream.phase) !== 'croissance') throw unprocessable('action_not_allowed_for_phase');
    const v = new V(await ctx.body());
    const title = v.str('title', { required: true, max: 120 });
    const frequency = v.oneOf('frequency', ['daily', 'weekly'] as const, { required: true });
    v.done();
    const habitId = newId();
    await ctx.sql.run('INSERT INTO dream_habits(id,dream_id,title,frequency,created_by) VALUES(?,?,?,?,?)', habitId, id, title!, frequency!, viewer.id);
    return { id: habitId };
  });

  const habitOf = async (ctx: Ctx, habitId: string, viewer: Viewer) => {
    const h = await ctx.sql.first<{ id: string; dream_id: string }>('SELECT id,dream_id FROM dream_habits WHERE id=? AND archived_at IS NULL', habitId);
    if (!h) throw notFound();
    const { dream } = await requireDreamOwner(ctx.sql, h.dream_id, viewer);
    if (toApiPhase(dream.phase) !== 'croissance') throw unprocessable('action_not_allowed_for_phase');
    return h;
  };
  r.add('POST', '/api/habits/:id/checks', { tag: 'Journal', summary: 'Check a habit for a day', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const h = await habitOf(ctx, ctx.param('id'), viewer);
    const v = new V(await ctx.body());
    const day = v.date('day', { required: true });
    v.done();
    await ctx.sql.run('INSERT OR IGNORE INTO dream_habit_checks(habit_id,day,checked_by) VALUES(?,?,?)', h.id, day!, viewer.id);
    return { checked: true, day };
  });
  r.add('DELETE', '/api/habits/:id/checks/:day', { tag: 'Journal', summary: 'Uncheck a habit day', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const h = await habitOf(ctx, ctx.param('id'), viewer);
    await ctx.sql.run('DELETE FROM dream_habit_checks WHERE habit_id=? AND day=?', h.id, ctx.param('day'));
    return { checked: false };
  });
  r.add('DELETE', '/api/habits/:id', { tag: 'Journal', summary: 'Archive a habit', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const h = await habitOf(ctx, ctx.param('id'), viewer);
    await ctx.sql.run('UPDATE dream_habits SET archived_at=CURRENT_TIMESTAMP WHERE id=?', h.id);
    return { archived: true };
  });

  r.add('GET', '/api/dreams/:id/milestones', { tag: 'Journal', summary: 'Milestones (owners and collaborators)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await insiderOnly(ctx, ctx.param('id'), viewer);
    const rows = await ctx.sql.all<{ id: string; title: string; due_date: string; done_at: string | null }>('SELECT id,title,due_date,done_at FROM dream_milestones WHERE dream_id=? ORDER BY due_date,created_at', ctx.param('id'));
    return { items: rows.map(m => ({ id: m.id, title: m.title, dueDate: m.due_date, done: !!m.done_at, doneAt: iso(m.done_at) })) };
  });
  r.add('POST', '/api/dreams/:id/milestones', { tag: 'Journal', summary: 'Add a dated milestone (owners)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    await requireDreamOwner(ctx.sql, id, viewer);
    const v = new V(await ctx.body());
    const title = v.str('title', { required: true, max: 120 });
    const dueDate = v.date('dueDate', { required: true });
    v.done();
    const milestoneId = newId();
    try {
      await ctx.sql.run('INSERT INTO dream_milestones(id,dream_id,title,due_date,created_by) VALUES(?,?,?,?,?)', milestoneId, id, title!, dueDate!, viewer.id);
    } catch (e) { mapSqlError(e); }
    return { id: milestoneId };
  });
  r.add('PATCH', '/api/milestones/:id', { tag: 'Journal', summary: 'Edit or complete a milestone', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ctx.sql.first<{ id: string; dream_id: string }>('SELECT id,dream_id FROM dream_milestones WHERE id=?', ctx.param('id'));
    if (!m) throw notFound();
    const { dream } = await requireDreamOwner(ctx.sql, m.dream_id, viewer);
    if (toApiPhase(dream.phase) === 'floraison') throw unprocessable('floraison_locked');
    const v = new V(await ctx.body());
    const title = v.str('title', { max: 120, min: 1 });
    const dueDate = v.date('dueDate');
    const done = v.bool('done');
    v.done();
    await ctx.sql.run(
      'UPDATE dream_milestones SET title=coalesce(?,title),due_date=coalesce(?,due_date),done_at=CASE WHEN ?=1 THEN coalesce(done_at,CURRENT_TIMESTAMP) WHEN ?=0 THEN NULL ELSE done_at END WHERE id=?',
      title ?? null, dueDate ?? null, done === undefined ? null : done ? 1 : 0, done === undefined ? null : done ? 1 : 0, m.id,
    );
    return { updated: true };
  });
  r.add('DELETE', '/api/milestones/:id', { tag: 'Journal', summary: 'Delete a milestone', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const m = await ctx.sql.first<{ id: string; dream_id: string }>('SELECT id,dream_id FROM dream_milestones WHERE id=?', ctx.param('id'));
    if (!m) throw notFound();
    const { dream } = await requireDreamOwner(ctx.sql, m.dream_id, viewer);
    if (toApiPhase(dream.phase) === 'floraison') throw unprocessable('floraison_locked');
    await ctx.sql.run('DELETE FROM dream_milestones WHERE id=?', m.id);
    return { deleted: true };
  });

  // ---------------------------------------------------------------- inspiration & fruit
  r.add('POST', '/api/dreams/:id/inspired-dreams', { tag: 'Inspiration', summary: 'Start my own Dream inspired by a Floraison (counts as Fruit)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const sourceId = ctx.param('id');
    const { dream: source, role } = await loadVisibleDream(ctx.sql, sourceId, viewer);
    if (toApiPhase(source.phase) !== 'floraison') throw unprocessable('action_not_allowed_for_phase', 'Only a Floraison can inspire a new Dream.');
    if (role.isOwner) throw unprocessable('own_dream');
    const body = await ctx.body();
    const input = parseCreate({ ...body, needs: undefined });
    const pub = await ctx.sql.first<{ id: string }>("SELECT id FROM publications WHERE dream_id=? AND type='dream' AND deleted_at IS NULL", sourceId);
    const newDreamId = await createDream(ctx, viewer, { ...input, inspiredByPublicationId: pub?.id ?? null, lineageFromDreamId: sourceId });
    await ctx.sql.batch((await ownersOf(ctx, sourceId)).map(o => notifyStmt(ctx.sql, { userId: o.user_id, type: 'dream.inspired', category: 'dreams', actorId: viewer.id, entityType: 'dream', entityId: sourceId, params: { dream: source.title, inspired: input.title }, dedupeKey: `inspired:${sourceId}:${newDreamId}` })));
    return dreamDetail(ctx, newDreamId);
  });

  r.add('GET', '/api/dreams/:id/inspirations', { tag: 'Inspiration', summary: 'Fruit count and the visible Dreams this one inspired', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    const id = ctx.param('id');
    await loadVisibleDream(ctx.sql, id, viewer);
    const children = await ctx.sql.all<{ id: string }>(
      "SELECT p.id FROM dream_lineage l JOIN dreams c ON c.id=l.inspired_dream_id AND c.deleted_at IS NULL JOIN publications p ON p.dream_id=c.id AND p.type='dream' AND p.deleted_at IS NULL WHERE l.originating_dream_id=? ORDER BY l.created_at DESC LIMIT 50",
      id,
    );
    const total = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM dream_lineage l JOIN dreams c ON c.id=l.inspired_dream_id AND c.deleted_at IS NULL WHERE l.originating_dream_id=?', id);
    return { fruitCount: total?.n ?? 0, items: await itemsByPublicationIds(ctx, children.map(c => c.id)) };
  });

  r.add('POST', '/api/dreams/:id/inspirations', { tag: 'Inspiration', summary: 'Attach a visible publication as an inspiration of my Dream', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const id = ctx.param('id');
    const { dream } = await requireDreamOwner(ctx.sql, id, viewer);
    if (toApiPhase(dream.phase) === 'floraison') throw unprocessable('floraison_locked');
    const v = new V(await ctx.body());
    const publicationId = v.id('publicationId', { required: true });
    v.done();
    const visible = await itemsByPublicationIds(ctx, [publicationId!]);
    if (!visible.length) throw notFound('publication_not_found');
    await ctx.sql.run('INSERT OR IGNORE INTO dream_inspirations(dream_id,publication_id,added_by) VALUES(?,?,?)', id, publicationId!, viewer.id);
    return { attached: true };
  });

}
