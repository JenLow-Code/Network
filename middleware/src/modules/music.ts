import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import type { D1PreparedStatement } from '../platform/cf';
import { includeDemo } from '../config/env';
import { V, type Obj } from '../http/validate';
import { conflict, forbidden, mapSqlError, notFound, unprocessable } from '../http/errors';
import { decodeCursor, pageLimit } from '../http/cursor';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId } from '../lib/util';
import { auditStmt, blockedBetween, userByHandle } from '../services/access';
import { feedPage, loadItem, authorMap } from '../services/feed';
import { notifyStmt } from '../services/notifications';
import { idempotent } from '../services/idempotency';
import { requireOwnedMedia, toMediaDTO } from './media';
import { json } from '../http/respond';
import { createDream, dreamDetail, parseCreate } from '../services/dreams';

type Credit = { displayName: string; contribution: string; handle?: string | null };
type TrackRow = { id: string; publication_id: string; publisher_id: string; rights_id: string; audio_asset_id: string | null; external_stream_url: string | null; cover_asset_id: string | null; withdrawn_at: string | null; title: string; adaptations_allowed: number; reviewed_status: string };

function parseCredits(v: V, field: string, required: boolean): Credit[] | undefined {
  return v.array(field, raw => {
    if (!raw || typeof raw !== 'object') return undefined;
    const c = new V(raw as Obj);
    const displayName = c.str('displayName', { required: true, max: 100 });
    const contribution = c.str('contribution', { required: true, max: 100 });
    const handle = c.str('handle', { max: 40, nullable: true });
    try { c.done(); } catch { return undefined; }
    return { displayName: displayName!, contribution: contribution!, handle };
  }, { required, max: 30 });
}

async function creditStatements(ctx: Ctx, table: 'music_contributors' | 'music_proposal_credits', ownerCol: string, ownerId: string, credits: Credit[], startAt = 0): Promise<D1PreparedStatement[]> {
  const stmts: D1PreparedStatement[] = [];
  for (const [i, c] of credits.entries()) {
    const user = c.handle ? await userByHandle(ctx.sql, c.handle) : null;
    const userCol = table === 'music_contributors' ? 'user_id' : 'contributor_id';
    stmts.push(ctx.sql.stmt(`INSERT INTO ${table}(${ownerCol},credit_order,${userCol},display_name,contribution) VALUES(?,?,?,?,?)`, ownerId, startAt + i, user?.account_status === 'active' ? user.id : null, c.displayName, c.contribution));
  }
  return stmts;
}

async function trackByPublication(ctx: Ctx, publicationId: string): Promise<TrackRow> {
  const t = await ctx.sql.first<TrackRow>(
    `SELECT t.*,p.title,r.adaptations_allowed,r.reviewed_status FROM music_tracks t JOIN publications p ON p.id=t.publication_id AND p.deleted_at IS NULL
     JOIN music_rights r ON r.id=t.rights_id WHERE t.publication_id=?`,
    publicationId,
  );
  if (!t) throw notFound();
  return t;
}

/** Requires the viewer may see the track (same rules as Discovery). */
async function visibleTrack(ctx: Ctx, publicationId: string): Promise<TrackRow> {
  const item = await loadItem(ctx, publicationId, { includeDemo: true });
  if (!item || item.type !== 'music') throw notFound();
  return trackByPublication(ctx, publicationId);
}

export function registerMusic(r: Router): void {
  r.add('GET', '/api/music', { tag: 'Music', summary: 'Music hub feed (cassette cards), newest first', auth: 'optional' }, async ctx => {
    const viewer = await ctx.viewer();
    return feedPage(ctx, { viewer, cursor: decodeCursor(ctx.query('cursor')), limit: pageLimit(ctx.query('limit')), types: ['music'], includeDemo: includeDemo(ctx.env) });
  });

  r.add('POST', '/api/music', { tag: 'Music', summary: 'Publish a track with a rights declaration and credits (never downloadable)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'write', viewer.id, LIMITS.write);
    const body = await ctx.body();
    const v = new V(body);
    const title = v.str('title', { required: true, min: 1, max: 120 });
    const description = v.str('description', { max: 2000, nullable: true });
    const songAuthor = v.str('songAuthor', { max: 120, nullable: true });
    const audioMediaId = v.id('audioMediaId', { nullable: true });
    const externalStreamUrl = v.url('externalStreamUrl', { nullable: true });
    const coverMediaId = v.id('coverMediaId', { nullable: true });
    const durationMs = v.int('durationMs', { min: 0, max: 3 * 3600 * 1000, nullable: true });
    const visibility = v.oneOf('visibility', ['public', 'members', 'private'] as const) ?? 'public';
    const rightsConfirmed = v.bool('rightsConfirmed', { required: true });
    const credits = parseCredits(v, 'credits', true);
    const lyrics = v.array('lyrics', raw => {
      const o = raw as Obj;
      return o && typeof o.time === 'number' && o.time >= 0 && typeof o.text === 'string' && o.text.length <= 300 ? { time: o.time, text: o.text } : undefined;
    }, { max: 400 });
    const rights = (body.rights && typeof body.rights === 'object' ? body.rights : {}) as Obj;
    const rv = new V(rights);
    const originalCreatorName = rv.str('originalCreatorName', { required: true, max: 120 });
    const rightsHolderName = rv.str('rightsHolderName', { required: true, max: 120 });
    const licenseType = rv.oneOf('licenseType', ['own_work', 'explicit_permission', 'open_license', 'other'] as const, { required: true });
    const originalSourceUrl = rv.url('originalSourceUrl', { nullable: true });
    const permissionEvidenceRef = rv.str('permissionEvidenceRef', { max: 500, nullable: true });
    const attributionText = rv.str('attributionText', { required: true, max: 500 });
    const adaptationsAllowed = rv.bool('adaptationsAllowed');
    try { rv.done(); } catch (e) { (e as { details?: { field?: string }[] }).details?.forEach(d => v.addError('rights.' + (d.field || ''), 'invalid')); }
    v.done();
    if (!rightsConfirmed) throw unprocessable('rights_confirmation_required', 'Confirm you hold the rights or permissions to share this recording.');
    if (!audioMediaId && !externalStreamUrl) throw unprocessable('audio_required');
    if (licenseType !== 'own_work' && !originalSourceUrl && !permissionEvidenceRef) throw unprocessable('rights_evidence_required', 'Name the source or the permission you hold for music that is not your own work.');
    if (audioMediaId) await requireOwnedMedia(ctx.sql, audioMediaId, viewer.id, ['audio']);
    if (coverMediaId) await requireOwnedMedia(ctx.sql, coverMediaId, viewer.id, ['image']);
    const rightsId = newId(), pubId = newId(), trackId = newId();
    const stmts: D1PreparedStatement[] = [
      ctx.sql.stmt(
        `INSERT INTO music_rights(id,publisher_id,original_creator_name,rights_holder_name,original_source_url,license_type,permission_evidence_ref,attribution_text,adaptations_allowed,reviewed_status)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        rightsId, viewer.id, originalCreatorName!, rightsHolderName!, originalSourceUrl ?? null, licenseType!, permissionEvidenceRef ?? null, attributionText!,
        adaptationsAllowed === false ? 0 : 1, licenseType === 'own_work' ? 'approved' : 'pending',
      ),
      ctx.sql.stmt("INSERT INTO publications(id,type,author_id,title,cover_asset_id,visibility) VALUES(?,'music',?,?,?,?)", pubId, viewer.id, title!, coverMediaId ?? null, visibility),
      ctx.sql.stmt(
        'INSERT INTO music_tracks(id,publication_id,publisher_id,audio_asset_id,external_stream_url,cover_asset_id,rights_id,duration_ms,description,song_author,lyrics_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        trackId, pubId, viewer.id, audioMediaId ?? null, externalStreamUrl ?? null, coverMediaId ?? null, rightsId, durationMs ?? null, description ?? null, songAuthor ?? null, lyrics ? JSON.stringify(lyrics) : null,
      ),
      ...(await creditStatements(ctx, 'music_contributors', 'track_id', trackId, credits!)),
      auditStmt(ctx.sql, viewer.id, 'music_published', 'publication', pubId, ctx.requestId, { licenseType }),
    ];
    try { await ctx.sql.batch(stmts); } catch (e) { mapSqlError(e); }
    return json({ item: await loadItem(ctx, pubId, { includeDemo: true }) }, 201, { Location: `/api/music/${pubId}` });
  });

  r.add('GET', '/api/music/:id', { tag: 'Music', summary: 'Music detail (publication id) with lyrics supplied by the artist', auth: 'optional' }, async ctx => {
    const t = await visibleTrack(ctx, ctx.param('id'));
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    const lyrics = await ctx.sql.first<{ lyrics_json: string | null }>('SELECT lyrics_json FROM music_tracks WHERE id=?', t.id);
    return { item: { ...item, lyrics: lyrics?.lyrics_json ? JSON.parse(lyrics.lyrics_json) : [] } };
  });

  r.add('GET', '/api/music/:id/playback', { tag: 'Music', summary: 'Short-lived streaming URL (inline playback only; no download endpoint exists)', auth: 'optional' }, async ctx => {
    const t = await visibleTrack(ctx, ctx.param('id'));
    if (t.withdrawn_at) throw notFound();
    const media = t.audio_asset_id ? await toMediaDTO(ctx, await ctx.sql.first('SELECT * FROM media_assets WHERE id=?', t.audio_asset_id)) : null;
    const appAsset = media?.url?.startsWith('app-asset:') ? media.url.slice(10) : null;
    const url = appAsset ? null : media?.url ?? t.external_stream_url ?? null;
    if (!url && !appAsset) throw unprocessable('playback_unavailable', 'The audio file is not uploaded yet.');
    return { url, appAsset, mimeType: media?.mimeType ?? null, durationMs: media?.durationMs ?? null, downloadable: false };
  });

  r.add('PATCH', '/api/music/:id', { tag: 'Music', summary: 'Edit description, lyrics, cover or visibility (publisher)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const t = await trackByPublication(ctx, ctx.param('id'));
    if (t.publisher_id !== viewer.id) throw notFound();
    const v = new V(await ctx.body());
    const description = v.str('description', { max: 2000, nullable: true });
    const coverMediaId = v.id('coverMediaId', { nullable: true });
    const visibility = v.oneOf('visibility', ['public', 'members', 'private'] as const);
    const lyrics = v.array('lyrics', raw => {
      const o = raw as Obj;
      return o && typeof o.time === 'number' && typeof o.text === 'string' && o.text.length <= 300 ? { time: o.time, text: o.text } : undefined;
    }, { max: 400 });
    v.done();
    if (coverMediaId) await requireOwnedMedia(ctx.sql, coverMediaId, viewer.id, ['image']);
    await ctx.sql.batch([
      ctx.sql.stmt('UPDATE music_tracks SET description=CASE WHEN ? THEN ? ELSE description END,lyrics_json=coalesce(?,lyrics_json),cover_asset_id=CASE WHEN ? THEN ? ELSE cover_asset_id END WHERE id=?',
        description !== undefined ? 1 : 0, description ?? null, lyrics ? JSON.stringify(lyrics) : null, coverMediaId !== undefined ? 1 : 0, coverMediaId ?? null, t.id),
      ctx.sql.stmt('UPDATE publications SET visibility=coalesce(?,visibility),cover_asset_id=CASE WHEN ? THEN ? ELSE cover_asset_id END,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        visibility ?? null, coverMediaId !== undefined ? 1 : 0, coverMediaId ?? null, t.publication_id),
    ]);
    return { item: await loadItem(ctx, t.publication_id, { includeDemo: true }) };
  });

  r.add('DELETE', '/api/music/:id', { tag: 'Music', summary: 'Delete my track (soft delete)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const t = await trackByPublication(ctx, ctx.param('id'));
    if (t.publisher_id !== viewer.id) throw notFound();
    await ctx.sql.batch([
      ctx.sql.stmt('UPDATE publications SET deleted_at=CURRENT_TIMESTAMP WHERE id=?', t.publication_id),
      auditStmt(ctx.sql, viewer.id, 'music_deleted', 'publication', t.publication_id, ctx.requestId),
    ]);
    return { deleted: true };
  });

  r.add('POST', '/api/music/:id/withdraw', { tag: 'Music', summary: 'Withdraw a track (rights revoked): hidden everywhere and adaptations closed', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const t = await trackByPublication(ctx, ctx.param('id'));
    if (t.publisher_id !== viewer.id) throw notFound();
    await ctx.sql.batch([
      ctx.sql.stmt('UPDATE music_tracks SET withdrawn_at=CURRENT_TIMESTAMP WHERE id=? AND withdrawn_at IS NULL', t.id),
      ctx.sql.stmt("UPDATE music_rights SET reviewed_status='revoked' WHERE id=?", t.rights_id),
      ctx.sql.stmt("UPDATE music_collab_proposals SET status='withdrawn',responded_at=CURRENT_TIMESTAMP WHERE original_track_id=? AND status IN ('draft','submitted','accepted')", t.id),
      auditStmt(ctx.sql, viewer.id, 'music_withdrawn', 'publication', t.publication_id, ctx.requestId),
    ]);
    return { withdrawn: true };
  });

  r.add('POST', '/api/music/:id/inspired-dreams', { tag: 'Music', summary: 'Turn a music idea into my own linked Dream (the track stays a track)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const t = await visibleTrack(ctx, ctx.param('id'));
    const input = parseCreate({ ...(await ctx.body()), needs: undefined });
    const id = await createDream(ctx, viewer, { ...input, inspiredByPublicationId: t.publication_id });
    return json(await dreamDetail(ctx, id), 201, { Location: `/api/dreams/${id}` });
  });

  // ------------------------------------------------------------------ adaptation proposals
  r.add('POST', '/api/music/:id/proposals', { tag: 'Music', summary: 'Propose an audio adaptation (credits required; publisher decides)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
    const t = await visibleTrack(ctx, ctx.param('id'));
    if (t.publisher_id === viewer.id) throw unprocessable('own_track');
    if (t.withdrawn_at || !t.adaptations_allowed || t.reviewed_status === 'revoked' || t.reviewed_status === 'rejected') throw unprocessable('adaptations_closed');
    if (await blockedBetween(ctx.sql, viewer.id, t.publisher_id)) throw notFound();
    const v = new V(await ctx.body());
    const description = v.str('description', { required: true, max: 2000 });
    const audioMediaId = v.id('audioMediaId', { nullable: true });
    const externalAudioUrl = v.url('externalAudioUrl', { nullable: true });
    const submit = v.bool('submit') ?? true;
    const credits = parseCredits(v, 'credits', true);
    v.done();
    if (submit && !audioMediaId && !externalAudioUrl) throw unprocessable('audio_required');
    if (audioMediaId) await requireOwnedMedia(ctx.sql, audioMediaId, viewer.id, ['audio']);
    if (!credits!.length) throw unprocessable('credits_required');
    const id = newId();
    try {
      await ctx.sql.batch([
        ctx.sql.stmt('INSERT INTO music_collab_proposals(id,original_track_id,proposed_by,audio_asset_id,external_audio_url,description,status) VALUES(?,?,?,?,?,?,?)', id, t.id, viewer.id, audioMediaId ?? null, externalAudioUrl ?? null, description!, submit ? 'submitted' : 'draft'),
        ...(await creditStatements(ctx, 'music_proposal_credits', 'proposal_id', id, credits!)),
        ...(submit ? [notifyStmt(ctx.sql, { userId: t.publisher_id, type: 'music.proposal.received', category: 'music', actorId: viewer.id, entityType: 'music_proposal', entityId: id, params: { actor: viewer.displayName, track: t.title }, deepLink: `/music/${t.publication_id}`, dedupeKey: `proposal:${id}` })] : []),
      ]);
    } catch (e) { mapSqlError(e); }
    return { proposal: { id, status: submit ? 'submitted' : 'draft' } };
  });

  const proposalRow = async (ctx: Ctx, id: string) => {
    const p = await ctx.sql.first<{ id: string; original_track_id: string; proposed_by: string; audio_asset_id: string | null; external_audio_url: string | null; description: string; status: string; publisher_response: string | null; published_track_id: string | null; created_at: string; responded_at: string | null; publisher_id: string; publication_id: string; title: string; rights_id: string }>(
      `SELECT pr.*,t.publisher_id,t.publication_id,p.title,t.rights_id FROM music_collab_proposals pr JOIN music_tracks t ON t.id=pr.original_track_id JOIN publications p ON p.id=t.publication_id WHERE pr.id=?`,
      id,
    );
    if (!p) throw notFound();
    return p;
  };

  const listProposals = async (ctx: Ctx, viewer: Viewer, where: string, ...args: string[]) => {
    const rows = await ctx.sql.all<{ id: string; original_track_id: string; proposed_by: string; description: string; status: string; created_at: string; responded_at: string | null; publication_id: string; title: string; publisher_id: string; published_track_id: string | null }>(
      `SELECT pr.id,pr.original_track_id,pr.proposed_by,pr.description,pr.status,pr.created_at,pr.responded_at,t.publication_id,p.title,t.publisher_id,pr.published_track_id
       FROM music_collab_proposals pr JOIN music_tracks t ON t.id=pr.original_track_id JOIN publications p ON p.id=t.publication_id WHERE ${where} ORDER BY pr.created_at DESC LIMIT 100`,
      ...args,
    );
    const credits = rows.length ? await ctx.sql.all<{ proposal_id: string; credit_order: number; display_name: string; contribution: string }>(`SELECT proposal_id,credit_order,display_name,contribution FROM music_proposal_credits WHERE proposal_id IN (${rows.map(() => '?').join(',')}) ORDER BY credit_order`, ...rows.map(x => x.id)) : [];
    const people = await authorMap(ctx, rows.map(x => x.proposed_by));
    void viewer;
    return rows.map(x => ({
      id: x.id, trackPublicationId: x.publication_id, trackTitle: x.title, proposer: people.get(x.proposed_by), description: x.description, status: x.status,
      credits: credits.filter(c => c.proposal_id === x.id).map(c => ({ order: c.credit_order, displayName: c.display_name, contribution: c.contribution })),
      createdAt: iso(x.created_at), respondedAt: iso(x.responded_at), publishedTrackId: x.published_track_id,
    }));
  };

  r.add('GET', '/api/music/:id/proposals', { tag: 'Music', summary: 'Proposals for a track (publisher sees all; proposers see their own)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const t = await trackByPublication(ctx, ctx.param('id'));
    if (t.publisher_id === viewer.id) return { items: await listProposals(ctx, viewer, "pr.original_track_id=? AND pr.status<>'draft'", t.id) };
    return { items: await listProposals(ctx, viewer, 'pr.original_track_id=? AND pr.proposed_by=?', t.id, viewer.id) };
  });

  r.add('GET', '/api/me/music-proposals', { tag: 'Music', summary: 'Proposals I sent (?role=sent) or received (?role=received)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    return ctx.query('role') === 'received'
      ? { items: await listProposals(ctx, viewer, "t.publisher_id=? AND pr.status<>'draft'", viewer.id) }
      : { items: await listProposals(ctx, viewer, 'pr.proposed_by=?', viewer.id) };
  });

  r.add('GET', '/api/music-proposals/:id/playback', { tag: 'Music', summary: 'Stream a proposal (publisher and proposer only)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const p = await proposalRow(ctx, ctx.param('id'));
    if (viewer.id !== p.publisher_id && viewer.id !== p.proposed_by) throw notFound();
    const media = p.audio_asset_id ? await toMediaDTO(ctx, await ctx.sql.first('SELECT * FROM media_assets WHERE id=?', p.audio_asset_id)) : null;
    return { url: media?.url ?? p.external_audio_url, downloadable: false };
  });

  const decide = (decision: 'accepted' | 'rejected') => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const p = await proposalRow(ctx, ctx.param('id'));
    if (p.publisher_id !== viewer.id) throw notFound();
    const v = new V(await ctx.optionalBody());
    const response = v.str('response', { max: 1000 });
    v.done();
    const changed = await ctx.sql.run("UPDATE music_collab_proposals SET status=?,publisher_response=?,responded_at=CURRENT_TIMESTAMP WHERE id=? AND status='submitted'", decision, response ?? null, p.id);
    if (!changed) throw conflict('proposal_not_submitted');
    await ctx.sql.batch([notifyStmt(ctx.sql, { userId: p.proposed_by, type: decision === 'accepted' ? 'music.proposal.accepted' : 'music.proposal.rejected', category: 'music', actorId: viewer.id, entityType: 'music_proposal', entityId: p.id, params: { track: p.title }, dedupeKey: `proposal-${decision}:${p.id}` })]);
    return { proposal: { id: p.id, status: decision } };
  };
  r.add('POST', '/api/music-proposals/:id/accept', { tag: 'Music', summary: 'Accept an adaptation (publisher)', auth: 'required' }, decide('accepted'));
  r.add('POST', '/api/music-proposals/:id/reject', { tag: 'Music', summary: 'Decline an adaptation (publisher)', auth: 'required' }, decide('rejected'));

  r.add('POST', '/api/music-proposals/:id/submit', { tag: 'Music', summary: 'Submit a draft proposal', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const p = await proposalRow(ctx, ctx.param('id'));
    if (p.proposed_by !== viewer.id) throw notFound();
    if (!p.audio_asset_id && !p.external_audio_url) throw unprocessable('audio_required');
    const changed = await ctx.sql.run("UPDATE music_collab_proposals SET status='submitted' WHERE id=? AND status='draft'", p.id);
    if (!changed) throw conflict('proposal_not_draft');
    await ctx.sql.batch([notifyStmt(ctx.sql, { userId: p.publisher_id, type: 'music.proposal.received', category: 'music', actorId: viewer.id, entityType: 'music_proposal', entityId: p.id, params: { actor: viewer.displayName, track: p.title }, dedupeKey: `proposal:${p.id}` })]);
    return { proposal: { id: p.id, status: 'submitted' } };
  });

  r.add('POST', '/api/music-proposals/:id/withdraw', { tag: 'Music', summary: 'Withdraw my proposal (before publication)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const p = await proposalRow(ctx, ctx.param('id'));
    if (p.proposed_by !== viewer.id) throw notFound();
    const changed = await ctx.sql.run("UPDATE music_collab_proposals SET status='withdrawn',responded_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('draft','submitted','accepted')", p.id);
    if (!changed) throw conflict('proposal_not_withdrawable');
    return { proposal: { id: p.id, status: 'withdrawn' } };
  });

  r.add('POST', '/api/music-proposals/:id/publish', { tag: 'Music', summary: 'Publish an accepted adaptation as a new track — original publisher only, all credits kept', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    return idempotent(ctx, viewer, 'proposal-publish:' + ctx.param('id'), async () => {
      const p = await proposalRow(ctx, ctx.param('id'));
      if (p.publisher_id !== viewer.id) throw forbidden('publisher_only', 'Only the original publisher can publish an adaptation.');
      if (p.status === 'published' && p.published_track_id) {
        const pub = await ctx.sql.first<{ publication_id: string }>('SELECT publication_id FROM music_tracks WHERE id=?', p.published_track_id);
        return { status: 200, body: { item: pub ? await loadItem(ctx, pub.publication_id, { includeDemo: true }) : null } };
      }
      if (p.status !== 'accepted') throw conflict('proposal_not_accepted');
      const original = await ctx.sql.first<{ original_creator_name: string; rights_holder_name: string; original_source_url: string | null; license_type: string; permission_evidence_ref: string | null; attribution_text: string; cover_asset_id: string | null }>(
        'SELECT r.*,t.cover_asset_id FROM music_rights r JOIN music_tracks t ON t.rights_id=r.id WHERE t.id=?', p.original_track_id,
      );
      const origCredits = await ctx.sql.all<{ user_id: string | null; display_name: string; contribution: string }>('SELECT user_id,display_name,contribution FROM music_contributors WHERE track_id=? ORDER BY credit_order', p.original_track_id);
      const propCredits = await ctx.sql.all<{ contributor_id: string | null; display_name: string; contribution: string }>('SELECT contributor_id,display_name,contribution FROM music_proposal_credits WHERE proposal_id=? ORDER BY credit_order', p.id);
      const allCredits = [...origCredits.map(c => ({ user: c.user_id, name: c.display_name, contribution: c.contribution })), ...propCredits.map(c => ({ user: c.contributor_id, name: c.display_name, contribution: c.contribution }))];
      const attribution = `${original!.attribution_text} — Adaptation : ${propCredits.map(c => `${c.display_name} (${c.contribution})`).join(', ')}`;
      const rightsId = newId(), pubId = newId(), trackId = newId();
      const stmts: D1PreparedStatement[] = [
        ctx.sql.stmt(
          `INSERT INTO music_rights(id,publisher_id,original_creator_name,rights_holder_name,original_source_url,license_type,permission_evidence_ref,attribution_text,adaptations_allowed,reviewed_status)
           VALUES(?,?,?,?,?,?,?,?,1,'approved')`,
          rightsId, viewer.id, original!.original_creator_name, original!.rights_holder_name, original!.original_source_url, original!.license_type, `proposal:${p.id}`, attribution.slice(0, 1000),
        ),
        ctx.sql.stmt("INSERT INTO publications(id,type,author_id,title,cover_asset_id,visibility) VALUES(?,'music',?,?,?,'public')", pubId, viewer.id, `${p.title} (adaptation)`, original!.cover_asset_id),
        // The trigger trg_music_repost_only_original_publisher re-checks publisher identity in SQL.
        ctx.sql.stmt('INSERT INTO music_tracks(id,publication_id,publisher_id,audio_asset_id,external_stream_url,cover_asset_id,rights_id,original_track_id,description) VALUES(?,?,?,?,?,?,?,?,?)',
          trackId, pubId, viewer.id, p.audio_asset_id, p.external_audio_url, original!.cover_asset_id, rightsId, p.original_track_id, p.description),
        ...allCredits.map((c, i) => ctx.sql.stmt('INSERT INTO music_contributors(track_id,credit_order,user_id,display_name,contribution) VALUES(?,?,?,?,?)', trackId, i, c.user, c.name, c.contribution)),
        ctx.sql.stmt("UPDATE music_collab_proposals SET status='published',published_track_id=? WHERE id=? AND status='accepted'", trackId, p.id),
        notifyStmt(ctx.sql, { userId: p.proposed_by, type: 'music.proposal.published', category: 'music', actorId: viewer.id, entityType: 'publication', entityId: pubId, params: { track: p.title }, deepLink: `/music/${pubId}`, dedupeKey: `proposal-published:${p.id}` }),
        auditStmt(ctx.sql, viewer.id, 'music_adaptation_published', 'publication', pubId, ctx.requestId, { proposal: p.id }),
      ];
      // A proposal's audio belongs to its proposer; publishing is the accepted, credited licence to stream it here.
      try { await ctx.sql.batch(stmts); } catch (e) { mapSqlError(e); }
      return { status: 201, body: { item: await loadItem(ctx, pubId, { includeDemo: true }) } };
    });
  });
}
