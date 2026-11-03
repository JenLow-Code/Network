import assert from 'node:assert/strict';
import type { Env } from '../../src/config/env.ts';
import type { R2Bucket, R2Object, R2ObjectBody, R2PutOptions } from '../../src/platform/cf.ts';
import { handle, router } from '../../src/app.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Records which routes tests exercised and whether a success response was observed. */
const coverage = new Map<string, { ok: number; err: number }>();
process.on('exit', () => {
  if (!coverage.size) return;
  const dir = join(import.meta.dirname, '..', '..', '.route-coverage');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${process.pid}.json`), JSON.stringify(Object.fromEntries(coverage)));
});
import { TestD1, applyMigrations } from './d1.ts';

export const INVITE = 'test-invite-code-123';
export const SECRET = 'test-secret-that-is-long-enough-0123456789abcdef';
export const ORIGIN = 'https://network.jenlow.net';

/** In-memory R2 with range reads, enough to exercise the upload/complete/stream flow. */
export class MemoryR2 implements R2Bucket {
  objects = new Map<string, { data: Uint8Array; type?: string }>();
  async put(key: string, value: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string, options?: R2PutOptions): Promise<R2Object> {
    let data: Uint8Array;
    if (typeof value === 'string') data = new TextEncoder().encode(value);
    else if (value instanceof Uint8Array) data = value;
    else if (value instanceof ArrayBuffer) data = new Uint8Array(value);
    else data = new Uint8Array(await new Response(value).arrayBuffer());
    this.objects.set(key, { data, type: options?.httpMetadata?.contentType });
    return { key, size: data.length, etag: 'e' + data.length };
  }
  async head(key: string): Promise<R2Object | null> {
    const o = this.objects.get(key);
    return o ? { key, size: o.data.length, etag: 'e', httpMetadata: { contentType: o.type } } : null;
  }
  async get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<R2ObjectBody | null> {
    const o = this.objects.get(key);
    if (!o) return null;
    const start = options?.range?.offset ?? 0;
    const slice = o.data.slice(start, options?.range?.length !== undefined ? start + options.range.length : undefined);
    return {
      key, size: o.data.length, etag: 'e', httpMetadata: { contentType: o.type },
      body: new Response(slice).body as ReadableStream<Uint8Array>,
      arrayBuffer: async () => slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength) as ArrayBuffer,
    };
  }
  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

export type TestApp = {
  db: TestD1;
  env: Env;
  r2: MemoryR2;
  call: (method: string, path: string, opts?: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: BodyInit }) => Promise<{ status: number; body: any; headers: Headers }>;
  register: (name: string, email?: string) => Promise<{ id: string; token: string; refresh: string; handle: string }>;
};

let counter = 0;

export function createApp(opts: { migrations?: boolean; env?: Partial<Env> } = {}): TestApp {
  const db = new TestD1();
  if (opts.migrations !== false) applyMigrations(db);
  const r2 = new MemoryR2();
  const env: Env = {
    DB: db, MEDIA: r2, AUTH_JWT_SECRET: SECRET, BETA_INVITE_CODE: INVITE, ALLOWED_ORIGIN: ORIGIN,
    PUBLIC_API_URL: 'https://api.test', DISCOVERY_INCLUDE_DEMO: 'true', ...opts.env,
  };
  const call: TestApp['call'] = async (method, path, o = {}) => {
    const headers: Record<string, string> = { ...(o.headers || {}) };
    if (o.token) headers.Authorization = 'Bearer ' + o.token;
    let body: BodyInit | undefined = o.raw;
    if (o.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body);
    }
    const res = await handle(new Request('https://api.test' + path, { method, headers, body }), env);
    const match = router.match(method, new URL('https://api.test' + path).pathname.replace(/\/+$/, '') || '/');
    if (match && 'route' in match) {
      const key = `${match.route.method} ${match.route.path}`;
      const entry = coverage.get(key) ?? { ok: 0, err: 0 };
      if (res.status < 400) entry.ok++; else entry.err++;
      coverage.set(key, entry);
    }
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON (ics, media) */ }
    return { status: res.status, body: parsed, headers: res.headers };
  };
  const register: TestApp['register'] = async (name, email) => {
    const mail = email || `user${++counter}-${Date.now()}@example.test`;
    const res = await call('POST', '/v1/auth/email/register', { body: { displayName: name, email: mail, password: 'correct horse battery staple', inviteCode: INVITE } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return { id: res.body.user.id, token: res.body.session.accessToken, refresh: res.body.session.refreshToken, handle: res.body.user.handle };
  };
  return { db, env, r2, call, register };
}

/** A real 1×1 PNG (magic bytes checked by /complete). */
export const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89, 0, 0, 0, 10, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0, 1, 0, 0, 5, 0, 1, 0x0d, 0x0a, 0x2d, 0xb4, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
/** Minimal WAV header + a few silent samples. */
export function wav(): Uint8Array {
  const data = new Uint8Array(44 + 16);
  const enc = (o: number, s: string) => s.split('').forEach((c, i) => (data[o + i] = c.charCodeAt(0)));
  enc(0, 'RIFF'); enc(8, 'WAVE'); enc(12, 'fmt '); enc(36, 'data');
  return data;
}

/** Upload helper: uploads → PUT content → complete. Returns the media id. */
export async function upload(app: TestApp, token: string, purpose: string, mime: string, bytes: Uint8Array): Promise<string> {
  const start = await app.call('POST', '/api/media/uploads', { token, body: { purpose, mimeType: mime, bytes: bytes.length, filename: 'f' } });
  assert.equal(start.status, 201, JSON.stringify(start.body));
  const id = start.body.mediaId;
  const put = await app.call('PUT', `/api/media/${id}/content`, { token, raw: bytes as unknown as BodyInit, headers: { 'Content-Type': mime, 'Content-Length': String(bytes.length) } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const done = await app.call('POST', `/api/media/${id}/complete`, { token, body: {} });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  return id;
}
