/**
 * Network public API entry point. Shared security is reached through a private
 * Worker service binding, not by calling a public middleware URL.
 * No functional endpoint is forwarded until the Network backend is installed
 * and its resource authorization contract is verified.
 */
type Fetcher={fetch(request:Request):Promise<Response>};
type Env={SECURITY?:Fetcher;ALLOWED_ORIGIN?:string};
const routes=new Map<string,{method:string;path:string}>([
  ['/core/identity',{method:'GET',path:'/v1/auth/me'}],
  ['/core/auth/supabase/exchange',{method:'POST',path:'/v1/auth/supabase/exchange'}],
  ['/v1/auth/me',{method:'GET',path:'/v1/auth/me'}],
  ['/v1/auth/supabase/exchange',{method:'POST',path:'/v1/auth/supabase/exchange'}],
  ['/core/session/activity',{method:'POST',path:'/v1/auth/session/activity'}],
  ['/core/session/revoke',{method:'POST',path:'/v1/auth/session/revoke'}],
  ['/v1/auth/session/activity',{method:'POST',path:'/v1/auth/session/activity'}],
  ['/v1/auth/session/revoke',{method:'POST',path:'/v1/auth/session/revoke'}],
  ['/api/health/ready',{method:'GET',path:'/api/health/ready'}],
]);
export async function handle(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  const origin=request.headers.get('origin');
  const allowed=!!origin&&(env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim()).includes(origin);
  const requestId=crypto.randomUUID();
  const finish=(response:Response)=>{
    const h=new Headers(response.headers);
    for(const k of ['access-control-allow-origin','access-control-allow-credentials','access-control-allow-methods','access-control-allow-headers','access-control-expose-headers','access-control-max-age'])h.delete(k);
    if(allowed&&origin){
      h.set('Access-Control-Allow-Origin',origin);h.set('Vary','Origin');
      h.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');
      h.set('Access-Control-Allow-Headers','Authorization,Content-Type');
      h.set('Access-Control-Expose-Headers','X-Request-Id');
    }
    h.set('Cache-Control','no-store');h.set('X-Content-Type-Options','nosniff');h.set('X-Request-Id',requestId);
    return new Response(response.body,{status:response.status,headers:h});
  };
  const json=(data:unknown,status=200)=>finish(Response.json(data,{status}));
  const error=(code:string,status:number)=>json({error:{code,requestId}},status);
  if(origin&&!allowed)return error('origin_not_allowed',403);
  const route=routes.get(url.pathname);
  if(request.method==='OPTIONS'){
    if(!route)return error('route_not_found',404);
    return finish(new Response(null,{status:204}));
  }
  if(url.pathname==='/health'&&request.method==='GET')return json({status:'ok',product:'network',security:env.SECURITY?'bound':'not_configured',functionalBackend:'not_connected'});
  if(!route)return error('route_not_found',404);
  if(request.method!==route.method)return error('method_not_allowed',405);
  if(!env.SECURITY)return error('security_service_unavailable',503);
  // No arbitrary target, query, identity, role or product headers are passed.
  const headers=new Headers();
  for(const k of ['authorization','content-type','accept']){
    const v=request.headers.get(k);if(v)headers.set(k,v);
  }
  const clientIp=request.headers.get('CF-Connecting-IP');
  if(clientIp)headers.set('X-JenLow-Client-IP',clientIp);
  try{
    const upstream=await env.SECURITY.fetch(new Request('https://middleware.internal'+route.path,{method:route.method,headers}));
    return finish(upstream);
  }catch{return error('security_service_unavailable',503);}
}
export default {fetch:handle};
