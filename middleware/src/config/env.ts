import type { D1Database, R2Bucket } from '../platform/cf';

/**
 * Worker bindings. Secrets are set with `wrangler secret put`, never committed.
 * Optional bindings degrade to explicit 503 responses instead of pretending to work.
 */
export interface Env {
  DB: D1Database;
  /** R2 bucket for member media. Uploads return 503 media_storage_not_configured without it. */
  MEDIA?: R2Bucket;
  /** HS256 secret shared with the deployed beta auth Worker (same issuer, same tokens). */
  AUTH_JWT_SECRET: string;
  /** Private beta invitation code required for email registration. */
  BETA_INVITE_CODE?: string;
  /** Comma-separated browser origins allowed by CORS. Native apps send no Origin. */
  ALLOWED_ORIGIN?: string;
  /** HMAC secret for short-lived media read URLs and calendar feed links. Falls back to AUTH_JWT_SECRET. */
  MEDIA_SIGNING_SECRET?: string;
  /** "true" (default) shows the fictional demo dataset in Discovery during the beta. */
  DISCOVERY_INCLUDE_DEMO?: string;
  /** Public base URL of this Worker, used to build media and calendar links. */
  PUBLIC_API_URL?: string;
  APP_VERSION?: string;
  ENVIRONMENT?: string;
}

export const MIN_SECRET_LENGTH = 32;

export function signingSecret(env: Env): string {
  return env.MEDIA_SIGNING_SECRET || env.AUTH_JWT_SECRET;
}

export function includeDemo(env: Env): boolean {
  return (env.DISCOVERY_INCLUDE_DEMO ?? 'true').toLowerCase() !== 'false';
}

export function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
