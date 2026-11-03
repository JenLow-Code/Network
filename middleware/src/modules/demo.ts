import type { Router } from '../http/router';
import { notFound, badRequest } from '../http/errors';
import { includeDemo } from '../config/env';
import { phaseLabel, toApiPhase } from '../domain/phases';

/**
 * Compatibility with the separately deployed `jenlow-network-demo-api` Worker
 * (branch feature/network-demo-api-20261101). Same routes and fields, plus `phase_code` and
 * `phase_label`. Returns only fictional demo profiles (is_demo=1) and their public Dreams —
 * never live member data, emails or auth fields.
 */
const userFields = 'id, handle, display_name, bio, city, country_code, avatar_asset_key';
const dreamFields = 'id, title, summary, phase, visibility, created_by, cover_asset_key, created_at, updated_at, started_at, growing_at, completed_at, testimony_text';

const bounded = (raw: string | null, fallback: number, max: number) => {
  const n = Number(raw);
  return raw === null || !Number.isInteger(n) || n < 0 ? fallback : Math.min(n, max);
};
const withPhase = (d: Record<string, unknown>) => {
  const code = toApiPhase(String(d.phase));
  return { ...d, phase_code: code, phase_label: phaseLabel(code, 'fr') };
};

export function registerDemo(r: Router): void {
  const guard = (env: Parameters<typeof includeDemo>[0]) => {
    if (!includeDemo(env)) throw notFound();
  };

  r.add('GET', '/api/demo/users', { tag: 'Demo', summary: 'Fictional demo profiles with their public Dreams', auth: 'none' }, async ctx => {
    guard(ctx.env);
    const limit = bounded(ctx.query('limit'), 20, 50), offset = bounded(ctx.query('offset'), 0, 1000);
    const users = await ctx.sql.all<Record<string, unknown> & { id: string }>(`SELECT ${userFields} FROM users WHERE is_demo=1 AND id LIKE 'demo-user-%' AND deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?`, limit, offset);
    const dreams = users.length ? await ctx.sql.all<Record<string, unknown> & { created_by: string }>(
      `SELECT ${dreamFields} FROM dreams WHERE deleted_at IS NULL AND visibility='public' AND id LIKE 'demo-dream-%' AND created_by IN (${users.map(() => '?').join(',')}) ORDER BY created_by, created_at DESC, id`,
      ...users.map(u => u.id),
    ) : [];
    return { users: users.map(u => ({ ...u, dreams: dreams.filter(d => d.created_by === u.id).map(withPhase) })), pagination: { limit, offset, returned: users.length } };
  });

  r.add('GET', '/api/demo/users/:id', { tag: 'Demo', summary: 'One demo profile and its Dreams', auth: 'none' }, async ctx => {
    guard(ctx.env);
    const id = ctx.param('id');
    if (!/^demo-user-\d{2}$/.test(id)) throw notFound();
    const user = await ctx.sql.first<Record<string, unknown>>(`SELECT ${userFields} FROM users WHERE id=? AND is_demo=1 AND deleted_at IS NULL`, id);
    if (!user) throw notFound();
    const dreams = await ctx.sql.all<Record<string, unknown>>(`SELECT ${dreamFields} FROM dreams WHERE deleted_at IS NULL AND visibility='public' AND id LIKE 'demo-dream-%' AND created_by=? ORDER BY created_at DESC, id`, id);
    return { user: { ...user, dreams: dreams.map(withPhase) } };
  });

  r.add('GET', '/api/demo/dreams', { tag: 'Demo', summary: 'Flat list of demo Dreams (?userId=demo-user-01)', auth: 'none' }, async ctx => {
    guard(ctx.env);
    const limit = bounded(ctx.query('limit'), 40, 100), offset = bounded(ctx.query('offset'), 0, 1000);
    const userId = ctx.query('userId');
    if (userId && !/^demo-user-\d{2}$/.test(userId)) throw badRequest('invalid_user_id');
    const rows = await ctx.sql.all<Record<string, unknown>>(
      `SELECT ${dreamFields} FROM dreams d WHERE d.deleted_at IS NULL AND d.visibility='public' AND d.id LIKE 'demo-dream-%'
         AND EXISTS(SELECT 1 FROM users u WHERE u.id=d.created_by AND u.is_demo=1) ${userId ? 'AND d.created_by=?' : ''}
       ORDER BY d.created_at DESC, d.id LIMIT ? OFFSET ?`,
      ...(userId ? [userId, limit, offset] : [limit, offset]),
    );
    return { dreams: rows.map(withPhase), pagination: { limit, offset, returned: rows.length } };
  });
}
