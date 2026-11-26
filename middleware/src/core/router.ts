import type { Ctx } from './context';

export type HandlerResult = Response | object | null | undefined;
export type Handler = (ctx: Ctx) => Promise<HandlerResult> | HandlerResult;
export type AuthMode = 'none' | 'optional' | 'required' | 'moderator';

export interface RouteDef {
  method: string;
  path: string;
  tag: string;
  summary: string;
  auth: AuthMode;
  status?: number;
  handler: Handler;
  regex: RegExp;
  keys: string[];
}

/** Tiny path router. Route metadata also feeds the generated OpenAPI document. */
export class Router {
  readonly routes: RouteDef[] = [];

  add(method: string, path: string, meta: { tag: string; summary: string; auth: AuthMode; status?: number }, handler: Handler): this {
    const keys: string[] = [];
    const pattern = path.replace(/:([A-Za-z]+)/g, (_m, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, path, ...meta, handler, regex: new RegExp('^' + pattern + '$'), keys });
    return this;
  }

  match(method: string, pathname: string): { route: RouteDef; params: Record<string, string> } | { allowed: string[] } | null {
    const allowed: string[] = [];
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      if (route.method !== method) {
        allowed.push(route.method);
        continue;
      }
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => {
        try {
          params[k] = decodeURIComponent(m[i + 1]);
        } catch {
          params[k] = m[i + 1];
        }
      });
      return { route, params };
    }
    return allowed.length ? { allowed } : null;
  }
}
