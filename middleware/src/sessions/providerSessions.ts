import type {Ctx} from '../core/context';
import {fromB64url,newId} from '../core/database';
import {bearer,signAccessToken,verifyTokenClaims} from './tokens';
import {legacyError,json} from '../core/respond';

export const INACTIVE_SECONDS=7*24*60*60;
export const REVALIDATE_SECONDS=2*60*60;
export const currentProduct=(ctx:Ctx)=>ctx.env.PRODUCT||'network';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seconds=()=>Math.floor(Date.now()/1000);

/** Only called after the authoritative provider verified this exact bearer. */
export function providerSessionId(token:string,subject:string):string|null{
  try{
    const parts=token.split('.');
    if(parts.length!==3)return null;
    const claims=JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
    return claims.sub===subject&&typeof claims.session_id==='string'&&UUID.test(claims.session_id)?claims.session_id:null;
  }catch{return null;}
}
export async function issueProviderSession(ctx:Ctx,userId:string,providerId:string){
  const product=currentProduct(ctx),now=seconds();
  // A verified Network login provisions its own technical profile only.
  // Other products must use their own trusted provisioning flow.
  if(product==='network')await ctx.sql.run("INSERT INTO product_profiles(id,user_id,product) VALUES(?,?,'network') ON CONFLICT(user_id,product) DO NOTHING",newId(),userId);
  const profile=await ctx.sql.first<{id:string}>("SELECT id FROM product_profiles WHERE user_id=? AND product=? AND status='active'",userId,product);
  if(!profile)return null;
  await ctx.sql.run(`INSERT INTO provider_sessions(id,provider_session_id,user_id,profile_id,product,created_at,last_activity_at,verified_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(provider_session_id,product) DO NOTHING`,newId(),providerId,userId,profile.id,product,now,now,now);
  const row=await ctx.sql.first<{id:string}>("SELECT id FROM provider_sessions WHERE provider_session_id=? AND user_id=? AND profile_id=? AND product=? AND revoked_at IS NULL AND last_activity_at>?",providerId,userId,profile.id,product,now-INACTIVE_SECONDS);
  if(!row)return null;
  const changed=await ctx.sql.run("UPDATE provider_sessions SET verified_at=? WHERE id=? AND revoked_at IS NULL AND last_activity_at>?",now,row.id,now-INACTIVE_SECONDS);
  if(changed!==1)return null;
  return {accessToken:await signAccessToken(userId,ctx.env,now,{sid:row.id,product}),profileId:profile.id};
}
export async function activeProviderSession(ctx:Ctx,uid:string,sid:string,product:string){
  if(product!==currentProduct(ctx))return null;
  const now=seconds();
  return ctx.sql.first<{profile_id:string;roles:string|null}>(`SELECT s.profile_id,
    (SELECT group_concat(role) FROM product_role_grants g WHERE g.profile_id=s.profile_id) roles
    FROM provider_sessions s JOIN product_profiles p ON p.id=s.profile_id AND p.user_id=s.user_id AND p.product=s.product
    WHERE s.id=? AND s.user_id=? AND s.product=? AND p.status='active' AND s.revoked_at IS NULL
      AND s.last_activity_at>? AND s.verified_at>?`,sid,uid,product,now-INACTIVE_SECONDS,now-REVALIDATE_SECONDS);
}
export async function sessionActivity(ctx:Ctx){
  const token=bearer(ctx.request),claims=token?await verifyTokenClaims(token,ctx.env):null;
  if(!claims?.sid||!claims.product||!await activeProviderSession(ctx,claims.sub,claims.sid,claims.product))return legacyError('not_authenticated',401);
  const now=seconds();
  const changed=await ctx.sql.run("UPDATE provider_sessions SET last_activity_at=max(last_activity_at,?) WHERE id=? AND user_id=? AND product=? AND revoked_at IS NULL AND last_activity_at>?",now,claims.sid,claims.sub,claims.product,now-INACTIVE_SECONDS);
  return changed===1?json({ok:true}):legacyError('not_authenticated',401);
}
export async function revokeSession(ctx:Ctx){
  const token=bearer(ctx.request),claims=token?await verifyTokenClaims(token,ctx.env):null;
  if(!claims?.sid||claims.product!==currentProduct(ctx))return legacyError('not_authenticated',401);
  await ctx.sql.run("UPDATE provider_sessions SET revoked_at=coalesce(revoked_at,?) WHERE id=? AND user_id=? AND product=?",seconds(),claims.sid,claims.sub,claims.product);
  return json({ok:true});
}
