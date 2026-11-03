import type { Router } from '../http/router';
import type { Ctx } from '../http/context';
import type { Sql } from '../lib/util';
import { signingSecret } from '../config/env';
import { V } from '../http/validate';
import { badRequest, conflict, forbidden, notFound, unavailable, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { hmacSign, hmacVerify, iso, newId } from '../lib/util';

/**
 * Media flow (free-tier friendly, no S3 credentials in clients):
 *  1. POST /api/media/uploads           → pending row + upload instructions
 *  2. PUT  /api/media/:id/content       → body streamed by the Worker into R2 (size-capped)
 *  3. POST /api/media/:id/complete      → size + magic-byte check, then "ready" (or "quarantined")
 * Reads use short-lived HMAC-signed URLs with Range support. Never served as a download.
 */
export type Purpose =
  | 'avatar' | 'dream_cover' | 'dream_gallery' | 'dream_result' | 'dream_block' | 'music_audio' | 'music_cover'
  | 'music_proposal' | 'talent_sample' | 'bible_image' | 'message_attachment';
export const PURPOSES: readonly Purpose[] = ['avatar', 'dream_cover', 'dream_gallery', 'dream_result', 'dream_block', 'music_audio', 'music_cover', 'music_proposal', 'talent_sample', 'bible_image', 'message_attachment'];

const MB = 1024 * 1024;
const IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const AUDIO = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm'];
const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const PDF = ['application/pdf'];

const RULES: Record<Purpose, { types: string[]; maxBytes: number }> = {
  avatar: { types: IMAGE, maxBytes: 5 * MB },
  dream_cover: { types: IMAGE, maxBytes: 8 * MB },
  dream_gallery: { types: IMAGE, maxBytes: 8 * MB },
  dream_block: { types: [...IMAGE, ...AUDIO, ...PDF], maxBytes: 15 * MB },
  dream_result: { types: [...IMAGE, ...AUDIO, ...VIDEO, ...PDF], maxBytes: 50 * MB },
  music_audio: { types: AUDIO, maxBytes: 30 * MB },
  music_proposal: { types: AUDIO, maxBytes: 30 * MB },
  music_cover: { types: IMAGE, maxBytes: 8 * MB },
  talent_sample: { types: [...IMAGE, ...AUDIO, ...VIDEO], maxBytes: 30 * MB },
  bible_image: { types: IMAGE, maxBytes: 8 * MB },
  message_attachment: { types: [...IMAGE, ...PDF], maxBytes: 10 * MB },
};

export function mediaTypeOf(mime: string): 'image' | 'audio' | 'video' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

/** First bytes of common formats; uploads that do not match their declared type are quarantined. */
export function sniffMatches(mime: string, b: Uint8Array): boolean {
  const at = (o: number, s: string) => s.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
  switch (mime) {
    case 'image/jpeg': return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png': return b[0] === 0x89 && at(1, 'PNG');
    case 'image/webp': return at(0, 'RIFF') && at(8, 'WEBP');
    case 'audio/wav': case 'audio/x-wav': return at(0, 'RIFF') && at(8, 'WAVE');
    case 'audio/mpeg': return at(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case 'audio/ogg': return at(0, 'OggS');
    case 'audio/webm': case 'video/webm': return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    case 'audio/mp4': case 'audio/aac': case 'video/mp4': case 'video/quicktime': return at(4, 'ftyp') || (mime === 'audio/aac' && b[0] === 0xff && (b[1] & 0xf0) === 0xf0);
    case 'application/pdf': return at(0, '%PDF');
    default: return false;
  }
}

type MediaRow = {
  id: string; owner_id: string; r2_key: string | null; external_url: string | null; media_type: string; mime_type: string | null;
  bytes: number | null; duration_ms: number | null; width: number | null; height: number | null; storage_status: string;
  purpose: string | null; attribution: string | null; source_name: string | null; created_at: string; deleted_at: string | null;
};

export type MediaDTO = {
  id: string; url: string | null; mediaType: string; mimeType: string | null; width: number | null; height: number | null;
  durationMs: number | null; attribution: string | null; sourceName: string | null; status: string;
};

/** Hour-aligned expiry keeps signed URLs identical within the hour so clients can cache them. */
async function signedReadUrl(ctx: Ctx, id: string): Promise<string> {
  const exp = (Math.floor(Date.now() / 3600000) + 2) * 3600;
  const sig = await hmacSign(signingSecret(ctx.env), `media:${id}:${exp}`);
  return `${ctx.baseUrl()}/api/media/${encodeURIComponent(id)}/content?exp=${exp}&sig=${sig}`;
}

/**
 * Public URL for a media row: attributed external URLs as-is, R2 objects via signed URL,
 * `app-asset:` references are first-party assets bundled in the app (demo audio).
 */
export async function toMediaDTO(ctx: Ctx, row: MediaRow | null | undefined): Promise<MediaDTO | null> {
  if (!row || row.deleted_at || row.storage_status === 'removed' || row.storage_status === 'quarantined') return null;
  let url: string | null = null;
  if (row.external_url) url = row.external_url;
  else if (row.r2_key && row.storage_status === 'ready') url = await signedReadUrl(ctx, row.id);
  return {
    id: row.id, url, mediaType: row.media_type, mimeType: row.mime_type, width: row.width, height: row.height,
    durationMs: row.duration_ms, attribution: row.attribution, sourceName: row.source_name, status: row.storage_status,
  };
}

export async function mediaMap(ctx: Ctx, ids: (string | null | undefined)[]): Promise<Map<string, MediaDTO>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const out = new Map<string, MediaDTO>();
  for (let i = 0; i < unique.length; i += 80) {
    const part = unique.slice(i, i + 80);
    const rows = await ctx.sql.all<MediaRow>(`SELECT * FROM media_assets WHERE id IN (${part.map(() => '?').join(',')})`, ...part);
    for (const row of rows) {
      const dto = await toMediaDTO(ctx, row);
      if (dto) out.set(row.id, dto);
    }
  }
  return out;
}

/** A media item the member owns, that finished uploading, optionally of a given type. */
export async function requireOwnedMedia(sql: Sql, mediaId: string, ownerId: string, kinds?: ('image' | 'audio' | 'video' | 'document')[]): Promise<MediaRow> {
  const row = await sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=? AND deleted_at IS NULL', mediaId);
  if (!row || row.owner_id !== ownerId) throw unprocessable('media_not_found');
  if (row.storage_status !== 'ready') throw unprocessable('media_not_ready');
  if (kinds && !kinds.includes(row.media_type as 'image')) throw unprocessable('media_wrong_type');
  return row;
}

function bucket(ctx: Ctx) {
  if (!ctx.env.MEDIA) throw unavailable('media_storage_not_configured', 'Bind an R2 bucket as MEDIA to enable uploads.');
  return ctx.env.MEDIA;
}

export function registerMedia(r: Router): void {
  r.add('POST', '/api/media/uploads', { tag: 'Media', summary: 'Start an upload (returns where to PUT the bytes)', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    bucket(ctx);
    await enforceLimit(ctx.sql, 'upload', viewer.id, LIMITS.upload);
    const v = new V(await ctx.body());
    const purpose = v.oneOf('purpose', PURPOSES, { required: true });
    const mimeType = v.str('mimeType', { required: true, max: 100 });
    const bytes = v.int('bytes', { required: true, min: 1 });
    const filename = v.str('filename', { max: 200 });
    v.done();
    const rule = RULES[purpose!];
    if (!rule.types.includes(mimeType!)) throw unprocessable('media_type_not_allowed', 'Allowed: ' + rule.types.join(', '));
    if (bytes! > rule.maxBytes) throw unprocessable('media_too_large', `Max ${rule.maxBytes} bytes`);
    const id = newId();
    const key = `u/${viewer.id}/${id}`;
    const expires = new Date(Date.now() + 3600 * 1000).toISOString();
    await ctx.sql.run(
      `INSERT INTO media_assets(id,owner_id,r2_key,media_type,mime_type,bytes,storage_status,purpose,original_filename,upload_expires_at)
       VALUES(?,?,?,?,?,?,'pending',?,?,?)`,
      id, viewer.id, key, mediaTypeOf(mimeType!), mimeType!, bytes!, purpose!, filename ?? null, expires,
    );
    return { mediaId: id, upload: { method: 'PUT', url: `${ctx.baseUrl()}/api/media/${id}/content`, headers: { 'Content-Type': mimeType }, maxBytes: bytes, expiresAt: expires }, completeUrl: `${ctx.baseUrl()}/api/media/${id}/complete` };
  });

  r.add('PUT', '/api/media/:id/content', { tag: 'Media', summary: 'Upload the bytes for a pending media item (streamed to R2)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const store = bucket(ctx);
    const row = await ctx.sql.first<MediaRow & { upload_expires_at: string | null }>('SELECT * FROM media_assets WHERE id=?', ctx.param('id'));
    if (!row || row.owner_id !== viewer.id || !row.r2_key) throw notFound();
    if (row.storage_status !== 'pending') throw conflict('upload_already_completed');
    if (row.upload_expires_at && Date.parse(row.upload_expires_at) < Date.now()) throw conflict('upload_expired');
    const declared = Number(ctx.request.headers.get('content-length') || '0');
    if (!declared || declared > (row.bytes ?? 0)) throw badRequest('content_length_mismatch', 'Content-Length must be set and not exceed the declared size.');
    if ((ctx.request.headers.get('content-type') || '').split(';')[0].trim() !== row.mime_type) throw badRequest('content_type_mismatch');
    if (!ctx.request.body) throw badRequest('empty_body');
    await store.put(row.r2_key, ctx.request.body, { httpMetadata: { contentType: row.mime_type || 'application/octet-stream' }, customMetadata: { owner: viewer.id } });
    return { mediaId: row.id, uploaded: true };
  });

  r.add('POST', '/api/media/:id/complete', { tag: 'Media', summary: 'Validate an uploaded object and mark it ready', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const store = bucket(ctx);
    const row = await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', ctx.param('id'));
    if (!row || row.owner_id !== viewer.id || !row.r2_key) throw notFound();
    if (row.storage_status === 'ready') return { media: await toMediaDTO(ctx, row) };
    if (row.storage_status !== 'pending') throw conflict('media_not_pending');
    const head = await store.head(row.r2_key);
    if (!head) throw unprocessable('upload_missing');
    const v = new V(await ctx.optionalBody());
    const width = v.int('width', { min: 1, max: 20000 });
    const height = v.int('height', { min: 1, max: 20000 });
    const durationMs = v.int('durationMs', { min: 0, max: 6 * 3600 * 1000 });
    v.done();
    const sample = await store.get(row.r2_key, { range: { offset: 0, length: 16 } });
    const bytes = sample ? new Uint8Array(await sample.arrayBuffer()) : new Uint8Array();
    const ok = head.size > 0 && head.size <= (row.bytes ?? 0) && sniffMatches(row.mime_type || '', bytes);
    await ctx.sql.run(
      'UPDATE media_assets SET storage_status=?,bytes=?,width=coalesce(?,width),height=coalesce(?,height),duration_ms=coalesce(?,duration_ms),upload_expires_at=NULL WHERE id=?',
      ok ? 'ready' : 'quarantined', head.size, width ?? null, height ?? null, durationMs ?? null, row.id,
    );
    if (!ok) {
      await store.delete(row.r2_key);
      throw unprocessable('media_rejected', 'The file does not match its declared type or size.');
    }
    const fresh = await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', row.id);
    return { media: await toMediaDTO(ctx, fresh) };
  });

  r.add('POST', '/api/media/external', { tag: 'Media', summary: 'Register an attributed external image or audio URL', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const v = new V(await ctx.body());
    const url = v.url('url', { required: true });
    const mediaType = v.oneOf('mediaType', ['image', 'audio'] as const, { required: true });
    const purpose = v.oneOf('purpose', PURPOSES, { required: true });
    const attribution = v.str('attribution', { required: true, min: 2, max: 300 });
    const sourceName = v.str('sourceName', { max: 100 });
    v.done();
    const id = newId();
    await ctx.sql.run(
      "INSERT INTO media_assets(id,owner_id,external_url,media_type,storage_status,purpose,attribution,source_name) VALUES(?,?,?,?,'ready',?,?,?)",
      id, viewer.id, url!, mediaType!, purpose!, attribution!, sourceName ?? null,
    );
    return { media: await toMediaDTO(ctx, await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', id)) };
  });

  r.add('GET', '/api/media/:id', { tag: 'Media', summary: 'Metadata of one of my media items', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const row = await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', ctx.param('id'));
    if (!row || row.owner_id !== viewer.id || row.deleted_at) throw notFound();
    return { media: { ...(await toMediaDTO(ctx, row)), purpose: row.purpose, bytes: row.bytes, createdAt: iso(row.created_at), status: row.storage_status } };
  });

  r.add('GET', '/api/media/:id/content', { tag: 'Media', summary: 'Stream media through a signed URL (supports Range; inline only)', auth: 'none' }, async ctx => {
    const store = bucket(ctx);
    const id = ctx.param('id');
    const exp = Number(ctx.query('exp') || '0');
    const sig = ctx.query('sig') || '';
    let allowed = exp > Date.now() / 1000 && (await hmacVerify(signingSecret(ctx.env), `media:${id}:${exp}`, sig));
    const row = await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', id);
    if (!row || !row.r2_key || row.deleted_at || row.storage_status !== 'ready') throw notFound();
    if (!allowed) {
      const viewer = await ctx.viewer();
      allowed = !!viewer && viewer.id === row.owner_id;
    }
    if (!allowed) throw forbidden('signature_invalid');
    const total = row.bytes ?? 0;
    const range = parseRange(ctx.request.headers.get('range'), total);
    const object = await store.get(row.r2_key, range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined);
    if (!object) throw notFound();
    const headers: Record<string, string> = {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    };
    if (range) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${total}`;
      headers['Content-Length'] = String(range.end - range.start + 1);
      return new Response(object.body, { status: 206, headers });
    }
    headers['Content-Length'] = String(object.size);
    return new Response(object.body, { status: 200, headers });
  });

  r.add('DELETE', '/api/media/:id', { tag: 'Media', summary: 'Delete one of my media items (refused while a locked Floraison uses it)', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const row = await ctx.sql.first<MediaRow>('SELECT * FROM media_assets WHERE id=?', ctx.param('id'));
    if (!row || row.owner_id !== viewer.id || row.deleted_at) throw notFound();
    const locked = await ctx.sql.exists(
      `SELECT 1 FROM dream_media dm JOIN dreams d ON d.id=dm.dream_id WHERE dm.media_id=? AND dm.role='result' AND d.phase='testimony'
       UNION SELECT 1 FROM dreams WHERE testimony_primary_asset_id=? AND phase='testimony'`,
      row.id, row.id,
    );
    if (locked) throw conflict('media_in_floraison');
    await ctx.sql.run("UPDATE media_assets SET storage_status='removed',deleted_at=CURRENT_TIMESTAMP WHERE id=?", row.id);
    if (row.r2_key && ctx.env.MEDIA) await ctx.env.MEDIA.delete(row.r2_key);
    return { deleted: true };
  });
}

export function parseRange(header: string | null, total: number): { start: number; end: number } | null {
  if (!header || !total) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start: number;
  let end: number;
  if (m[1] === '' && m[2] !== '') {
    const suffix = Number(m[2]);
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
  }
  if (!Number.isFinite(start) || start > end || start >= total) return null;
  return { start, end };
}
