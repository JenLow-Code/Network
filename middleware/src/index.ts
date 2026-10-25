import {createRemoteJWKSet,jwtVerify,SignJWT} from 'jose';

interface Env { DB:D1Database; AUTH_JWT_SECRET:string; ALLOWED_ORIGIN:string; GOOGLE_CLIENT_IDS:string; APPLE_CLIENT_IDS:string }
type Provider='google'|'apple';
type IdClaims={sub:string;email?:string;email_verified?:string|boolean;name?:string};
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleKeys=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const encoder=new TextEncoder();
const unauthorized=()=>json({error:'not_authenticated'},401);
function json(body:unknown,status=200,extra?:HeadersInit):Response{return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(extra||{})}})}
function bad(message:string,status=400):Response{return json({error:message},status)}
function hex(bytes:ArrayBuffer):string{return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
async function sha256(raw:string):Promise<string>{return hex(await crypto.subtle.digest('SHA-256',encoder.encode(raw)))}
function randomToken():string{return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}
function allowOrigin(request:Request,env:Env):HeadersInit|undefined{
 const origin=request.headers.get('Origin');
 if(!origin)return undefined;
 if(origin!==env.ALLOWED_ORIGIN)return undefined;
 return {'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
}
function configOk(env:Env):boolean{return Boolean(env.AUTH_JWT_SECRET?.length>=32&&env.DB&&env.GOOGLE_CLIENT_IDS&&!env.GOOGLE_CLIENT_IDS.startsWith('REPLACE')&&env.APPLE_CLIENT_IDS&&!env.APPLE_CLIENT_IDS.startsWith('REPLACE'))}
async function verifyExternal(provider:Provider,idToken:string,env:Env,nonce?:string):Promise<IdClaims>{
 const ids=(provider==='google'?env.GOOGLE_CLIENT_IDS:env.APPLE_CLIENT_IDS).split(',').map(s=>s.trim()).filter(Boolean);
 if(ids.length===0)throw new Error('provider_not_configured');
 const key=provider==='google'?googleKeys:appleKeys;
 const issuer=provider==='google'?['https://accounts.google.com','accounts.google.com']:'https://appleid.apple.com';
 const {payload}=await jwtVerify(idToken,key,{issuer,audience:ids,algorithms:['RS256'],clockTolerance:30,maxTokenAge:'10m'});
 if(!payload.sub)throw new Error('subject_missing');
 if(nonce&&payload.nonce!==nonce)throw new Error('nonce_mismatch');
 return {sub:payload.sub,email:typeof payload.email==='string'?payload.email:undefined,email_verified:payload.email_verified as boolean|string|undefined,name:typeof payload.name==='string'?payload.name:undefined};
}
async function createAccessToken(userId:string,env:Env):Promise<string>{
 return new SignJWT({scope:'member'}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(userId).setIssuer('jenlow-network-api').setAudience('jenlow-network').setIssuedAt().setExpirationTime('15m').sign(encoder.encode(env.AUTH_JWT_SECRET));
}
async function sessionFor(userId:string,env:Env):Promise<object>{
 const refreshToken=randomToken(),id=crypto.randomUUID(),expiresAt=new Date(Date.now()+30*86400e3).toISOString();
 await env.DB.prepare("INSERT INTO auth_sessions (id,user_id,refresh_token_hash,expires_at) VALUES(?,?,?,?)").bind(id,userId,await sha256(refreshToken),expiresAt).run();
 return {accessToken:await createAccessToken(userId,env),refreshToken,tokenType:'Bearer',expiresIn:900};
}
async function authenticate(request:Request,env:Env):Promise<string|null>{
 const raw=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!raw)return null;
 try{const {payload}=await jwtVerify(raw,encoder.encode(env.AUTH_JWT_SECRET),{issuer:'jenlow-network-api',audience:'jenlow-network',algorithms:['HS256']});return typeof payload.sub==='string'?payload.sub:null}catch{return null}
}
function validBody(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value)}
async function exchange(request:Request,env:Env){
 const b=await request.json().catch(()=>null);
 if(!validBody(b)||!(b.provider==='google'||b.provider==='apple')||typeof b.idToken!=='string'||b.idToken.length>12000)return bad('invalid_credentials_payload');
 const provider=b.provider as Provider;
 let claims:IdClaims;
 try{claims=await verifyExternal(provider,b.idToken,env,typeof b.nonce==='string'?b.nonce:undefined)}
 catch{return bad('invalid_identity_token',401)}
 const linked=await env.DB.prepare("SELECT user_id FROM auth_identities WHERE provider=? AND provider_subject=?").bind(provider,claims.sub).first<{user_id:string}>();
 let userId=linked?.user_id;
 if(!userId){
  // Do not merge identities automatically by email: identity-linking requires an authenticated workflow.
  const email=(claims.email||'').toLowerCase().trim();
  if(!email||!(claims.email_verified===true||claims.email_verified==='true'))return bad('verified_email_required_on_first_sign_in',422);
  const conflict=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if(conflict)return bad('account_exists_use_existing_provider',409);
  userId=crypto.randomUUID();
  const handle='jl_'+userId.replace(/-/g,'').slice(0,15);
  await env.DB.batch([
   env.DB.prepare("INSERT INTO users(id,handle,display_name,email,email_verified_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").bind(userId,handle,(claims.name||email.split('@')[0]).slice(0,100),email),
   env.DB.prepare("INSERT INTO auth_identities(id,user_id,provider,provider_subject) VALUES(?,?,?,?)").bind(crypto.randomUUID(),userId,provider,claims.sub),
   env.DB.prepare("INSERT INTO user_preferences(user_id) VALUES(?)").bind(userId)
  ]);
 }
 const user=await env.DB.prepare("SELECT id,handle,display_name,email,account_status FROM users WHERE id=?").bind(userId).first<{id:string;handle:string;display_name:string;email:string;account_status:string}>();
 if(!user||user.account_status!=='active')return bad('account_unavailable',403);
 return json({user:{id:user.id,handle:user.handle,displayName:user.display_name,email:user.email},session:await sessionFor(user.id,env)});
}
async function refresh(request:Request,env:Env){
 const b=await request.json().catch(()=>null);
 if(!validBody(b)||typeof b.refreshToken!=='string')return bad('refresh_token_required');
 const hash=await sha256(b.refreshToken);
 const row=await env.DB.prepare("SELECT s.id,s.user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_token_hash=? AND s.revoked_at IS NULL AND datetime(s.expires_at)>datetime('now') AND u.account_status='active'").bind(hash).first<{id:string;user_id:string}>();
 if(!row)return bad('invalid_refresh_token',401);
 const next=randomToken(),nextHash=await sha256(next);
 const result=await env.DB.prepare("UPDATE auth_sessions SET refresh_token_hash=?,last_used_at=CURRENT_TIMESTAMP WHERE id=? AND refresh_token_hash=? AND revoked_at IS NULL").bind(nextHash,row.id,hash).run();
 if(result.meta.changes!==1)return bad('refresh_replay_detected',401);
 return json({accessToken:await createAccessToken(row.user_id,env),refreshToken:next,tokenType:'Bearer',expiresIn:900});
}
async function me(request:Request,env:Env){
 const uid=await authenticate(request,env);if(!uid)return unauthorized();
 const u=await env.DB.prepare("SELECT id,handle,display_name,email,bio,city,church_name,account_status FROM users WHERE id=?").bind(uid).first();
 if(!u||u.account_status!=='active')return unauthorized();
 return json({user:u});
}
async function logout(request:Request,env:Env){
 const b=await request.json().catch(()=>null);
 if(!validBody(b)||typeof b.refreshToken!=='string')return bad('refresh_token_required');
 const hash=await sha256(b.refreshToken);
 await env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE refresh_token_hash=?").bind(hash).run();
 return json({ok:true});
}
async function participants(request:Request,env:Env,dreamId:string){
 const userId=await authenticate(request,env);if(!userId)return unauthorized();
 const owner=await env.DB.prepare("SELECT 1 FROM dream_owners WHERE dream_id=? AND user_id=? AND status='accepted'").bind(dreamId,userId).first();
 if(!owner)return bad('owner_only',403);
 const {results}=await env.DB.prepare("SELECT u.id,u.handle,u.display_name FROM dream_same_dream s JOIN users u ON s.user_id=u.id WHERE s.dream_id=? AND u.account_status='active' ORDER BY s.created_at DESC LIMIT 100").bind(dreamId).all();
 return json({dreamId,participants:results});
}
async function requestDeletion(request:Request,env:Env){
 const userId=await authenticate(request,env);if(!userId)return unauthorized();
 await env.DB.batch([
  env.DB.prepare("UPDATE users SET account_status='deleting' WHERE id=?").bind(userId),
  env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL").bind(userId),
  env.DB.prepare("INSERT INTO audit_log(id,actor_id,operation,entity_type,entity_id) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),userId,'account_deletion_requested','user',userId)
 ]);
 return json({accepted:true,message:'Account deactivated and all refresh sessions revoked. Erasure workflow must be completed by backend operators.'},202);
}
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 const headers=allowOrigin(request,env);
 if(request.headers.get('Origin')&&!headers)return bad('origin_not_allowed',403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 let response:Response;
 try{
 if(path==='/health'&&request.method==='GET')response=json({status:'ok'});
 else if(!configOk(env))response=bad('authentication_not_configured',503);
 else if(path==='/v1/auth/exchange'&&request.method==='POST')response=await exchange(request,env);
 else if(path==='/v1/auth/refresh'&&request.method==='POST')response=await refresh(request,env);
 else if(path==='/v1/auth/logout'&&request.method==='POST')response=await logout(request,env);
 else if(path==='/v1/auth/me'&&request.method==='GET')response=await me(request,env);
 else if(path==='/v1/account/deletion-request'&&request.method==='POST')response=await requestDeletion(request,env);
 else if(request.method==='GET'&&/^\/v1\/dreams\/[a-zA-Z0-9_-]{1,80}\/participants$/.test(path))response=await participants(request,env,path.split('/')[3]);
 else response=bad('not_found',404);
 }catch(err){response=bad('request_failed',500);}
 new Headers(headers).forEach((value,key)=>response.headers.set(key,value));
 return response;
 }};
