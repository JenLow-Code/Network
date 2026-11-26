import type { Ctx } from '../core/context';
import { json, legacyError } from '../core/respond';
import { withinLimit } from '../security/rateLimit';
import { newId } from '../core/database';
import { ACCESS_TTL_SECONDS } from '../sessions/tokens';
import {issueProviderSession,providerSessionId} from '../sessions/providerSessions';

// Public project settings, never privileged credentials. Environment overrides
// retain compatibility with the existing login and allow configuration rotation.
const DEFAULT_URL = 'https://ldliraxelqftisjofwgv.supabase.co';
const DEFAULT_KEY = 'sb_publishable_cpxxQyXcEYEy3mwWAaTG9w_QNFg9tC9';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Identity = { id?: unknown; email?: unknown; email_confirmed_at?: unknown; is_anonymous?: unknown; user_metadata?: { display_name?: unknown; full_name?: unknown } };
type Member = { id: string; email: string; handle: string; display_name: string; account_status: string; email_verified_at: string | null };

/** Verify the upstream bearer with Supabase, then resolve one canonical member.
 * A new provider may never silently claim an unverified legacy email account.
 * Already-linked identities retain their existing member ID.
 */
export async function exchangeSupabase(ctx: Ctx): Promise<Response> {
  const token = ctx.request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token || token.length > 8192) return legacyError('not_authenticated', 401);
  if (!(await withinLimit(ctx.sql, 'supabase_exchange', ctx.ip(), 60))) return legacyError('rate_limited', 429);
  const base = (ctx.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
  const apikey = ctx.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) || !apikey) return legacyError('identity_provider_not_configured', 503);
  let upstream: Response;
  try {
    upstream = await fetch(base + '/auth/v1/user', { method: 'GET', headers: { apikey, Authorization: 'Bearer ' + token, Accept: 'application/json' }, redirect: 'manual' });
  } catch {
    return legacyError('identity_provider_fetch_failed', 503);
  }
  if (upstream.status === 0 || upstream.type === 'opaqueredirect' || (upstream.status >= 300 && upstream.status < 400)) return legacyError('identity_provider_redirect_rejected', 503);
  if (upstream.status === 401 || upstream.status === 403) return legacyError('not_authenticated', 401);
  if (!upstream.ok) return legacyError(upstream.status === 429 ? 'identity_provider_rate_limited' : 'identity_provider_http_' + upstream.status, 503);
  let identity: Identity | null;
  try { identity = await upstream.json() as Identity | null; } catch { return legacyError('identity_provider_invalid_response', 503); }
  const email = typeof identity?.email === 'string' ? identity.email.toLowerCase().trim() : '';
  const subject = identity?.id;
  if (typeof subject !== 'string' || !UUID.test(subject) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || typeof identity?.email_confirmed_at !== 'string' || !identity.email_confirmed_at || identity.is_anonymous === true) return legacyError('unverified_identity', 403);
  const providerId=providerSessionId(token,subject);
  if(!providerId)return legacyError('provider_session_missing',401);
  const providerSubject = 'supabase:' + subject;
  const lookup = () => ctx.sql.first<Member>("SELECT u.id,u.email,u.handle,u.display_name,u.account_status,u.email_verified_at FROM auth_identities i JOIN users u ON u.id=i.user_id WHERE i.provider='oidc' AND i.provider_subject=?", providerSubject);
  let member = await lookup();
  if (!member) {
    const existing = await ctx.sql.first<Member>('SELECT id,email,handle,display_name,account_status,email_verified_at FROM users WHERE email=?', email);
    if (existing) {
      if (existing.account_status !== 'active') return legacyError('account_disabled', 403);
      // Existing password accounts need explicit, trusted migration/linking.
      // Do not accept an email-only collision, even if the upstream email is verified.
      return legacyError('identity_link_required', 409);
    }
    const id = newId();
    const metadataName = identity.user_metadata?.display_name || identity.user_metadata?.full_name;
    const name = (typeof metadataName === 'string' ? metadataName : email.split('@')[0]).replace(/[\r\n\t]/g, ' ').trim().slice(0, 90) || 'Membre JenLow';
    const handle = 'jl_' + id.replace(/-/g, '').slice(0, 15);
    try {
      await ctx.sql.batch([
        ctx.sql.stmt('INSERT INTO users(id,handle,display_name,email,email_verified_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)', id, handle, name, email),
        ctx.sql.stmt('INSERT INTO user_preferences(user_id) VALUES(?)', id),
        ctx.sql.stmt("INSERT INTO auth_identities(id,user_id,provider,provider_subject) VALUES(?,?,'oidc',?)", newId(), id, providerSubject),
      ]);
    } catch {
      // An overlapping login can succeed; an email collision cannot claim an account.
    }
    member = await lookup();
    if (!member) return legacyError('identity_link_failed', 409);
  }
  if (member.account_status !== 'active' || member.email.toLowerCase() !== email) return legacyError('not_authenticated', 401);
  const session=await issueProviderSession(ctx,member.id,providerId);
  if(!session)return legacyError('session_revoked_or_inactive',401);
  await ctx.sql.run("UPDATE auth_identities SET last_sign_in_at=CURRENT_TIMESTAMP WHERE provider='oidc' AND provider_subject=? AND user_id=?", providerSubject, member.id);
  return json({ user: { id: member.id, email, displayName: member.display_name, handle: member.handle,profileId:session.profileId }, accessToken:session.accessToken, expiresIn: ACCESS_TTL_SECONDS, tokenType: 'Bearer' });
}
