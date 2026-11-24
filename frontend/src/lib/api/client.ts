/**
 * JenLow API client. Supabase verifies the login; our own Worker exchanges
 * that trusted identity for a short-lived JenLow API token. Neither the
 * Worker token nor a second Worker refresh credential is stored on disk.
 */
import {API_BASE} from '@/lib/authApi';
import {supabase} from '@/lib/supabaseClient';
import {currentAccessToken,setAccessToken} from './session';

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

/**
 * Auth exchange diagnostics contain only a stable error code and HTTP status,
 * NEVER the Supabase token or member identity. Safe to show in Login.
 */
export type AuthBridgeFailure={code:string;status:number};
let lastBridgeFailure:AuthBridgeFailure|null=null;
export const latestAuthBridgeFailure=()=>lastBridgeFailure;

/**
 * Exchange an explicit Supabase bearer after AuthProvider has verified its
 * owner with Supabase Auth /user. Do not depend on getSession() again here:
 * a fresh Google PKCE session can race with the initial app restoration and
 * with the background shared refresh promise.
 *
 * This only mints a Worker bearer. Private navigation still requires
 * AuthProvider to check /v1/auth/me and match active user + email.
 */
export async function exchangeSupabaseBearer(supabaseBearer:string):Promise<string|null>{
  if(!supabaseBearer){
    lastBridgeFailure={code:'supabase_session_missing',status:0};
    return null;
  }
  lastBridgeFailure=null;
  try{
    const response=await fetch(API_BASE+'/v1/auth/supabase/exchange',{
      method:'POST',
      headers:{Accept:'application/json',Authorization:'Bearer '+supabaseBearer},
    });
    if(!response.ok){
      const body=await response.json().catch(()=>null) as {
        error?:string|{code?:string};
      }|null;
      const code=typeof body?.error==='string'?body.error:
        body?.error?.code||'exchange_http_'+response.status;
      lastBridgeFailure={code,status:response.status};
      setAccessToken(null);
      if(response.status===401||response.status===403)
        listeners.forEach(fn=>fn(false));
      return null;
    }
    const exchanged=await response.json() as {
      accessToken?:string;expiresIn?:number;
    };
    if(!exchanged.accessToken){
      lastBridgeFailure={code:'exchange_response_invalid',status:response.status};
      return null;
    }
    setAccessToken(exchanged.accessToken,exchanged.expiresIn||900);
    listeners.forEach(fn=>fn(true));
    return exchanged.accessToken;
  }catch{
    lastBridgeFailure={code:'exchange_network_unreachable',status:0};
    return null;
  }
}

/** Transparently restore the API token from a validated Supabase login. */
export function refreshAccessToken():Promise<string|null>{
  if(refreshing)return refreshing;
  refreshing=(async()=>{
    try{
      if(!supabase)return null;
      const {data,error}=await supabase.auth.getSession();
      if(error||!data.session?.access_token){
        lastBridgeFailure={code:'supabase_session_missing',status:0};
        setAccessToken(null);
        listeners.forEach(fn=>fn(false));
        return null;
      }
      // The Worker revalidates this bearer against Supabase Auth /user.
      return await exchangeSupabaseBearer(data.session.access_token);
    }catch{
      lastBridgeFailure={code:'supabase_session_read_failed',status:0};
      return null;
    }finally{refreshing=null;}
  })();
  return refreshing;
}

type Options = { method?: string; body?: unknown; auth?: 'optional' | 'required' | 'none'; idempotencyKey?: string; signal?: AbortSignal };

/** JSON request to the JenLow API with transparent access-token refresh. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  // Private API data is never fetched as an anonymous fallback. The beta
  // mock catalog uses a separate, explicitly fictional endpoint.
  const auth = options.auth ?? (path.startsWith('/api/')?'required':'optional');
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
  let token=auth==='none'?null:currentAccessToken()??await refreshAccessToken();
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
    // A revoked or expired JenLow API identity closes the entire protected
    // application. Refresh attempts are handled above; do not keep rendering
    // Discovery or private workspaces after a second 401.
    if (auth!=='none' && res.status===401){
      setAccessToken(null);
      listeners.forEach(fn=>fn(false));
    }
    throw new ApiRequestError(res.status, code, typeof err === 'object' ? err?.message : undefined, err?.requestId);
  }
  return data as T;
}
