import type { Env } from './core/config';
import type { ExecutionContext } from './core/platform';
import { MIN_SECRET_LENGTH,allowedOrigins } from './core/config';
import { Ctx } from './core/context';
import { Router } from './core/router';
import { ApiError } from './core/errors';
import { errorResponse,json,legacyError } from './core/respond';
import * as auth from './authentication/routes';
import { exchangeSupabase } from './authentication/supabase';
import { openApi } from './core/openapi';
export const API_VERSION='2.0.0-security';
export function buildRouter():Router {
 const r=new Router();
 r.add('GET','/health',{tag:'System',summary:'Liveness',auth:'none'},()=>({status:'ok',auth:'email-beta',version:API_VERSION}));
 r.add('GET','/api/health/ready',{tag:'System',summary:'Identity schema readiness',auth:'none'},async ctx=>{
   const names=await ctx.sql.all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','auth_identities','auth_sessions','email_password_credentials','auth_rate_limits','user_preferences','user_roles')");
   const ready=names.length===7;
   return json({status:ready?'ready':'degraded',scope:'security',functionalBackend:'not_connected'},ready?200:503);
 });
 r.add('GET','/api/openapi.json',{tag:'System',summary:'Security API specification',auth:'none'},()=>openApi(r,API_VERSION));
 r.add('POST','/v1/auth/email/register',{tag:'Auth',summary:'Beta registration',auth:'none',status:201},auth.register);
 r.add('POST','/v1/auth/email/login',{tag:'Auth',summary:'Email login',auth:'none'},auth.login);
 r.add('POST','/v1/auth/supabase/exchange',{tag:'Auth',summary:'Verified Supabase identity',auth:'none'},exchangeSupabase);
 r.add('POST','/v1/auth/refresh',{tag:'Auth',summary:'Rotate refresh token',auth:'none'},auth.refresh);
 r.add('POST','/v1/auth/logout',{tag:'Auth',summary:'Revoke refresh token',auth:'none'},auth.logout);
 r.add('GET','/v1/auth/me',{tag:'Auth',summary:'Current identity',auth:'required'},auth.me);
 r.add('GET','/api/me',{tag:'Auth',summary:'Current identity only; no product profile data',auth:'required'},auth.me);
 return r;
}
export const router=buildRouter();
export async function handle(request:Request,env:Env,exec?:ExecutionContext):Promise<Response>{
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 const requestId=crypto.randomUUID();
 const origin=request.headers.get('origin');
 const allowed=!origin||allowedOrigins(env).includes(origin);
 const finish=(response:Response)=>{
   const out=new Response(response.body,response);
   if(allowed&&origin){const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,Idempotency-Key,If-Match,X-Request-Id','Access-Control-Expose-Headers':'X-Request-Id','Access-Control-Max-Age':'600'};for(const [k,v] of Object.entries(headers))out.headers.set(k,v);}
   out.headers.set('X-Request-Id',requestId);out.headers.set('Cache-Control','no-store');out.headers.set('X-Content-Type-Options','nosniff');return out;
 };
 const legacy=path.startsWith('/v1/auth/');
 const fail=(e:ApiError)=>finish(legacy?legacyError(e.code,e.status):errorResponse(e,requestId));
 if(!allowed)return fail(new ApiError(403,'origin_not_allowed'));
 if(request.method==='OPTIONS')return finish(new Response(null,{status:204}));
 try{
   if(path!=='/health'&&(!env.DB||!env.AUTH_JWT_SECRET||env.AUTH_JWT_SECRET.length<MIN_SECRET_LENGTH))return fail(new ApiError(503,'server_not_configured'));
   const match=router.match(request.method,path);
   if(!match)return fail(new ApiError(404,'route_not_found'));
   if('allowed' in match)return finish(json({error:{code:'method_not_allowed',requestId}},405,{Allow:match.allowed.join(', ')}));
   const ctx=new Ctx(request,env,exec,requestId);ctx.params=match.params;
   if(match.route.auth==='required')await ctx.user();
   else if(match.route.auth==='moderator')await ctx.moderator();
   else if(match.route.auth==='optional'&&request.headers.has('authorization'))await ctx.user();
   const result=await match.route.handler(ctx);
   return finish(result instanceof Response?result:json(result??{},match.route.status??200));
 }catch(error){
   if(error instanceof ApiError)return fail(error);
   console.error(JSON.stringify({level:'error',requestId,error:error instanceof Error?error.name:'unknown'}));
   return fail(new ApiError(503,'security_service_unavailable'));
 }
}
