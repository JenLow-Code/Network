import type { D1Database, D1PreparedStatement, D1Value } from '../platform/cf';

const encoder = new TextEncoder();

export const newId = (): string => crypto.randomUUID();

/** SQLite CURRENT_TIMESTAMP format (UTC, seconds). Used for every stored audit timestamp. */
export function sqlNow(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** Same format with milliseconds, for streams that need a stable order within one second (messages). */
export function sqlNowMs(date = new Date()): string {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

/** ISO instant from a client (e.g. a previous serverTime) → stored timestamp format, keeping milliseconds. */
export function toSqlTime(isoValue: string): string {
  return isoValue.replace('T', ' ').replace(/Z$/, '');
}

/** Render stored timestamps as ISO 8601 UTC for API responses. */
export function iso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(value)) return value.replace(' ', 'T') + 'Z';
  return value;
}

export function todayIn(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function hex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(raw: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(raw)));
}

export function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function hmacSign(secret: string, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return b64url(new Uint8Array(sig));
}

export async function hmacVerify(secret: string, payload: string, signature: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

/** Thin typed helpers over D1 prepared statements (always parameterised). */
export class Sql {
  constructor(readonly db: D1Database) {}
  stmt(sql: string, ...args: D1Value[]): D1PreparedStatement {
    return args.length ? this.db.prepare(sql).bind(...args) : this.db.prepare(sql);
  }
  async first<T = Record<string, unknown>>(sql: string, ...args: D1Value[]): Promise<T | null> {
    return this.stmt(sql, ...args).first<T>();
  }
  async all<T = Record<string, unknown>>(sql: string, ...args: D1Value[]): Promise<T[]> {
    return (await this.stmt(sql, ...args).all<T>()).results;
  }
  async run(sql: string, ...args: D1Value[]): Promise<number> {
    return (await this.stmt(sql, ...args).run()).meta.changes;
  }
  async batch(statements: D1PreparedStatement[]): Promise<void> {
    if (statements.length) await this.db.batch(statements);
  }
  async exists(sql: string, ...args: D1Value[]): Promise<boolean> {
    return !!(await this.first(sql, ...args));
  }
}

/** "?,?,?" for IN lists. D1 allows at most 100 bound parameters per statement. */
export function marks(n: number): string {
  if (n < 1 || n > 90) throw new Error('marks: list size must be 1..90');
  return Array.from({ length: n }, () => '?').join(',');
}

export const bit = (v: boolean | undefined | null): number => (v ? 1 : 0);
export const truthy = (v: unknown): boolean => v === 1 || v === true || v === '1';
export const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
