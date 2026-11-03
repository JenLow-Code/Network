/**
 * D1-compatible adapter over Node's built-in SQLite (node:sqlite) for integration tests.
 * Mirrors the D1 behaviours the Worker relies on: prepare/bind/first/all/run, batch() as a
 * single transaction that rolls back entirely on error, ?NNN parameters, enforced foreign
 * keys, and rejection of `undefined` bindings (D1_TYPE_ERROR).
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Database, D1PreparedStatement, D1Result, D1Value } from '../../src/platform/cf.ts';

const READER = /^\s*(SELECT|WITH|PRAGMA|VALUES)\b/i;

class Statement implements D1PreparedStatement {
  constructor(private readonly db: DatabaseSync, readonly sql: string, readonly args: D1Value[] = []) {}
  bind(...values: D1Value[]): D1PreparedStatement {
    values.forEach((v, i) => {
      if (v === undefined) throw new Error(`D1_TYPE_ERROR: Type 'undefined' not supported for value at index ${i}`);
      if (typeof v === 'boolean') throw new Error(`D1_TYPE_ERROR: booleans must be bound as 0/1 (index ${i})`);
    });
    return new Statement(this.db, this.sql, values);
  }
  private plain<T>(row: unknown): T {
    return row ? ({ ...(row as object) } as T) : (null as T);
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.args as never[])) as Record<string, unknown> | undefined;
    if (!row) return null;
    return column ? ((row[column] ?? null) as T) : this.plain<T>(row);
  }
  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = this.db.prepare(this.sql).all(...(this.args as never[])) as unknown[];
    return { results: rows.map(r => this.plain<T>(r)), success: true, meta: { changes: 0, last_row_id: 0 } };
  }
  async run(): Promise<D1Result> {
    const r = this.db.prepare(this.sql).run(...(this.args as never[]));
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  execSync(): D1Result {
    if (READER.test(this.sql) || /\bRETURNING\b/i.test(this.sql)) {
      const rows = this.db.prepare(this.sql).all(...(this.args as never[])) as unknown[];
      return { results: rows.map(r => this.plain(r)), success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    const r = this.db.prepare(this.sql).run(...(this.args as never[]));
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export class TestD1 implements D1Database {
  readonly raw: DatabaseSync;
  constructor() {
    this.raw = new DatabaseSync(':memory:');
    this.raw.exec('PRAGMA foreign_keys=ON');
  }
  prepare(sql: string): D1PreparedStatement {
    return new Statement(this.raw, sql);
  }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    this.raw.exec('BEGIN');
    try {
      const out = statements.map(s => (s as Statement).execSync());
      this.raw.exec('COMMIT');
      return out;
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }
  exec(sql: string): void {
    this.raw.exec(sql);
  }
}

export const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', '..', 'database', 'migrations');
export const SEEDS_DIR = join(import.meta.dirname, '..', '..', '..', 'database', 'seeds');

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
}

export function applyMigrations(db: TestD1, upTo?: string): string[] {
  const applied: string[] = [];
  for (const file of migrationFiles()) {
    if (upTo && file > upTo) break;
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    applied.push(file);
  }
  return applied;
}
