import type { Env } from '../config/env';
import { b64url, fromB64url } from '../lib/util';

/**
 * Access tokens: HS256 JWT, iss "jenlow-network-api", aud "jenlow-network", 15-minute expiry.
 * Byte-for-byte the same format as the deployed beta Worker (src/worker-runtime.js), so
 * tokens issued before and after the cutover are interchangeable.
 */
export const ISSUER = 'jenlow-network-api';
export const AUDIENCE = 'jenlow-network';
export const ACCESS_TTL_SECONDS = 900;
export const REFRESH_TTL_DAYS = 30;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function key(env: Env, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(env.AUTH_JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signAccessToken(userId: string, env: Env, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = b64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    encoder.encode(JSON.stringify({ sub: userId, iat: nowSeconds, exp: nowSeconds + ACCESS_TTL_SECONDS, iss: ISSUER, aud: AUDIENCE })),
  );
  const sig = await crypto.subtle.sign('HMAC', await key(env, 'sign'), encoder.encode(header + '.' + payload));
  return header + '.' + payload + '.' + b64url(new Uint8Array(sig));
}

/** Returns the subject (user id) of a valid, unexpired token from this issuer, else null. */
export async function verifyAccessToken(token: string, env: Env): Promise<string | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s || token.length > 4096) return null;
    const header = JSON.parse(decoder.decode(fromB64url(h)));
    if (header?.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await key(env, 'verify'), fromB64url(s), encoder.encode(h + '.' + p));
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromB64url(p)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE || typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

export function bearer(request: Request): string | null {
  return request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1] ?? null;
}
