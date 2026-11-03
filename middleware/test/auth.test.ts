import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, INVITE, ORIGIN, SECRET } from './helpers/app.ts';
// The script deployed today. Running it on the same database proves the TS port is compatible.
// @ts-expect-error plain JS module without types
import legacyWorker from '../src/worker-runtime.js';

const legacyCall = async (env: object, method: string, path: string, body?: unknown, token?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res: Response = await legacyWorker.fetch(new Request('https://legacy.test' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, body: await res.json() };
};

test('health keeps the smoke-test contract', async () => {
  const app = createApp();
  const res = await app.call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.auth, 'email-beta');
});

test('register requires invite code, 12+ char password and valid email (legacy error codes)', async () => {
  const app = createApp();
  const base = { displayName: 'Ruben', email: 'ruben@example.test', password: 'a long enough password' };
  assert.deepEqual((await app.call('POST', '/v1/auth/email/register', { body: { ...base, inviteCode: 'wrong' } })).body, { error: 'beta_invite_required' });
  assert.equal((await app.call('POST', '/v1/auth/email/register', { body: { ...base, password: 'short', inviteCode: INVITE } })).body.error, 'invalid_registration');
  assert.equal((await app.call('POST', '/v1/auth/email/register', { body: { ...base, email: 'nope', inviteCode: INVITE } })).body.error, 'invalid_registration');
  const ok = await app.call('POST', '/v1/auth/email/register', { body: { ...base, inviteCode: INVITE } });
  assert.equal(ok.status, 201);
  assert.ok(ok.body.session.accessToken && ok.body.session.refreshToken);
  assert.equal(ok.body.session.expiresIn, 900);
  const dup = await app.call('POST', '/v1/auth/email/register', { body: { ...base, inviteCode: INVITE } });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error, 'email_unavailable');
});

test('login, /v1/auth/me, /api/me resolve the same identity; wrong password and unknown email are 401', async () => {
  const app = createApp();
  const u = await app.register('Maria', 'maria@example.test');
  const login = await app.call('POST', '/v1/auth/email/login', { body: { email: 'MARIA@example.test ', password: 'correct horse battery staple' } });
  assert.equal(login.status, 200);
  const me = await app.call('GET', '/v1/auth/me', { token: login.body.session.accessToken });
  assert.equal(me.body.user.id, u.id);
  const apiMe = await app.call('GET', '/api/me', { token: login.body.session.accessToken });
  assert.equal(apiMe.body.user.id, u.id);
  assert.equal((await app.call('POST', '/v1/auth/email/login', { body: { email: 'maria@example.test', password: 'wrong password!!' } })).status, 401);
  assert.equal((await app.call('POST', '/v1/auth/email/login', { body: { email: 'no-account@example.invalid', password: 'unusable-test-password' } })).status, 401);
  assert.equal((await app.call('GET', '/v1/auth/me')).status, 401);
  assert.equal((await app.call('GET', '/api/me')).body.error.code, 'not_authenticated');
});

test('refresh tokens rotate and replay is rejected; logout revokes', async () => {
  const app = createApp();
  const u = await app.register('Isaiah');
  const r1 = await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: u.refresh } });
  assert.equal(r1.status, 200);
  assert.notEqual(r1.body.refreshToken, u.refresh);
  const replay = await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: u.refresh } });
  assert.equal(replay.status, 401);
  assert.equal((await app.call('POST', '/v1/auth/logout', { body: { refreshToken: r1.body.refreshToken } })).body.ok, true);
  assert.equal((await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: r1.body.refreshToken } })).status, 401);
});

test('deactivated, suspended and deleting accounts cannot sign in or use tokens', async () => {
  const app = createApp();
  const u = await app.register('Ruth', 'ruth@example.test');
  app.db.exec(`UPDATE users SET account_status='suspended' WHERE id='${u.id}'`);
  assert.equal((await app.call('GET', '/api/me', { token: u.token })).status, 401);
  assert.equal((await app.call('POST', '/v1/auth/email/login', { body: { email: 'ruth@example.test', password: 'correct horse battery staple' } })).status, 401);
  assert.equal((await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: u.refresh } })).status, 401);
});

test('forged, expired or foreign tokens are rejected', async () => {
  const app = createApp();
  const u = await app.register('Eve');
  const [h, p] = u.token.split('.');
  assert.equal((await app.call('GET', '/api/me', { token: `${h}.${p}.AAAA` })).status, 401);
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  const expired = Buffer.from(JSON.stringify({ ...payload, exp: 1 })).toString('base64url');
  assert.equal((await app.call('GET', '/api/me', { token: `${h}.${expired}.${u.token.split('.')[2]}` })).status, 401);
  const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  assert.equal((await app.call('GET', '/api/me', { token: `${none}.${p}.` })).status, 401);
});

test('interoperates with the deployed worker-runtime.js: same hashes, same tokens, same sessions', async () => {
  const app = createApp();
  const env = { DB: app.db, AUTH_JWT_SECRET: SECRET, BETA_INVITE_CODE: INVITE, ALLOWED_ORIGIN: ORIGIN };
  // Account created by the deployed runtime signs in through the new API…
  const legacyReg = await legacyCall(env, 'POST', '/v1/auth/email/register', { displayName: 'Legacy User', email: 'legacy@example.test', password: 'legacy password 123', inviteCode: INVITE });
  assert.equal(legacyReg.status, 201);
  const viaNew = await app.call('POST', '/v1/auth/email/login', { body: { email: 'legacy@example.test', password: 'legacy password 123' } });
  assert.equal(viaNew.status, 200);
  assert.equal(viaNew.body.user.id, legacyReg.body.user.id);
  // …a legacy access token works on the new API…
  assert.equal((await app.call('GET', '/api/me', { token: legacyReg.body.session.accessToken })).body.user.id, legacyReg.body.user.id);
  // …and an account/token from the new API works on the deployed runtime.
  const fresh = await app.register('New User', 'new@example.test');
  const legacyMe = await legacyCall(env, 'GET', '/v1/auth/me', undefined, fresh.token);
  assert.equal(legacyMe.status, 200);
  assert.equal(legacyMe.body.user.id, fresh.id);
  const legacyLogin = await legacyCall(env, 'POST', '/v1/auth/email/login', { email: 'new@example.test', password: 'correct horse battery staple' });
  assert.equal(legacyLogin.status, 200);
  // Refresh tokens rotate across implementations.
  const rotated = await legacyCall(env, 'POST', '/v1/auth/refresh', { refreshToken: fresh.refresh });
  assert.equal(rotated.status, 200);
  assert.equal((await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: rotated.body.refreshToken } })).status, 200);
});

test('CORS: allow-listed origin gets headers, others are refused, native (no Origin) is allowed', async () => {
  const app = createApp();
  const ok = await app.call('OPTIONS', '/api/discovery', { headers: { Origin: ORIGIN } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
  assert.match(ok.headers.get('access-control-allow-methods') || '', /PATCH/);
  const bad = await app.call('GET', '/api/discovery', { headers: { Origin: 'https://evil.example' } });
  assert.equal(bad.status, 403);
  assert.equal((await app.call('GET', '/api/discovery')).status, 200);
});

test('login is rate limited per IP', async () => {
  const app = createApp();
  let last = 0;
  for (let i = 0; i < 13; i++) last = (await app.call('POST', '/v1/auth/email/login', { body: { email: 'x@example.test', password: 'wrong wrong wrong' }, headers: { 'CF-Connecting-IP': '203.0.113.9' } })).status;
  assert.equal(last, 429);
});

test('errors use the /api envelope with requestId; unknown /api routes are 404', async () => {
  const app = createApp();
  const res = await app.call('GET', '/api/nope', { headers: { 'X-Request-Id': 'req-123' } });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'route_not_found');
  assert.equal(res.body.error.requestId, 'req-123');
  assert.equal(res.headers.get('x-request-id'), 'req-123');
  const wrongMethod = await app.call('DELETE', '/api/discovery');
  assert.equal(wrongMethod.status, 405);
});

test('misconfigured secret → 503 except /health', async () => {
  const app = createApp({ env: { AUTH_JWT_SECRET: 'short' } });
  assert.equal((await app.call('GET', '/health')).status, 200);
  assert.equal((await app.call('POST', '/v1/auth/email/login', { body: {} })).body.error, 'server_not_configured');
});

test('OpenAPI lists every route the router serves', async () => {
  const app = createApp();
  const res = await app.call('GET', '/api/openapi.json');
  const { router } = await import('../src/app.ts');
  const documented = Object.entries(res.body.paths as Record<string, Record<string, unknown>>).reduce((n, [, ops]) => n + Object.keys(ops).length, 0);
  assert.equal(documented, router.routes.length);
  assert.ok(router.routes.length > 150, 'expected the full API surface, got ' + router.routes.length);
});
