import type { Router } from '../http/router';
import type { Ctx } from '../http/context';
import { V, type Obj } from '../http/validate';
import { conflict, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { newId } from '../lib/util';
import { authorMap, loadItem } from '../services/feed';
import { talentTiles } from './profiles';
import { requireOwnedMedia } from './media';
import { asIllustration, levelLabel, parseLevel } from '../domain/talents';

function parseTalentFields(body: Obj, partial: boolean) {
  const v = new V(body);
  const rawLevel = body.level;
  const level = rawLevel === undefined ? undefined : parseLevel(rawLevel);
  if (rawLevel === undefined && !partial) v.addError('level', 'required');
  else if (rawLevel !== undefined && level === null) v.addError('level', 'invalid_level', 'expected 1..5');
  const out = {
    level: level ?? undefined,
    canTeach: v.bool('canTeach'),
    wantsToLearn: v.bool('wantsToLearn'),
    wantsTandem: v.bool('wantsTandem'),
    availableForProjects: v.bool('availableForProjects'),
    description: v.str('description', { max: 1000, nullable: true }),
    experience: v.str('experience', { max: 2000, nullable: true }),
    notes: v.str('notes', { max: 500, nullable: true }),
    illustration: body.illustration === null ? null : body.illustration === undefined ? undefined : asIllustration(body.illustration),
    visibility: v.oneOf('visibility', ['public', 'members', 'private'] as const),
    publish: v.bool('publish'),
  };
  if (body.illustration !== undefined && body.illustration !== null && out.illustration === null) v.addError('illustration', 'unknown_illustration');
  return { v, out };
}

/**
 * A showcase is a publication of type 'talent' plus a talent_publications row. Each member
 * talent has at most one: publishing again restores it instead of creating a duplicate.
 */
async function syncShowcase(ctx: Ctx, userId: string, talentId: string, publish: boolean | undefined, visibility: string | undefined | null) {
  const existing = await ctx.sql.first<{ publication_id: string }>('SELECT publication_id FROM talent_publications WHERE user_id=? AND talent_id=?', userId, talentId);
  if (publish === true) {
    if (existing) {
      await ctx.sql.run(
        'UPDATE publications SET deleted_at=NULL,visibility=coalesce(?,(SELECT visibility FROM user_talents WHERE user_id=? AND talent_id=?)),updated_at=CURRENT_TIMESTAMP WHERE id=?',
        visibility ?? null, userId, talentId, existing.publication_id,
      );
    } else {
      const id = newId();
      await ctx.sql.batch([
        ctx.sql.stmt(
          `INSERT INTO publications(id,type,author_id,title,visibility)
           SELECT ?,'talent',?,t.name,coalesce(?,ut.visibility) FROM user_talents ut JOIN talents t ON t.id=ut.talent_id WHERE ut.user_id=? AND ut.talent_id=?`,
          id, userId, visibility ?? null, userId, talentId,
        ),
        ctx.sql.stmt('INSERT INTO talent_publications(publication_id,user_id,talent_id) VALUES(?,?,?)', id, userId, talentId),
      ]);
    }
  } else if (publish === false && existing) {
    await ctx.sql.run('UPDATE publications SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL', existing.publication_id);
  }
  if (visibility && existing && publish !== true)
    await ctx.sql.run('UPDATE publications SET visibility=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', visibility, existing.publication_id);
}

export function registerTalents(r: Router): void {
  r.add('GET', '/api/talents', { tag: 'Talents', summary: 'Talent taxonomy (search with ?q=, filter ?category=)', auth: 'none' }, async ctx => {
    const q = (ctx.query('q') || '').trim();
    const category = ctx.query('category');
    const like = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
    const rows = await ctx.sql.all<{ id: string; name: string; slug: string | null; category: string; illustration: string | null }>(
      `SELECT id,name,slug,category,illustration FROM talents WHERE is_active=1 ${q ? "AND name LIKE ? ESCAPE '\\'" : ''} ${category ? 'AND category=?' : ''} ORDER BY category,name LIMIT 200`,
      ...[...(q ? [like] : []), ...(category ? [category] : [])],
    );
    return { items: rows };
  });

  r.add('GET', '/api/me/talents', { tag: 'Talents', summary: 'My talents (including private ones)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    return { items: await talentTiles(ctx, viewer.id, true) };
  });

  r.add('POST', '/api/me/talents', { tag: 'Talents', summary: 'Add a talent: level 1–5, give / learn / tandem, availability, optional showcase', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const body = await ctx.body();
    const { v, out } = parseTalentFields(body, false);
    const talentId = v.id('talentId', { required: true });
    v.done();
    if (!(await ctx.sql.exists('SELECT 1 FROM talents WHERE id=? AND is_active=1', talentId!))) throw unprocessable('talent_not_found');
    try {
      await ctx.sql.run(
        `INSERT INTO user_talents(user_id,talent_id,level,can_teach,wants_to_learn,wants_tandem,available_for_projects,notes,description,experience,illustration,visibility)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        viewer.id, talentId!, out.level!, out.canTeach ? 1 : 0, out.wantsToLearn ? 1 : 0, out.wantsTandem ? 1 : 0, out.availableForProjects ? 1 : 0,
        out.notes ?? null, out.description ?? null, out.experience ?? null, out.illustration ?? null, out.visibility ?? 'public',
      );
    } catch (e) {
      if (String(e).includes('UNIQUE') || String(e).includes('PRIMARY')) throw conflict('talent_exists');
      throw e;
    }
    await syncShowcase(ctx, viewer.id, talentId!, out.publish, out.visibility);
    return { items: await talentTiles(ctx, viewer.id, true) };
  });

  r.add('PATCH', '/api/me/talents/:talentId', { tag: 'Talents', summary: 'Edit one of my talents or publish/unpublish its showcase', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const talentId = ctx.param('talentId');
    if (!(await ctx.sql.exists('SELECT 1 FROM user_talents WHERE user_id=? AND talent_id=?', viewer.id, talentId))) throw notFound();
    const { v, out } = parseTalentFields(await ctx.body(), true);
    v.done();
    const cols: [string, unknown][] = [
      ['level', out.level], ['can_teach', out.canTeach === undefined ? undefined : out.canTeach ? 1 : 0], ['wants_to_learn', out.wantsToLearn === undefined ? undefined : out.wantsToLearn ? 1 : 0],
      ['wants_tandem', out.wantsTandem === undefined ? undefined : out.wantsTandem ? 1 : 0], ['available_for_projects', out.availableForProjects === undefined ? undefined : out.availableForProjects ? 1 : 0],
      ['description', out.description], ['experience', out.experience], ['notes', out.notes], ['illustration', out.illustration], ['visibility', out.visibility],
    ];
    const sets = cols.filter(([, val]) => val !== undefined);
    if (sets.length)
      await ctx.sql.run(`UPDATE user_talents SET ${sets.map(([c]) => c + '=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND talent_id=?`, ...sets.map(([, val]) => val as string | number | null), viewer.id, talentId);
    await syncShowcase(ctx, viewer.id, talentId, out.publish, out.visibility);
    return { items: await talentTiles(ctx, viewer.id, true) };
  });

  r.add('DELETE', '/api/me/talents/:talentId', { tag: 'Talents', summary: 'Remove one of my talents (and its showcase)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const talentId = ctx.param('talentId');
    // Deleting the talent removes its showcase detail; a trigger retires the publication from every feed.
    await ctx.sql.run('DELETE FROM user_talents WHERE user_id=? AND talent_id=?', viewer.id, talentId);
    return { items: await talentTiles(ctx, viewer.id, true) };
  });

  r.add('POST', '/api/me/talents/:talentId/media', { tag: 'Talents', summary: 'Attach a sample (image, audio or video) to my talent', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const talentId = ctx.param('talentId');
    if (!(await ctx.sql.exists('SELECT 1 FROM user_talents WHERE user_id=? AND talent_id=?', viewer.id, talentId))) throw notFound();
    const v = new V(await ctx.body());
    const mediaId = v.id('mediaId', { required: true });
    const caption = v.str('caption', { max: 200 });
    v.done();
    await requireOwnedMedia(ctx.sql, mediaId!, viewer.id, ['image', 'audio', 'video']);
    const count = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM user_talent_media WHERE user_id=? AND talent_id=?', viewer.id, talentId);
    if ((count?.n ?? 0) >= 6) throw conflict('too_many_samples');
    await ctx.sql.run('INSERT OR IGNORE INTO user_talent_media(user_id,talent_id,media_id,sort_order,caption) VALUES(?,?,?,?,?)', viewer.id, talentId, mediaId!, count?.n ?? 0, caption ?? null);
    return { items: await talentTiles(ctx, viewer.id, true) };
  });

  r.add('DELETE', '/api/me/talents/:talentId/media/:mediaId', { tag: 'Talents', summary: 'Remove a talent sample', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await ctx.sql.run('DELETE FROM user_talent_media WHERE user_id=? AND talent_id=? AND media_id=?', viewer.id, ctx.param('talentId'), ctx.param('mediaId'));
    return { removed: true };
  });

  r.add('GET', '/api/talent-posts/:id', { tag: 'Talents', summary: 'Talent showcase detail (same object as GET /api/publications/:id)', auth: 'optional' }, async ctx => {
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    if (!item || item.type !== 'talent') throw notFound();
    return { item };
  });

  const encourage = (on: boolean) => async (ctx: Ctx) => {
    const viewer = await ctx.user();
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    if (!item || item.type !== 'talent') throw notFound();
    if (on) {
      if (item.author.id === viewer.id) throw unprocessable('own_talent');
      await enforceLimit(ctx.sql, 'social', viewer.id, LIMITS.social);
      await ctx.sql.run('INSERT OR IGNORE INTO talent_encouragements(publication_id,user_id) VALUES(?,?)', item.id, viewer.id);
    } else {
      await ctx.sql.run('DELETE FROM talent_encouragements WHERE publication_id=? AND user_id=?', item.id, viewer.id);
    }
    return { encouraged: on };
  };
  r.add('POST', '/api/talent-posts/:id/encouragements', { tag: 'Talents', summary: 'Encourage a talent (count visible to its owner only)', auth: 'required' }, encourage(true));
  r.add('DELETE', '/api/talent-posts/:id/encouragements', { tag: 'Talents', summary: 'Withdraw talent encouragement', auth: 'required' }, encourage(false));

  r.add('GET', '/api/talent-search', { tag: 'Talents', summary: 'Find members by talent, minimum level and availability (transparent filters, self-reported levels)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'search', viewer.id, LIMITS.search);
    const talentId = ctx.query('talentId');
    if (!talentId) throw unprocessable('talent_required');
    const minLevel = parseLevel(Number(ctx.query('minLevel') || '1')) ?? 1;
    const availableOnly = ctx.query('available') === '1' || ctx.query('available') === 'true';
    const mode = ctx.query('mode'); // teach | learn | tandem
    const locale = await ctx.locale();
    const rows = await ctx.sql.all<{ user_id: string; level: number; available_for_projects: number; can_teach: number; wants_to_learn: number; wants_tandem: number }>(
      `SELECT ut.user_id,ut.level,ut.available_for_projects,ut.can_teach,ut.wants_to_learn,ut.wants_tandem FROM user_talents ut JOIN users u ON u.id=ut.user_id JOIN user_preferences p ON p.user_id=u.id
       WHERE ut.talent_id=?1 AND ut.level>=?2 AND ut.visibility IN ('public','members') AND u.account_status='active' AND p.discoverable=1 AND u.id<>?3
         ${availableOnly ? 'AND ut.available_for_projects=1' : ''}
         ${mode === 'teach' ? 'AND ut.can_teach=1' : mode === 'learn' ? 'AND ut.wants_to_learn=1' : mode === 'tandem' ? 'AND ut.wants_tandem=1' : ''}
         AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=?3 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=?3))
       ORDER BY ut.level DESC, ut.updated_at DESC LIMIT 50`,
      talentId, minLevel, viewer.id,
    );
    const people = await authorMap(ctx, rows.map(x => x.user_id));
    return {
      items: rows.map(x => ({ member: people.get(x.user_id), level: x.level, levelLabel: levelLabel(x.level, locale), availableForProjects: !!x.available_for_projects, canTeach: !!x.can_teach, wantsToLearn: !!x.wants_to_learn, wantsTandem: !!x.wants_tandem })),
      policy: 'Filtered by self-reported level and availability; ordered by level then recency. No inferred scores.',
    };
  });
}
