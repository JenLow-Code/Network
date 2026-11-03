import { API_BASE } from '@/lib/authApi';
import { currentAccessToken, loadSession, saveSession, setAccessToken } from './session';

/** Error raised for non-2xx API responses; `code` is the stable machine code from the server. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly requestId?: string,
  ) {
    super(message || code);
  }
}

let refreshing: Promise<string | null> | null = null;
type Listener = (signedIn: boolean) => void;
const listeners = new Set<Listener>();
export const onSessionChange = (fn: Listener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Exchange the stored refresh token for a new access token (single flight). */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const stored = await loadSession();
    if (!stored) return null;
    try {
      const res = await fetch(API_BASE + '/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          await saveSession(null);
          setAccessToken(null);
          listeners.forEach(l => l(false));
        }
        return null;
      }
      const data = await res.json();
      setAccessToken(data.accessToken, data.expiresIn);
      await saveSession({ ...stored, refreshToken: data.refreshToken });
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Options = { method?: string; body?: unknown; auth?: 'optional' | 'required' | 'none'; idempotencyKey?: string; signal?: AbortSignal };

/** JSON request to the JenLow API with transparent access-token refresh. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const auth = options.auth ?? 'optional';
  const send = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    return fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  };
  let token = auth === 'none' ? null : currentAccessToken() ?? (auth === 'required' || (await loadSession()) ? await refreshAccessToken() : null);
  if (auth === 'required' && !token) throw new ApiRequestError(401, 'not_authenticated');
  let res: Response;
  try {
    res = await send(token);
    if (res.status === 401 && token) {
      token = await refreshAccessToken();
      if (token) res = await send(token);
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ApiRequestError(0, 'network_unreachable', 'Unable to reach the JenLow server.');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data?.error;
    const code = typeof err === 'string' ? err : err?.code || 'request_failed';
    throw new ApiRequestError(res.status, code, typeof err === 'object' ? err?.message : undefined, err?.requestId);
  }
  return data as T;
}
