import type { Sql } from '../lib/util';
import { sha256Hex } from '../lib/util';
import { tooMany } from './errors';

export const WINDOW_SECONDS = 900;

/**
 * Fixed 15-minute window counter in D1 (table auth_rate_limits from 0008), the same
 * algorithm the beta auth Worker uses. Keys are hashed so IPs/user ids are not stored raw.
 * Returns true while the caller is within `max` attempts.
 */
export async function withinLimit(sql: Sql, kind: string, identity: string, max: number): Promise<boolean> {
  const key = await sha256Hex(kind + ':' + identity);
  const now = Math.floor(Date.now() / 1000);
  const start = now - (now % WINDOW_SECONDS);
  await sql.run(
    `INSERT INTO auth_rate_limits(throttle_key,attempt_count,window_start,expires_at) VALUES(?,1,?,?)
     ON CONFLICT(throttle_key) DO UPDATE SET attempt_count=CASE WHEN window_start=? THEN attempt_count+1 ELSE 1 END,window_start=?,expires_at=?`,
    key, start, start + WINDOW_SECONDS, start, start, start + WINDOW_SECONDS,
  );
  const row = await sql.first<{ attempt_count: number }>('SELECT attempt_count FROM auth_rate_limits WHERE throttle_key=?', key);
  return (row?.attempt_count ?? 999) <= max;
}

export async function enforceLimit(sql: Sql, kind: string, identity: string, max: number): Promise<void> {
  if (!(await withinLimit(sql, kind, identity, max))) throw tooMany();
}

/** Per-member write budgets for abuse-sensitive actions (per 15 minutes). */
export const LIMITS = {
  register: 5,
  login: 12,
  write: 300,
  social: 40,
  report: 20,
  search: 120,
  upload: 60,
  message: 200,
} as const;
