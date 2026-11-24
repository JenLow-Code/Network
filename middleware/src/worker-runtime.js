import { pbkdf2Sync } from 'node:crypto';
const enc=new TextEncoder();
const asHex=x=>Array.from(x,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
const rand=(n=32)=>asHex(crypto.getRandomValues(new Uint8Array(n)));
const sha=async s=>asHex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
const answer=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const error=(code,status=400)=>answer({error:code},status);
const b64=x=>btoa(String.fromCharCode(...x)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0));
async function sign(uid,env){const h=b64(enc.encode(JSON.stringify({alg:'HS256',typ:'JWT'})));const p=b64(enc.encode(JSON.stringify({sub:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+900,iss:'jenlow-network-api',aud:'jenlow-network'})));const key=await crypto.subtle.importKey('raw',enc.encode(env.AUTH_JWT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,enc.encode(h+'.'+p));return h+'.'+p+'.'+b64(new Uint8Array(sig));}
async function verify(token,env){try{const [h,p,s]=token.split('.');if(!h||!p||!s)return null;const k=await crypto.subtle.importKey('raw',enc.encode(env.AUTH_JWT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);const good=await crypto.subtle.verify('HMAC',k,ub64(s),enc.encode(h+'.'+p));if(!good)return null;const pay=JSON.parse(new TextDecoder().decode(ub64(p)));return pay.iss==='jenlow-network-api'&&pay.aud==='jenlow-network'&&pay.exp>Math.floor(Date.now()/1000)?pay.sub:null;}catch{return null;}}
async function password(raw,salt,n=210000){return pbkdf2Sync(raw,fromHex(salt),n,32,'sha256').toString('hex');}
async function rate(env,ip,kind,max){const key=await sha(kind+':'+ip),now=Math.floor(Date.now()/1000),w=now-now%900;await env.DB.prepare("INSERT INTO auth_rate_limits(throttle_key,attempt_count,window_start,expires_at) VALUES(?,1,?,?) ON CONFLICT(throttle_key) DO UPDATE SET attempt_count=CASE WHEN window_start=? THEN attempt_count+1 ELSE 1 END,window_start=?,expires_at=?").bind(key,w,w+900,w,w,w+900).run();const row=await env.DB.prepare('SELECT attempt_count FROM auth_rate_limits WHERE throttle_key=?').bind(key).first();return(row?.attempt_count||999)<=max;}
async function session(uid,env){const token=rand(),id=crypto.randomUUID();await env.DB.prepare('INSERT INTO auth_sessions(id,user_id,refresh_token_hash,expires_at) VALUES(?,?,?,?)').bind(id,uid,await sha(token),new Date(Date.now()+30*86400000).toISOString()).run();return {accessToken:await sign(uid,env),refreshToken:token,expiresIn:900,tokenType:'Bearer'};}
const validMail=s=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)&&s.length<=254;
async function register(request,env){if(!await rate(env,request.headers.get('CF-Connecting-IP')||'unknown','register',5))return error('rate_limited',429);const b=await request.json().catch(()=>null);if(!b||typeof b.email!=='string'||typeof b.password!=='string'||typeof b.displayName!=='string')return error('bad_request');if(!validMail(b.email)||b.password.length<12||b.password.length>128||b.displayName.trim().length<2||b.displayName.length>100)return error('invalid_registration');if(!env.BETA_INVITE_CODE||b.inviteCode!==env.BETA_INVITE_CODE)return error('beta_invite_required',403);const email=b.email.trim().toLowerCase();if(await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first())return error('email_unavailable',409);const uid=crypto.randomUUID(),salt=rand(16),hash=await password(b.password,salt),handle='jl_'+uid.replace(/-/g,'').slice(0,15);try{await env.DB.batch([env.DB.prepare('INSERT INTO users(id,handle,display_name,email) VALUES(?,?,?,?)').bind(uid,handle,b.displayName.trim(),email),env.DB.prepare('INSERT INTO email_password_credentials(user_id,password_salt,password_hash,password_iterations) VALUES(?,?,?,210000)').bind(uid,salt,hash),env.DB.prepare('INSERT INTO user_preferences(user_id) VALUES(?)').bind(uid)]);}catch{return error('registration_failed',409);}return answer({user:{id:uid,email,displayName:b.displayName.trim()},session:await session(uid,env)},201);}
async function login(request,env){if(!await rate(env,request.headers.get('CF-Connecting-IP')||'unknown','login',12))return error('rate_limited',429);const b=await request.json().catch(()=>null);if(!b||typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>128)return error('invalid_credentials',401);const row=await env.DB.prepare('SELECT u.id,u.email,u.display_name,u.account_status,c.password_salt,c.password_hash,c.password_iterations FROM users u JOIN email_password_credentials c ON c.user_id=u.id WHERE u.email=?').bind(b.email.toLowerCase().trim()).first();const check=await password(b.password,row?.password_salt||'00112233445566778899aabbccddeeff',row?.password_iterations||210000);if(!row||row.account_status!=='active'||check!==row.password_hash)return error('invalid_credentials',401);return answer({user:{id:row.id,email:row.email,displayName:row.display_name},session:await session(row.id,env)});}
async function refresh(request,env){const b=await request.json().catch(()=>null);if(!b||typeof b.refreshToken!=='string')return error('invalid_refresh');const hashed=await sha(b.refreshToken),row=await env.DB.prepare("SELECT s.id,s.user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_token_hash=? AND s.revoked_at IS NULL AND datetime(s.expires_at)>datetime('now') AND u.account_status='active'").bind(hashed).first();if(!row)return error('invalid_refresh',401);const newToken=rand();const changed=await env.DB.prepare("UPDATE auth_sessions SET refresh_token_hash=?,last_used_at=CURRENT_TIMESTAMP WHERE id=? AND refresh_token_hash=? AND revoked_at IS NULL").bind(await sha(newToken),row.id,hashed).run();if(changed.meta.changes!==1)return error('refresh_replayed',401);return answer({accessToken:await sign(row.user_id,env),refreshToken:newToken,expiresIn:900,tokenType:'Bearer'});}
async function who(request,env){const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];const uid=token?await verify(token,env):null;if(!uid)return error('not_authenticated',401);const user=await env.DB.prepare("SELECT id,handle,display_name,email,account_status FROM users WHERE id=?").bind(uid).first();return user?.account_status==='active'?answer({user}):error('not_authenticated',401);}
async function logout(request,env){const b=await request.json().catch(()=>null);if(!b||typeof b.refreshToken!=='string')return error('refresh_token_required');await env.DB.prepare('UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE refresh_token_hash=?').bind(await sha(b.refreshToken)).run();return answer({ok:true});}

/**
 * One verified sign-in for JenLow Network.
 *
 * Supabase's Auth server validates the incoming Supabase bearer before any D1
 * identity is linked. Never trust JWT claims or a user id provided by clients.
 * Project URL and publishable key are PUBLIC values also in the Expo client.
 * Worker env overrides allow a future key rotation without a code change.
 * The existing AUTH_JWT_SECRET and old email-login routes remain unchanged.
 */
const SUPABASE_DEFAULT_URL="https://ldliraxelqftisjofwgv.supabase.co";
const SUPABASE_DEFAULT_PUBLIC_KEY="sb_publishable_cpxxQyXcEYEy3mwWAaTG9w_QNFg9tC9";
const CONFIRMED_EMAIL=/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;

async function exchangeSupabase(request,env){
  const token=request.headers.get('authorization')?.match(/^Bearer ([^\\s]+)$/i)?.[1];
  if(!token||token.length>8192)return error('not_authenticated',401);
  const base=(env.SUPABASE_URL||SUPABASE_DEFAULT_URL).replace(/\\/$/,'');
  const apikey=env.SUPABASE_PUBLISHABLE_KEY||SUPABASE_DEFAULT_PUBLIC_KEY;
  if(!/^https:\/\/[a-z0-9-]+\\.supabase\\.co$/i.test(base)||!apikey)
    return error('identity_provider_not_configured',503);
  let upstream;
  try{
    upstream=await fetch(base+'/auth/v1/user',{
      method:'GET',
      headers:{apikey,Authorization:'Bearer '+token,Accept:'application/json'},
      redirect:'error',
      signal:AbortSignal.timeout(10000),
    });
  }catch{return error('identity_provider_unavailable',503);}
  if(upstream.status===401||upstream.status===403)
    return error('not_authenticated',401);
  if(!upstream.ok)return error('identity_provider_unavailable',503);
  let identity;
  try{identity=await upstream.json();}catch{
    return error('identity_provider_unavailable',503);
  }
  const email=typeof identity?.email==='string'
    ?identity.email.toLowerCase().trim():'';
  const subject=identity?.id;
  if(typeof subject!=='string'||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject)||
      !CONFIRMED_EMAIL.test(email)||email.length>254||
      !(identity.email_confirmed_at||identity.confirmed_at)||
      identity.is_anonymous===true)
    return error('unverified_identity',403);
  const providerSubject='supabase:'+subject;
  let member=await env.DB.prepare(
    "SELECT u.id,u.email,u.handle,u.display_name,u.account_status "+
    "FROM auth_identities i JOIN users u ON u.id=i.user_id "+
    "WHERE i.provider='oidc' AND i.provider_subject=?"
  ).bind(providerSubject).first();
  if(!member){
    // Existing member retains every project, message and account relation.
    // The verified Supabase email is the only allowed account match.
    member=await env.DB.prepare(
      'SELECT id,email,handle,display_name,account_status FROM users WHERE email=?'
    ).bind(email).first();
    if(member){
      if(member.account_status!=='active')return error('account_disabled',403);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO auth_identities(id,user_id,provider,provider_subject) "+
        "VALUES(?,?,'oidc',?)"
      ).bind(crypto.randomUUID(),member.id,providerSubject).run();
    }else{
      const id=crypto.randomUUID();
      const name=String(identity.user_metadata?.display_name||
        identity.user_metadata?.full_name||email.split('@')[0]||'Membre JenLow')
        .replace(/[\\r\\n\\t]/g,' ').trim().slice(0,90)||'Membre JenLow';
      const handle='jl_'+id.replace(/-/g,'').slice(0,15);
      try{
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO users(id,handle,display_name,email,email_verified_at) "+
            "VALUES(?,?,?,?,CURRENT_TIMESTAMP)"
          ).bind(id,handle,name,email),
          env.DB.prepare(
            'INSERT INTO user_preferences(user_id) VALUES(?)'
          ).bind(id),
          env.DB.prepare(
            "INSERT INTO auth_identities(id,user_id,provider,provider_subject) "+
            "VALUES(?,?,'oidc',?)"
          ).bind(crypto.randomUUID(),id,providerSubject),
        ]);
        member={id,email,handle,display_name:name,account_status:'active'};
      }catch{
        // Concurrent sign-in must never result in two different memberships
        // claiming the same verified Supabase user. Re-read identity.
        member=await env.DB.prepare(
          "SELECT u.id,u.email,u.handle,u.display_name,u.account_status "+
          "FROM auth_identities i JOIN users u ON u.id=i.user_id "+
          "WHERE i.provider='oidc' AND i.provider_subject=?"
        ).bind(providerSubject).first();
        if(!member)return error('identity_link_failed',409);
      }
    }
  }
  // INSERT OR IGNORE can lose a race; only the exact authorized subject wins.
  const binding=await env.DB.prepare(
    "SELECT user_id FROM auth_identities WHERE provider='oidc' "+
    "AND provider_subject=?"
  ).bind(providerSubject).first();
  if(!member||binding?.user_id!==member.id)return error('identity_link_failed',409);
  if(member.account_status!=='active'||member.email.toLowerCase()!==email)
    return error('not_authenticated',401);
  return answer({
    user:{id:member.id,email,displayName:member.display_name,handle:member.handle},
    accessToken:await sign(member.id,env),expiresIn:900,tokenType:'Bearer',
  });
}

export default {async fetch(request,env){const path=new URL(request.url).pathname,origin=request.headers.get('origin'),allowed=env.ALLOWED_ORIGIN?.split(',').map(x=>x.trim()).includes(origin);if(origin&&!allowed)return error('origin_not_allowed',403);const cors=allowed?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization'}:{};if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});let response;try{if(path==='/health')response=answer({status:'ok',auth:'email-beta'});else if(!env.DB||!env.AUTH_JWT_SECRET)response=error('server_not_configured',503);else if(path==='/v1/auth/email/register'&&request.method==='POST')response=await register(request,env);else if(path==='/v1/auth/email/login'&&request.method==='POST')response=await login(request,env);else if(path==='/v1/auth/refresh'&&request.method==='POST')response=await refresh(request,env);else if(path==='/v1/auth/me'&&request.method==='GET')response=await who(request,env);else if(path==='/v1/auth/supabase/exchange'&&request.method==='POST')response=await exchangeSupabase(request,env);else if(path==='/v1/auth/logout'&&request.method==='POST')response=await logout(request,env);else response=error('not_found',404);}catch(e){console.error('auth_failure',e&&e.name||'unknown');response=e?.name==='NotSupportedError'?error('password_auth_unavailable',503):error('server_error',500);}Object.entries(cors).forEach(([k,v])=>response.headers.set(k,v));return response;}};