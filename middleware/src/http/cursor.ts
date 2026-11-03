import { badRequest } from './errors';

/**
 * Keyset cursors: (timestamp, id) pairs, newest first. Stable under inserts and deletes,
 * unlike offsets. Encoded as base64url JSON so clients treat them as opaque.
 */
export type Cursor = { t: string; id: string };

export function encodeCursor(c: Cursor): string {
  const raw = JSON.stringify([c.t, c.id]);
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
    const parsed = JSON.parse(decodeURIComponent(escape(atob(padded))));
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && typeof parsed[1] === 'string' && parsed[0].length <= 40 && parsed[1].length <= 80)
      return { t: parsed[0], id: parsed[1] };
  } catch {
    /* fallthrough */
  }
  throw badRequest('invalid_cursor');
}

export function pageLimit(raw: string | null, fallback = 20, max = 50): number {
  if (raw === null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw badRequest('invalid_limit');
  return Math.min(n, max);
}

/** Given limit+1 rows ordered newest first, return the page and the next cursor. */
export function paginate<T>(rows: T[], limit: number, key: (row: T) => Cursor): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const nextCursor = rows.length > limit && items.length ? encodeCursor(key(items[items.length - 1])) : null;
  return { items, nextCursor };
}
