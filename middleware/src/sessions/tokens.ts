import type { Env } from '../core/config';
import { b64url, fromB64url } from '../core/database';

/**
 * Access tokens: HS256 JWT, iss "jenlow-network-api", aud "jenlow-network", 15-minute expiry.
 * Production tokens carry a server session and product scope. Legacy tokens remain only for isolated tests.
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

export async function signAccessToken(userId: string, env: Env, nowSeconds = Math.floor(Date.now() / 1000), scope?:{sid:string;product:string}): Promise<string> {
  const header = b64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    encoder.encode(JSON.stringify({ sub: userId, iat: nowSeconds, exp: nowSeconds + ACCESS_TTL_SECONDS, iss: ISSUER, aud: AUDIENCE, ...(scope||{}) })),
  );
  const sig = await crypto.subtle.sign('HMAC', await key(env, 'sign'), encoder.encode(header + '.' + payload));
  return header + '.' + payload + '.' + b64url(new Uint8Array(sig));
}

/** Returns the subject (user id) of a valid, unexpired token from this issuer, else null. */
export type TokenClaims={sub:string;sid?:string;product?:string};
export async function verifyTokenClaims(token: string, env: Env): Promise<TokenClaims | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || token.length > 4096) return null;
    const [h, p, s] = parts;
    if (!h || !p || !s) return null;
    const header = JSON.parse(decoder.decode(fromB64url(h)));
    if (header?.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await key(env, 'verify'), fromB64url(s), encoder.encode(h + '.' + p));
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromB64url(p)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.exp <= now || payload.iat > now + 30 || payload.exp <= payload.iat || payload.exp - payload.iat > ACCESS_TTL_SECONDS) return null;
    if(typeof payload.sub!=='string'||!payload.sub)return null;
    if(typeof payload.sid==='string'&&payload.sid&&['network','tools','production','live'].includes(payload.product))return {sub:payload.sub,sid:payload.sid,product:payload.product};
    return env.ENVIRONMENT==='test'&&payload.sid===undefined&&payload.product===undefined?{sub:payload.sub}:null;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token:string,env:Env):Promise<string|null>{return (await verifyTokenClaims(token,env))?.sub??null;}

export function bearer(request: Request): string | null {
  return request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1] ?? null;
}
