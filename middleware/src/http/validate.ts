import { ApiError, type ErrorDetail } from './errors';

export type Obj = Record<string, unknown>;

/**
 * Small central validator. Collects every field error and throws one 422 with details,
 * so clients can show all problems at once. No dependency needed in the Worker bundle.
 */
export class V {
  private errors: ErrorDetail[] = [];
  constructor(private readonly src: Obj) {}

  private fail(field: string, code: string, message?: string): undefined {
    this.errors.push({ field, code, ...(message ? { message } : {}) });
    return undefined;
  }
  has(field: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.src, field) && this.src[field] !== undefined;
  }

  str(field: string, o: { required?: boolean; min?: number; max?: number; trim?: boolean; pattern?: RegExp; nullable?: boolean } = {}): string | null | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (raw === null) return o.nullable ? null : this.fail(field, o.required ? 'required' : 'invalid_type');
    if (typeof raw !== 'string') return this.fail(field, 'invalid_type');
    const value = o.trim === false ? raw : raw.trim();
    if (o.required && value.length === 0) return this.fail(field, 'required');
    if (o.min !== undefined && value.length < o.min) return this.fail(field, 'too_short', `min ${o.min}`);
    if (o.max !== undefined && value.length > o.max) return this.fail(field, 'too_long', `max ${o.max}`);
    if (o.pattern && value.length && !o.pattern.test(value)) return this.fail(field, 'invalid_format');
    if (o.nullable && value.length === 0) return null;
    return value;
  }

  int(field: string, o: { required?: boolean; min?: number; max?: number; nullable?: boolean } = {}): number | null | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (raw === null && o.nullable) return null;
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return this.fail(field, 'invalid_type');
    if (o.min !== undefined && raw < o.min) return this.fail(field, 'too_small', `min ${o.min}`);
    if (o.max !== undefined && raw > o.max) return this.fail(field, 'too_large', `max ${o.max}`);
    return raw;
  }

  bool(field: string, o: { required?: boolean } = {}): boolean | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (typeof raw !== 'boolean') return this.fail(field, 'invalid_type');
    return raw;
  }

  oneOf<T extends string>(field: string, values: readonly T[], o: { required?: boolean; nullable?: boolean } = {}): T | null | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (raw === null && o.nullable) return null;
    if (typeof raw !== 'string' || !(values as readonly string[]).includes(raw))
      return this.fail(field, 'invalid_value', 'expected one of ' + values.join(', '));
    return raw as T;
  }

  /** Calendar date YYYY-MM-DD that actually exists (rejects 2026-02-31). */
  date(field: string, o: { required?: boolean; nullable?: boolean } = {}): string | null | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if ((raw === null || raw === '') && o.nullable) return null;
    if (typeof raw !== 'string' || !isCalendarDate(raw)) return this.fail(field, 'invalid_date', 'expected YYYY-MM-DD');
    return raw;
  }

  /** ISO 8601 instant with an explicit offset or Z; normalised to UTC "YYYY-MM-DDTHH:MM:SSZ". */
  instant(field: string, o: { required?: boolean; nullable?: boolean } = {}): string | null | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (raw === null && o.nullable) return null;
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(raw))
      return this.fail(field, 'invalid_instant', 'expected ISO 8601 with offset');
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) return this.fail(field, 'invalid_instant');
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  url(field: string, o: { required?: boolean; nullable?: boolean; max?: number } = {}): string | null | undefined {
    const value = this.str(field, { ...o, max: o.max ?? 2048 });
    if (value === undefined || value === null) return value;
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return this.fail(field, 'https_required');
      return u.toString();
    } catch {
      return this.fail(field, 'invalid_url');
    }
  }

  id(field: string, o: { required?: boolean; nullable?: boolean } = {}): string | null | undefined {
    return this.str(field, { ...o, max: 80, pattern: /^[A-Za-z0-9_-]{1,80}$/ });
  }

  array<T>(field: string, each: (item: unknown, index: number) => T | undefined, o: { required?: boolean; max?: number } = {}): T[] | undefined {
    const raw = this.src[field];
    if (raw === undefined) return o.required ? this.fail(field, 'required') : undefined;
    if (!Array.isArray(raw)) return this.fail(field, 'invalid_type');
    if (o.max !== undefined && raw.length > o.max) return this.fail(field, 'too_many', `max ${o.max}`);
    const out: T[] = [];
    raw.forEach((item, i) => {
      const parsed = each(item, i);
      if (parsed === undefined) this.errors.push({ field: `${field}[${i}]`, code: 'invalid_item' });
      else out.push(parsed);
    });
    return out;
  }

  addError(field: string, code: string, message?: string): void {
    this.fail(field, code, message);
  }

  /** Throws 422 validation_failed with every collected detail. */
  done(): void {
    if (this.errors.length) throw new ApiError(422, 'validation_failed', 'Some fields are invalid.', this.errors);
  }
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/;
