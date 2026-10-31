// JenLow Network: read-only demo API. This TypeScript file uses JS-compatible syntax
// so it can also be deployed directly via the Cloudflare Workers upload API.
// It intentionally never reads real users or exposes email/auth data.
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=30',
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
function boundedNumber(raw, fallback, max) {
  const n = Number(raw);
  return raw === null || !Number.isInteger(n) || n < 0 ? fallback : Math.min(n, max);
}
const userFields = 'id, handle, display_name, bio, city, country_code, avatar_asset_key';
const dreamFields = 'id, title, summary, phase, visibility, created_by, cover_asset_key, created_at, updated_at, started_at, growing_at, completed_at, testimony_text';

async function dreamsByOwners(db, ids) {
  if (!ids.length) return new Map();
  const marks = ids.map(() => '?').join(',');
  const { results } = await db.prepare(
    'SELECT ' + dreamFields + ' FROM dreams WHERE deleted_at IS NULL AND visibility = \'public\' AND id LIKE \'demo-dream-%\' AND created_by IN (' + marks + ') ORDER BY created_by, created_at DESC, id'
  ).bind(...ids).all();
  const grouped = new Map(ids.map(id => [id, []]));
  for (const dream of results) grouped.get(dream.created_by)?.push(dream);
  return grouped;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    try {
      if (path === '/' || path === '/api/demo') {
        return reply({ service: 'jenlow-network-demo-api', routes: ['/api/demo/users', '/api/demo/users/demo-user-01', '/api/demo/dreams', '/health'] });
      }
      if (path === '/health') {
        const row = await env.DB.prepare('SELECT count(*) AS total FROM users WHERE id LIKE \'demo-user-%\' AND deleted_at IS NULL').first();
        return reply({ status: 'ok', demo_users: row?.total ?? 0 });
      }
      if (path === '/api/demo/users') {
        const limit = boundedNumber(url.searchParams.get('limit'), 20, 50);
        const offset = boundedNumber(url.searchParams.get('offset'), 0, 1000);
        const { results: users } = await env.DB.prepare(
          'SELECT ' + userFields + ' FROM users WHERE id LIKE \'demo-user-%\' AND deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();
        const grouped = await dreamsByOwners(env.DB, users.map(u => u.id));
        return reply({ users: users.map(u => ({ ...u, dreams: grouped.get(u.id) ?? [] })), pagination: { limit, offset, returned: users.length } });
      }
      const match = path.match(/^\/api\/demo\/users\/(demo-user-\d{2})$/);
      if (match) {
        const user = await env.DB.prepare(
          'SELECT ' + userFields + ' FROM users WHERE id = ? AND deleted_at IS NULL'
        ).bind(match[1]).first();
        if (!user) return reply({ error: 'not_found' }, 404);
        const grouped = await dreamsByOwners(env.DB, [user.id]);
        return reply({ user: { ...user, dreams: grouped.get(user.id) ?? [] } });
      }
      if (path === '/api/demo/dreams') {
        const limit = boundedNumber(url.searchParams.get('limit'), 40, 100);
        const offset = boundedNumber(url.searchParams.get('offset'), 0, 1000);
        const userId = url.searchParams.get('userId');
        if (userId && !/^demo-user-\d{2}$/.test(userId)) return reply({ error: 'invalid_user_id' }, 400);
        const where = 'WHERE deleted_at IS NULL AND visibility = \'public\' AND id LIKE \'demo-dream-%\'' + (userId ? ' AND created_by = ?' : '');
        const params = userId ? [userId, limit, offset] : [limit, offset];
        const { results } = await env.DB.prepare(
          'SELECT ' + dreamFields + ' FROM dreams ' + where + ' ORDER BY created_at DESC, id LIMIT ? OFFSET ?'
        ).bind(...params).all();
        return reply({ dreams: results, pagination: { limit, offset, returned: results.length } });
      }
      return reply({ error: 'not_found' }, 404);
    } catch (error) {
      console.error('Demo API query failed', error);
      return reply({ error: 'internal_server_error' }, 500);
    }
  },
};
