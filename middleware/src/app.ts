import type { Env } from './config/env';
import type { ExecutionContext } from './platform/cf';
import { MIN_SECRET_LENGTH, allowedOrigins } from './config/env';
import { Ctx } from './http/context';
import { Router } from './http/router';
import { ApiError } from './http/errors';
import { errorResponse, json, legacyError } from './http/respond';
import * as legacy from './auth/legacyRoutes';
import { registerMedia } from './modules/media';
import { registerProfiles } from './modules/profiles';
import { registerDreams } from './modules/dreams';
import { registerPublications } from './modules/publications';
import { registerTalents } from './modules/talents';
import { registerMusic } from './modules/music';
import { registerBible } from './modules/bible';
import { registerSocial } from './modules/social';
import { registerMessaging } from './modules/messaging';
import { registerAgenda } from './modules/agenda';
import { registerNotifications } from './modules/notifications';
import { registerModeration } from './modules/moderation';
import { registerDemo } from './modules/demo';
import { openApi } from './openapi';

export const API_VERSION = '1.0.0';

export function buildRouter(): Router {
  const r = new Router();
  r.add('GET', '/health', { tag: 'System', summary: 'Liveness (kept compatible with the beta smoke test)', auth: 'none' }, ctx => ({ status: 'ok', auth: 'email-beta', api: 'v1', version: ctx.env.APP_VERSION || API_VERSION }));
  r.add('GET', '/api/health/ready', { tag: 'System', summary: 'Readiness: D1 reachable and schema at 0012', auth: 'none' }, async ctx => {
    const tables = await ctx.sql.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','talent_publications')");
    const names = new Set(tables.map(t => t.name));
    const pubSql = (await ctx.sql.first<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type='table' AND name='publications'"))?.sql ?? '';
    const slug = (await ctx.sql.all<{ name: string }>("SELECT name FROM pragma_table_info('talents') WHERE name='slug'")).length > 0;
    const bible = await ctx.sql.exists("SELECT name FROM sqlite_master WHERE type='table' AND name='bible_editions'") && (await ctx.sql.exists("SELECT 1 FROM bible_editions WHERE id='edition-lsg1910'"));
    const schema = bible && slug ? '0012' : slug ? '0011' : names.has('talent_publications') ? '0010' : pubSql.includes("'talent'") ? '0009' : names.has('users') ? 'pre-0009' : 'missing';
    const ready = schema === '0012';
    return json({ status: ready ? 'ready' : 'degraded', db: 'ok', schema, media: ctx.env.MEDIA ? 'configured' : 'not_configured', push: 'not_configured', email: 'not_configured' }, ready ? 200 : 503);
  });
  r.add('GET', '/api/openapi.json', { tag: 'System', summary: 'This OpenAPI document', auth: 'none' }, () => openApi(r, API_VERSION));

  // Beta authentication (unchanged contract)
  r.add('POST', '/v1/auth/email/register', { tag: 'Auth', summary: 'Register with email, 12+ char password and beta invite code', auth: 'none', status: 201 }, legacy.register);
  r.add('POST', '/v1/auth/email/login', { tag: 'Auth', summary: 'Sign in with email and password', auth: 'none' }, legacy.login);
  r.add('POST', '/v1/auth/refresh', { tag: 'Auth', summary: 'Rotate the refresh token; returns a new access token', auth: 'none' }, legacy.refresh);
  r.add('GET', '/v1/auth/me', { tag: 'Auth', summary: 'Who am I (beta contract)', auth: 'required' }, legacy.me);
  r.add('POST', '/v1/auth/logout', { tag: 'Auth', summary: 'Revoke a refresh token', auth: 'none' }, legacy.logout);

  registerProfiles(r);
  registerDreams(r);
  registerPublications(r);
  registerTalents(r);
  registerMusic(r);
  registerBible(r);
  registerSocial(r);
  registerMessaging(r);
  registerAgenda(r);
  registerNotifications(r);
  registerMedia(r);
  registerModeration(r);
  registerDemo(r);
  return r;
}

const router = buildRouter();
const isLegacyPath = (path: string) => path.startsWith('/v1/auth/') || path === '/v1/account/deletion-request' || path.startsWith('/v1/dreams/');

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key,If-Match,X-Request-Id',
    'Access-Control-Expose-Headers': 'X-Request-Id,Location,Idempotent-Replay',
    'Access-Control-Max-Age': '600',
  };
}

export async function handle(request: Request, env: Env, exec?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const requestId = (request.headers.get('x-request-id') || request.headers.get('cf-ray') || crypto.randomUUID()).slice(0, 64);
  const origin = request.headers.get('origin');
  // CORS restricts browsers only; it is not authentication. Native apps send no Origin.
  const allowed = !!origin && allowedOrigins(env).includes(origin);
  const finish = (response: Response): Response => {
    const out = new Response(response.body, response);
    if (allowed && origin) for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
    out.headers.set('X-Request-Id', requestId);
    return out;
  };
  if (origin && !allowed) return finish(legacyError('origin_not_allowed', 403));
  if (request.method === 'OPTIONS') return finish(new Response(null, { status: 204 }));

  const legacyRoute = isLegacyPath(path);
  try {
    if (path !== '/health' && (!env.DB || !env.AUTH_JWT_SECRET || env.AUTH_JWT_SECRET.length < MIN_SECRET_LENGTH)) {
      return finish(legacyRoute ? legacyError('server_not_configured', 503) : errorResponse(new ApiError(503, 'server_not_configured'), requestId));
    }
    const match = router.match(request.method, path);
    if (!match) return finish(legacyRoute || !path.startsWith('/api') ? legacyError('not_found', 404) : errorResponse(new ApiError(404, 'route_not_found'), requestId));
    if ('allowed' in match) return finish(json({ error: { code: 'method_not_allowed', message: 'Allowed: ' + match.allowed.join(', '), requestId } }, 405, { Allow: match.allowed.join(', ') }));
    const ctx = new Ctx(request, env, exec, requestId);
    ctx.params = match.params;
    const result = await match.route.handler(ctx);
    if (result instanceof Response) return finish(result);
    return finish(json(result ?? {}, match.route.status ?? 200));
  } catch (error) {
    if (error instanceof ApiError) {
      return finish(legacyRoute ? legacyError(error.code, error.status) : errorResponse(error, requestId));
    }
    // Structured log without bodies, tokens or personal data.
    console.error(JSON.stringify({ level: 'error', requestId, method: request.method, path, error: error instanceof Error ? error.name + ': ' + error.message.slice(0, 300) : 'unknown' }));
    if (error instanceof Error && error.name === 'NotSupportedError') return finish(legacyError('password_auth_unavailable', 503));
    return finish(legacyRoute ? legacyError('server_error', 500) : errorResponse(new ApiError(500, 'internal_error', 'Unexpected server error.'), requestId));
  }
}

export { router };
