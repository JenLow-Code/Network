import { pbkdf2Sync } from 'node:crypto';

/**
 * PBKDF2-HMAC-SHA256, 32-byte output, hex. Identical to the deployed beta Worker.
 *
 * Why node:crypto and not WebCrypto: Workers' WebCrypto refuses PBKDF2 above 100,000
 * iterations (NotSupportedError), and existing beta credentials use 210,000. The
 * `nodejs_compat` compatibility flag is therefore required (see wrangler.toml.example).
 */
export const PASSWORD_ITERATIONS = 210000;
export const DUMMY_SALT = '00112233445566778899aabbccddeeff';

const fromHex = (s: string) => Uint8Array.from(s.match(/../g) || [], x => parseInt(x, 16));

export function derivePassword(raw: string, saltHex: string, iterations = PASSWORD_ITERATIONS): string {
  return pbkdf2Sync(raw, fromHex(saltHex), iterations, 32, 'sha256').toString('hex');
}

/** Constant-time comparison of two equal-length hex digests. */
export function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
