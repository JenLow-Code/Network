import type {Ctx} from '../http/context';
import {json,legacyError} from '../http/respond';
import {newId} from '../lib/util';
import {bearer,signAccessToken,ACCESS_TTL_SECONDS} from './tokens';

/**
 * Exchange a SERVER-VERIFIED Supabase login into JenLow's D1 identity.
 * Never trust client-supplied user IDs, emails or JWT claims without asking
 * the configured Supabase Auth server to validate the bearer token.
 */
type SupabaseUser={
  id:string;email?:string;email_confirmed_at?:string|null;
  confirmed_at?:string|null;is_anonymous?:boolean;
  user_metadata?:{display_name?:string;full_name?:string};
};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPABASE_PROJECT='https://ldliraxelqftisjofwgv.supabase.co';

export async function exchangeSupabase(ctx:Ctx):Promise<Response>{
  const incoming=bearer(ctx.request);
  if(!incoming||incoming.length>8192)return legacyError('not_authenticated',401);
  const base=(ctx.env.SUPABASE_URL||SUPABASE_PROJECT).replace(/\/$/,'');
  const apiKey=ctx.env.SUPABASE_PUBLISHABLE_KEY;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)||!apiKey){
    return legacyError('identity_provider_not_configured',503);
  }
  let user:SupabaseUser;
  try{
    const res=await fetch(base+'/auth/v1/user',{
      method:'GET',
      headers:{apikey:apiKey,Authorization:'Bearer '+incoming,Accept:'application/json'},
      redirect:'error',
    });
    if(res.status===401||res.status===403)return legacyError('not_authenticated',401);
    if(!res.ok)return legacyError('identity_provider_unavailable',503);
    user=await res.json() as SupabaseUser;
  }catch{
    return legacyError('identity_provider_unavailable',503);
  }
  const email=String(user.email||'').trim().toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(user.id||'')||
      !EMAIL.test(email)||!user.email_confirmed_at&&!user.confirmed_at||
      user.is_anonymous){
    return legacyError('unverified_identity',403);
  }
  const subject='supabase:'+user.id;
  type D1Member={id:string;email:string;handle:string;display_name:string;
    account_status:string};
  let member=await ctx.sql.first<D1Member>(
    "SELECT u.id,u.email,u.handle,u.display_name,u.account_status FROM auth_identities i JOIN users u ON u.id=i.user_id WHERE i.provider='oidc' AND i.provider_subject=?",
    subject,
  );
  if(!member){
    // Only a CONFIRMED Supabase identity may be linked to a D1 account with
    // the same verified email. A suspended account is never reactivated.
    member=await ctx.sql.first<D1Member>(
      'SELECT id,email,handle,display_name,account_status FROM users WHERE email=?',
      email,
    );
    if(member){
      if(member.account_status!=='active')return legacyError('account_disabled',403);
      try{
        await ctx.sql.run(
          "INSERT OR IGNORE INTO auth_identities(id,user_id,provider,provider_subject) VALUES(?,?,'oidc',?)",
          newId(),member.id,subject,
        );
      }catch{return legacyError('identity_link_failed',409);}
    }else{
      const id=newId();
      const name=(user.user_metadata?.display_name||
        user.user_metadata?.full_name||email.split('@')[0]||'Membre JenLow')
        .replace(/[\r\n\t]/g,' ').trim().slice(0,90)||'Membre JenLow';
      const handle='jl_'+id.replace(/-/g,'').slice(0,15);
      try{
        await ctx.sql.batch([
          ctx.sql.stmt(
            'INSERT INTO users(id,handle,display_name,email,email_verified_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)',
            id,handle,name,email,
          ),
          ctx.sql.stmt('INSERT INTO user_preferences(user_id) VALUES(?)',id),
          ctx.sql.stmt(
            "INSERT INTO auth_identities(id,user_id,provider,provider_subject) VALUES(?,?,'oidc',?)",
            newId(),id,subject,
          ),
        ]);
      }catch{
        // A concurrent exchange may have created exactly the same identity.
        const existing=await ctx.sql.first<D1Member>(
          "SELECT u.id,u.email,u.handle,u.display_name,u.account_status FROM auth_identities i JOIN users u ON u.id=i.user_id WHERE i.provider='oidc' AND i.provider_subject=?",
          subject,
        );
        if(!existing)return legacyError('identity_link_failed',409);
        member=existing;
      }
      if(!member)member={id,email,handle,display_name:name,account_status:'active'};
    }
  }
  // Re-read the unique provider subject. INSERT OR IGNORE must never silently
  // link the requesting identity to a different account in a concurrent race.
  const binding=await ctx.sql.first<{user_id:string}>(
    "SELECT user_id FROM auth_identities WHERE provider='oidc' AND provider_subject=?",
    subject,
  );
  if(!binding||binding.user_id!==member.id){
    return legacyError('identity_link_failed',409);
  }
  if(member.account_status!=='active'||member.email.toLowerCase()!==email){
    return legacyError('not_authenticated',401);
  }
  // No second persisted refresh credential: Supabase refreshes its own
  // verified session silently; this short-lived access JWT stays in memory.
  return json({
    user:{id:member.id,email,displayName:member.display_name,handle:member.handle},
    accessToken:await signAccessToken(member.id,ctx.env),
    expiresIn:ACCESS_TTL_SECONDS,tokenType:'Bearer',
  });
}
