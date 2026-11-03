/**
 * Minimal structural types for the Cloudflare bindings this Worker uses.
 * Kept local (instead of relying on @cloudflare/workers-types globals) so the same code
 * typechecks in the Worker build and in the Node test harness that provides a D1 shim.
 */
export type D1Value = string | number | null | ArrayBuffer;

export interface D1Meta {
  changes: number;
  last_row_id: number;
  duration?: number;
}
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}
export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  /** D1 batches run as one transaction: any failing statement rolls back the batch. */
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface R2Range {
  offset: number;
  length?: number;
}
export interface R2HTTPMetadata {
  contentType?: string;
}
export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}
export interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}
export interface R2Bucket {
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string,
    options?: R2PutOptions,
  ): Promise<R2Object | null>;
  get(key: string, options?: { range?: R2Range }): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
export interface ScheduledController {
  cron: string;
  scheduledTime: number;
}
