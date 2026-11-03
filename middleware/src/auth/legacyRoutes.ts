import type { Env } from '../config/env';
import type { Ctx } from '../http/context';
import { json, legacyError } from '../http/respond';
import { LIMITS, withinLimit } from '../http/rateLimit';
import { newId, sha256Hex, hex } from '../lib/util';
import { DUMMY_SALT, PASSWORD_ITERATIONS, derivePassword, sameDigest } from './password';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_DAYS, bearer, signAccessToken, verifyAccessToken } from './tokens';

/**
 * /v1/auth/* — behaviour-preserving TypeScript port of the deployed beta Worker
 * (middleware/src/worker-runtime.js). Same routes, payloads, status codes and
 * `{ "error": "code" }` responses, so the live smoke test and existing clients keep working.
 */
const validMail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 254;
const randomToken = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export async function createSession(userId: string, env: Env, clientType: 'app' | 'web' = 'app') {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO auth_sessions(id,user_id,refresh_token_hash,expires_at,client_type) VALUES(?,?,?,?,?)')
    .bind(newId(), userId, await sha256Hex(token), new Date(Date.now() + REFRESH_TTL_DAYS * 86400000).toISOString(), clientType)
    .run();
  return { accessToken: await signAccessToken(userId, env), refreshToken: token, expiresIn: ACCESS_TTL_SECONDS, tokenType: 'Bearer' };
}

const clientType = (request: Request): 'app' | 'web' => (request.headers.get('origin') ? 'web' : 'app');

export async function register(ctx: Ctx): Promise<Response> {
  const { env, request } = ctx;
  if (!(await withinLimit(ctx.sql, 'register', ctx.ip(), LIMITS.register))) return legacyError('rate_limited', 429);
  const b = await readJson(request);
  if (!b || typeof b.email !== 'string' || typeof b.password !== 'string' || typeof b.displayName !== 'string') return legacyError('bad_request');
  if (!validMail(b.email) || b.password.length < 12 || b.password.length > 128 || b.displayName.trim().length < 2 || b.displayName.length > 100)
    return legacyError('invalid_registration');
  if (!env.BETA_INVITE_CODE || b.inviteCode !== env.BETA_INVITE_CODE) return legacyError('beta_invite_required', 403);
  const email = b.email.trim().toLowerCase();
  if (await ctx.sql.exists('SELECT 1 FROM users WHERE email=?', email)) return legacyError('email_unavailable', 409);
  const uid = newId();
  const salt = randomToken(16);
  const hash = derivePassword(b.password, salt);
  const handle = 'jl_' + uid.replace(/-/g, '').slice(0, 15);
  const displayName = b.displayName.trim();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users(id,handle,display_name,email) VALUES(?,?,?,?)').bind(uid, handle, displayName, email),
      env.DB.prepare('INSERT INTO email_password_credentials(user_id,password_salt,password_hash,password_iterations) VALUES(?,?,?,?)').bind(uid, salt, hash, PASSWORD_ITERATIONS),
      env.DB.prepare('INSERT INTO user_preferences(user_id) VALUES(?)').bind(uid),
      env.DB.prepare("INSERT INTO auth_identities(id,user_id,provider,provider_subject) VALUES(?,?,'email',?)").bind(newId(), uid, uid),
    ]);
  } catch {
    return legacyError('registration_failed', 409);
  }
  return json({ user: { id: uid, email, displayName, handle }, session: await createSession(uid, env, clientType(request)) }, 201);
}

export async function login(ctx: Ctx): Promise<Response> {
  const { env, request } = ctx;
  if (!(await withinLimit(ctx.sql, 'login', ctx.ip(), LIMITS.login))) return legacyError('rate_limited', 429);
  const b = await readJson(request);
  if (!b || typeof b.email !== 'string' || typeof b.password !== 'string' || b.password.length > 128) return legacyError('invalid_credentials', 401);
  const row = await ctx.sql.first<{ id: string; email: string; display_name: string; handle: string; account_status: string; password_salt: string; password_hash: string; password_iterations: number }>(
    'SELECT u.id,u.email,u.display_name,u.handle,u.account_status,c.password_salt,c.password_hash,c.password_iterations FROM users u JOIN email_password_credentials c ON c.user_id=u.id WHERE u.email=?',
    b.email.toLowerCase().trim(),
  );
  // Always derive, even for unknown emails, so response timing does not reveal accounts.
  const check = derivePassword(b.password, row?.password_salt || DUMMY_SALT, row?.password_iterations || PASSWORD_ITERATIONS);
  if (!row || row.account_status !== 'active' || !sameDigest(check, row.password_hash)) return legacyError('invalid_credentials', 401);
  await ctx.sql.run("UPDATE auth_identities SET last_sign_in_at=CURRENT_TIMESTAMP WHERE user_id=? AND provider='email'", row.id);
  return json({ user: { id: row.id, email: row.email, displayName: row.display_name, handle: row.handle }, session: await createSession(row.id, env, clientType(request)) });
}

/** Rotating refresh: the old token works exactly once; replay of a used token is rejected. */
export async function refresh(ctx: Ctx): Promise<Response> {
  const b = await readJson(ctx.request);
  if (!b || typeof b.refreshToken !== 'string') return legacyError('invalid_refresh');
  const hashed = await sha256Hex(b.refreshToken);
  const row = await ctx.sql.first<{ id: string; user_id: string }>(
    "SELECT s.id,s.user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_token_hash=? AND s.revoked_at IS NULL AND datetime(s.expires_at)>datetime('now') AND u.account_status='active'",
    hashed,
  );
  if (!row) return legacyError('invalid_refresh', 401);
  const next = randomToken();
  const changed = await ctx.sql.run(
    'UPDATE auth_sessions SET refresh_token_hash=?,last_used_at=CURRENT_TIMESTAMP WHERE id=? AND refresh_token_hash=? AND revoked_at IS NULL',
    await sha256Hex(next), row.id, hashed,
  );
  if (changed !== 1) return legacyError('refresh_replayed', 401);
  return json({ accessToken: await signAccessToken(row.user_id, ctx.env), refreshToken: next, expiresIn: ACCESS_TTL_SECONDS, tokenType: 'Bearer' });
}

export async function me(ctx: Ctx): Promise<Response> {
  const token = bearer(ctx.request);
  const uid = token ? await verifyAccessToken(token, ctx.env) : null;
  if (!uid) return legacyError('not_authenticated', 401);
  const user = await ctx.sql.first<{ account_status: string }>('SELECT id,handle,display_name,email,account_status FROM users WHERE id=?', uid);
  return user?.account_status === 'active' ? json({ user }) : legacyError('not_authenticated', 401);
}

export async function logout(ctx: Ctx): Promise<Response> {
  const b = await readJson(ctx.request);
  if (!b || typeof b.refreshToken !== 'string') return legacyError('refresh_token_required');
  await ctx.sql.run('UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE refresh_token_hash=?', await sha256Hex(b.refreshToken));
  return json({ ok: true });
}
