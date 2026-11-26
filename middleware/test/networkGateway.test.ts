import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../../api/network/src/index';
test('Network gateway delegates identity only through the private security binding',async()=>{
  let seen:Request|undefined;
  const response=await handle(new Request('https://network.example/core/identity?target=evil',{headers:{authorization:'Bearer token','x-user-id':'spoof','x-product':'tools',origin:'https://network.example'}}),{
    ALLOWED_ORIGIN:'https://network.example',SECURITY:{async fetch(r){seen=r;return Response.json({user:{id:'verified'}});}}
  });
  assert.equal(response.status,200);assert.equal(seen?.url,'https://middleware.internal/v1/auth/me');
  assert.equal(seen?.headers.get('authorization'),'Bearer token');
  assert.equal(seen?.headers.get('x-user-id'),null);assert.equal(seen?.headers.get('x-product'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Network gateway rejects arbitrary routes, methods and cross-product access',async()=>{
  let calls=0;const env={SECURITY:{async fetch(){calls++;return Response.json({});}}};
  for(const path of ['/tools/projects','/production/projects','/api/discovery','/network/profile','/core/admin','/v1/auth/email/login']){
    assert.equal((await handle(new Request('https://network.example'+path),env)).status,404);
  }
  assert.equal((await handle(new Request('https://network.example/core/identity',{method:'POST'}),env)).status,405);
  assert.equal((await handle(new Request('https://network.example/core/identity',{headers:{origin:'https://evil.example'}}),env)).status,403);
  assert.equal(calls,0);
});
test('Network gateway fails closed when security is unbound or unavailable',async()=>{
  const r=new Request('https://network.example/core/identity');
  assert.equal((await handle(r,{})).status,503);
  assert.equal((await handle(r,{SECURITY:{async fetch(){throw Error('offline')}}})).status,503);
});
test('Network gateway preserves authentication failures',async()=>{
  const r=await handle(new Request('https://network.example/core/identity'),{SECURITY:{async fetch(){return Response.json({error:'not_authenticated'},{status:401});}}});
  assert.equal(r.status,401);
});

// Exercise the actual security middleware and migrated SQLite fixture, not just a stub.
import {createApp} from './helpers/app.ts';
import {handle as securityHandle} from '../src/app.ts';
import {signAccessToken} from '../src/sessions/tokens.ts';
test('gateway and middleware together validate identity, token expiry and suspended accounts',async()=>{
  const app=createApp(),member=await app.register('Gateway test member');
  const env={SECURITY:{fetch:(request:Request)=>securityHandle(request,app.env)}};
  const call=(token?:string)=>handle(new Request('https://network.example/core/identity',{headers:token?{authorization:'Bearer '+token}:{'x-user-id':member.id}}),env);
  assert.equal((await call()).status,401);
  const valid=await call(member.token);
  assert.equal(valid.status,200);
  assert.equal((await valid.json() as {user:{id:string}}).user.id,member.id);
  assert.equal((await call(member.token+'.invalid')).status,401);
  const expired=await signAccessToken(member.id,app.env,Math.floor(Date.now()/1000)-901);
  assert.equal((await call(expired)).status,401);
  const future=await signAccessToken(member.id,app.env,Math.floor(Date.now()/1000)+3600);
  assert.equal((await call(future)).status,401);
  app.db.raw.prepare("UPDATE users SET account_status='suspended' WHERE id=?").run(member.id);
  assert.equal((await call(member.token)).status,401);
});
test('gateway reaches real middleware for verified upstream identity exchange',async()=>{
  const app=createApp();
  const env={SECURITY:{fetch:(request:Request)=>securityHandle(request,app.env)}};
  const providerToken='header.'+Buffer.from(JSON.stringify({sub:'4ec693bf-0d25-4ad8-8284-9f3b8cb0ca79',session_id:'ee0f45c1-7e15-43a0-a242-f2a87bcb05f8'})).toString('base64url')+'.fixture';
  const old=globalThis.fetch;
  globalThis.fetch=async (_input,init)=>{
    assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+providerToken);
    return Response.json({id:'4ec693bf-0d25-4ad8-8284-9f3b8cb0ca79',email:'gateway@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false});
  };
  try{
    const exchange=await handle(new Request('https://network.example/core/auth/supabase/exchange',{method:'POST',headers:{authorization:'Bearer '+providerToken}}),env);
    assert.equal(exchange.status,200);
    const data=await exchange.json() as {accessToken:string;user:{id:string}};
    const identity=await handle(new Request('https://network.example/core/identity',{headers:{authorization:'Bearer '+data.accessToken}}),env);
    assert.equal(identity.status,200);
    assert.equal((await identity.json() as {user:{id:string}}).user.id,data.user.id);
  }finally{globalThis.fetch=old;}
});
