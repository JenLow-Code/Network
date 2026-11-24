
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp, SECRET, ORIGIN} from './helpers/app.ts';
// @ts-expect-error production Workers entry uses plain JavaScript
import legacy from '../src/worker-runtime.js';

const UUID='4ec693bf-0d25-4ad8-8284-9f3b8cb0ca79';
const SECOND_UUID='ee0f45c1-7e15-43a0-a242-f2a87bcb05f8';
const envFor=(db:unknown)=>({DB:db,AUTH_JWT_SECRET:SECRET,ALLOWED_ORIGIN:ORIGIN});
const call=async(env:object,token?:string,origin?:string)=>{
  const headers:Record<string,string>={};
  if(token)headers.Authorization='Bearer '+token;
  if(origin)headers.Origin=origin;
  const response:Response=await legacy.fetch(
    new Request('https://legacy.test/v1/auth/supabase/exchange',{
      method:'POST',headers,
    }),env);
  return {status:response.status,headers:response.headers,
    body:await response.json() as any};
};
function stubSupabase(options:{id?:string;email?:string;verified?:boolean;
  anonymous?:boolean;status?:number;networkError?:boolean}={}){
  const old=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    calls++;
    assert.equal(String(input),
      'https://ldliraxelqftisjofwgv.supabase.co/auth/v1/user');
    assert.equal(init?.method,'GET');
    assert.match(String((init?.headers as Record<string,string>)?.apikey||''),
      /^sb_publishable_/);
    assert.equal((init?.headers as Record<string,string>)?.Authorization,
      'Bearer validated-supabase-token');
    assert.equal(init?.redirect,'error');
    // The legacy Cloudflare production Worker must not require an
    // AbortSignal.timeout implementation to contact Supabase Auth.
    assert.equal(init?.signal,undefined);
    if(options.networkError)throw new Error('upstream_offline');
    const status=options.status??200;
    return new Response(JSON.stringify(status===200?{
      id:options.id??UUID,
      email:options.email??'linked@example.test',
      email_confirmed_at:options.verified===false?null:'2026-11-01T00:00:00Z',
      is_anonymous:!!options.anonymous,
      user_metadata:{display_name:'Linked Member'},
    }:{message:'Access rejected'}),{
      status,headers:{'Content-Type':'application/json'},
    });
  };
  return {restore(){globalThis.fetch=old;},calls(){return calls;}};
}
test('no Supabase bearer cannot start a Worker account or bypass login',async()=>{
  const app=createApp();
  const r=await call(envFor(app.db));
  assert.equal(r.status,401);
  assert.equal(r.body.error,'not_authenticated');
});

test('verified Supabase identity maps to existing D1 member and issues existing-compatible JWT',async()=>{
  const app=createApp();
  const member=await app.register('Linked Member','linked@example.test');
  const up=stubSupabase();
  try{
    const first=await call(envFor(app.db),'validated-supabase-token',ORIGIN);
    assert.equal(first.status,200);
    assert.equal(first.headers.get('access-control-allow-origin'),ORIGIN);
    assert.equal(first.body.user.id,member.id);
    assert.ok(first.body.accessToken);
    assert.equal(first.body.expiresIn,900);
    const me=await legacy.fetch(new Request('https://legacy.test/v1/auth/me',
      {headers:{Authorization:'Bearer '+first.body.accessToken}}),envFor(app.db));
    const profile=await me.json() as any;
    assert.equal(me.status,200);
    assert.equal(profile.user.id,member.id);
    assert.equal(profile.user.account_status,'active');
    const binding=app.db.raw.prepare(
      "SELECT user_id FROM auth_identities WHERE provider='oidc' AND provider_subject=?"
    ).get('supabase:'+UUID) as {user_id:string};
    assert.equal(binding.user_id,member.id);
    const again=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(again.body.user.id,member.id);
    assert.equal(Number((app.db.raw.prepare(
      "SELECT count(*) AS n FROM users WHERE email='linked@example.test'"
    ).get() as {n:number}).n),1);
    assert.equal(up.calls(),2);
  }finally{up.restore();}
});

test('verified new Supabase user gets one D1 identity; repeated sign-in is idempotent',async()=>{
  const app=createApp();
  const up=stubSupabase({id:SECOND_UUID,email:'brand-new@example.test'});
  try{
    const first=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(first.status,200);
    assert.ok(first.body.user.id);
    const second=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(second.status,200);
    assert.equal(second.body.user.id,first.body.user.id);
    assert.ok((app.db.raw.prepare(
      'SELECT user_id FROM user_preferences WHERE user_id=?'
    ).get(first.body.user.id) as object|undefined));
    assert.equal((app.db.raw.prepare(
      'SELECT count(*) AS n FROM users WHERE email=?'
    ).get('brand-new@example.test') as {n:number}).n,1);
  }finally{up.restore();}
});

test('a forged or expired upstream Supabase session cannot authenticate',async()=>{
  const app=createApp();
  const up=stubSupabase({status:401});
  try{
    const r=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(r.status,401);
    assert.equal(r.body.error,'not_authenticated');
  }finally{up.restore();}
});

test('unverified email, anonymous user and upstream outage all fail closed',async()=>{
  const app=createApp();
  for(const opts of [{verified:false},{anonymous:true},{networkError:true}]){
    const up=stubSupabase(opts);
    try{
      const r=await call(envFor(app.db),'validated-supabase-token');
      assert.equal(r.status,opts.networkError?503:403);
      assert.equal(r.body.error,opts.networkError?
        'identity_provider_fetch_failed':'unverified_identity');
    }finally{up.restore();}
  }
});

test('linked identity changing to a different email cannot claim the old account',async()=>{
  const app=createApp();
  await app.register('Original','linked@example.test');
  let up=stubSupabase();
  try{assert.equal((await call(envFor(app.db),'validated-supabase-token')).status,200);}
  finally{up.restore();}
  up=stubSupabase({email:'other@example.test'});
  try{
    const r=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(r.status,401);
  }finally{up.restore();}
});

test('disabled accounts, including matching email accounts, never reactivate through SSO',async()=>{
  const app=createApp();
  const user=await app.register('Suspended','linked@example.test');
  app.db.raw.prepare("UPDATE users SET account_status='suspended' WHERE id=?").run(user.id);
  const up=stubSupabase();
  try{
    const r=await call(envFor(app.db),'validated-supabase-token');
    assert.equal(r.status,403);
    assert.equal(r.body.error,'account_disabled');
    const row=app.db.raw.prepare('SELECT account_status FROM users WHERE id=?')
      .get(user.id) as {account_status:string};
    assert.equal(row.account_status,'suspended');
  }finally{up.restore();}
});

test('unknown origin blocked even if bearer is otherwise verified',async()=>{
  const app=createApp();
  const up=stubSupabase();
  try{
    const r=await call(envFor(app.db),'validated-supabase-token',
      'https://other.example');
    assert.equal(r.status,403);
    assert.equal(r.body.error,'origin_not_allowed');
    assert.equal(up.calls(),0);
  }finally{up.restore();}
});

test('Supabase HTTP 5xx and rate limiting return safe, actionable codes',async()=>{
  const app=createApp();
  for(const status of [429,500,502,503]){
    const up=stubSupabase({status});
    try{
      const r=await call(envFor(app.db),'validated-supabase-token');
      assert.equal(r.status,503);
      assert.equal(r.body.error,
        status===429?'identity_provider_rate_limited':'identity_provider_http_'+status);
      assert.equal(up.calls(),1);
    }finally{up.restore();}
  }
});
