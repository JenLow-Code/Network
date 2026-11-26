import type { Env } from './config';
import type { ExecutionContext } from './platform';
import { Sql } from './database';
import { bearer, verifyTokenClaims } from '../sessions/tokens';
import {activeProviderSession} from '../sessions/providerSessions';
import { badRequest, forbidden, unauthenticated } from './errors';
import { readBoundedJson } from '../security/body';
import type { Obj } from '../security/validation';

export type Locale = 'fr' | 'en' | 'de' | 'pt';
export const LOCALES: readonly Locale[] = ['fr', 'en', 'de', 'pt'];

export type Viewer = {
  id: string;
  handle: string;
  displayName: string;
  locale: Locale;
  timezone: string;
  roles: string[];
  profileId?:string;
  product?:string;
};

const MAX_JSON_BYTES = 256 * 1024;

/** Per-request context. Identity always comes from a verified token, never from the body. */
export class Ctx {
  readonly url: URL;
  readonly sql: Sql;
  params: Record<string, string> = {};
  private viewerCache: Viewer | null | undefined;
  private bodyCache: Obj | undefined;

  constructor(
    readonly request: Request,
    readonly env: Env,
    readonly exec: ExecutionContext | undefined,
    readonly requestId: string,
  ) {
    this.url = new URL(request.url);
    this.sql = new Sql(env.DB);
  }

  query(name: string): string | null {
    return this.url.searchParams.get(name);
  }

  param(name: string): string {
    const value = this.params[name];
    if (!value || value.length > 120) throw badRequest('invalid_path_parameter');
    return value;
  }

  /** Optional authentication: null for anonymous or invalid tokens. */
  async viewer(): Promise<Viewer | null> {
    if (this.viewerCache !== undefined) return this.viewerCache;
    const token = bearer(this.request);
    const claims = token ? await verifyTokenClaims(token, this.env) : null;
    const uid=claims?.sub;
    if (!uid) return (this.viewerCache = null);
    const scope=claims?.sid&&claims.product?await activeProviderSession(this,uid,claims.sid,claims.product):null;
    if(claims?.sid&&!scope)return (this.viewerCache=null);
    const row = await this.sql.first<{ id: string; handle: string; display_name: string; account_status: string; locale: string | null; timezone: string | null; roles: string | null }>(
      `SELECT u.id,u.handle,u.display_name,u.account_status,p.locale,p.timezone,
        (SELECT group_concat(role) FROM user_roles r WHERE r.user_id=u.id) AS roles
       FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=?`,
      uid,
    );
    // Deactivated, suspended and deleting accounts (including the fictional demo profiles) never authenticate.
    if (!row || row.account_status !== 'active') return (this.viewerCache = null);
    const locale = (LOCALES as readonly string[]).includes(row.locale || '') ? (row.locale as Locale) : 'fr';
    return (this.viewerCache = {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      locale,
      timezone: row.timezone || 'Europe/Paris',
      roles: scope?(scope.roles?scope.roles.split(','):[]):(row.roles?row.roles.split(','):[]),
      ...(scope?{profileId:scope.profile_id,product:claims?.product}:{}),
    });
  }

  async user(): Promise<Viewer> {
    const v = await this.viewer();
    if (!v) throw unauthenticated();
    return v;
  }

  async moderator(): Promise<Viewer> {
    const v = await this.user();
    if (!v.roles.includes('moderator') && !v.roles.includes('admin')) throw forbidden('moderator_only');
    return v;
  }

  /** Locale for labels: ?locale=, then the member preference, then Accept-Language, then French. */
  async locale(): Promise<Locale> {
    const q = this.query('locale');
    if (q && (LOCALES as readonly string[]).includes(q)) return q as Locale;
    const v = await this.viewer();
    if (v) return v.locale;
    const accept = (this.request.headers.get('accept-language') || '').slice(0, 2).toLowerCase();
    return (LOCALES as readonly string[]).includes(accept) ? (accept as Locale) : 'fr';
  }

  async body(): Promise<Obj> {
    if (this.bodyCache) return this.bodyCache;
    const type = this.request.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('application/json')) throw badRequest('json_required');
    const length = Number(this.request.headers.get('content-length') || '0');
    if (length > MAX_JSON_BYTES) throw badRequest('body_too_large');
    const parsed = await readBoundedJson(this.request, MAX_JSON_BYTES);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw badRequest('json_object_required');
    return (this.bodyCache = parsed as Obj);
  }

  /** Body is optional for some POST actions (e.g. toggles). */
  async optionalBody(): Promise<Obj> {
    const type = this.request.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('application/json')) return {};
    return this.body();
  }

  ip(): string {
    return this.request.headers.get('X-JenLow-Client-IP') || (this.env.ENVIRONMENT==='test'?this.request.headers.get('CF-Connecting-IP'):null) || 'unknown';
  }

  idempotencyKey(): string | null {
    const k = this.request.headers.get('idempotency-key');
    if (!k) return null;
    if (k.length < 8 || k.length > 120) throw badRequest('invalid_idempotency_key');
    return k;
  }

  baseUrl(): string {
    return (this.env.PUBLIC_API_URL || this.url.origin).replace(/\/$/, '');
  }
}
