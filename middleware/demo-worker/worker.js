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
        return reply({ service: 'jenlow-network-demo-api', routes: ['/api/demo/users', '/api/demo/users/demo-user-01', '/api/demo/dreams', '/api/demo/music', '/health'] });
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

      if (path === '/api/demo/music') {
        // Isolated fiction-only, read-only UI previews; never return real member data.
        const { results: songs } = await env.DB.prepare(
          "SELECT p.id,p.title,u.display_name AS author,u.handle AS author_handle,d.talents_json,m.external_url AS demo_audio " +
          "FROM publications p JOIN users u ON u.id=p.author_id " +
          "JOIN music_tracks t ON t.publication_id=p.id " +
          "LEFT JOIN demo_music_requests d ON d.publication_id=p.id " +
          "LEFT JOIN media_assets m ON m.id=t.audio_asset_id " +
          "WHERE p.id LIKE 'demo-music-publication-%' AND u.id LIKE 'demo-user-%' " +
          "AND p.visibility='public' AND p.deleted_at IS NULL ORDER BY p.id"
        ).all();
        const { results: collaborations } = await env.DB.prepare(
          "SELECT pr.id,pr.description,pr.status,pr.created_at,p.id AS publication_id,p.title, " +
          "m.external_url AS contribution_audio,m.mime_type AS contribution_mime, " +
          "(SELECT pc.contribution FROM music_proposal_credits pc WHERE pc.proposal_id=pr.id ORDER BY CASE WHEN pc.contributor_id=pr.proposed_by THEN 0 ELSE 1 END,pc.credit_order LIMIT 1) AS contribution, " +
          "a.display_name AS author,a.handle AS author_handle, " +
          "c.display_name AS collaborator,c.handle AS collaborator_handle " +
          "FROM music_collab_proposals pr " +
          "JOIN music_tracks t ON t.id=pr.original_track_id " +
          "JOIN publications p ON p.id=t.publication_id " +
          "JOIN users a ON a.id=t.publisher_id JOIN users c ON c.id=pr.proposed_by " +
          "LEFT JOIN media_assets m ON m.id=pr.audio_asset_id AND m.owner_id=pr.proposed_by AND m.id LIKE 'demo-music-audio-%' " +
          "WHERE pr.id LIKE 'demo-music-proposal-%' AND pr.status='accepted' " +
          "AND p.id LIKE 'demo-music-publication-%' " +
          "AND a.id LIKE 'demo-user-%' AND c.id LIKE 'demo-user-%' ORDER BY pr.id"
        ).all();
        return reply({
          songs: songs.map(s => ({
            id:s.id,title:s.title,author:s.author,authorHandle:s.author_handle,
            requestedTalents:JSON.parse(s.talents_json || '[]'),
            sampleAsset:s.demo_audio?.startsWith('app-asset:') ? s.demo_audio.slice(10) : null,
            isDemo:true
          })),
          collaborations: collaborations.map(c => ({
            id:c.id,trackTitle:c.title,trackPublicationId:c.publication_id,
            description:c.description,status:c.status,
            createdAt:c.created_at?new Date(c.created_at.replace(' ','T')+(/Z$|[+-]\d\d:\d\d$/.test(c.created_at)?'':'Z')).toISOString():null,
            contribution:c.contribution||null,
            audioAsset:c.contribution_audio?.startsWith('app-asset:')?c.contribution_audio.slice(10):null,
            mimeType:c.contribution_mime||null,
            publisher:{displayName:c.author,handle:c.author_handle},
            proposer:{displayName:c.collaborator,handle:c.collaborator_handle},
            isDemo:true
          }))
        });
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
