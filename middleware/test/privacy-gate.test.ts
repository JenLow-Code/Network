import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './helpers/app.ts';

test('production private routes deny anonymous requests, including Discovery and profile feeds',async()=>{
  const app=createApp({env:{ENVIRONMENT:'production'}});
  const probes=[
    '/api/discovery','/api/discovery?type=music',
    '/api/publications/demo-music-publication-01',
    '/api/users/mock01','/api/users/mock01/publications',
    '/api/music','/api/demo/users','/api/dreams/demo-dream-01-2',
  ];
  for(const path of probes){
    const res=await app.call('GET',path);
    assert.equal(res.status,401,path+' must not be publicly readable');
  }
  assert.equal((await app.call('GET','/health')).status,200);
  assert.equal((await app.call('GET','/api/openapi.json')).status,200);
  const member=await app.register('Verified Member');
  assert.equal((await app.call('GET','/api/discovery',{token:member.token})).status,200);
  assert.equal((await app.call('GET','/api/music',{token:member.token})).status,200);
});

test('Supabase token must be verified server-side; no anonymous/unconfirmed user can exchange',async()=>{
  const app=createApp({env:{
    ENVIRONMENT:'production',
    SUPABASE_URL:'https://ldliraxelqftisjofwgv.supabase.co',
    SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_public',
  }});
  const original=globalThis.fetch;
  const supabaseId='e9fca55a-1ab3-48ec-b933-4bed337f77de';
  let access='good-jwt';
  let verified=true;
  let requestCount=0;
  try{
    globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      requestCount++;
      assert.equal(String(input),'https://ldliraxelqftisjofwgv.supabase.co/auth/v1/user');
      assert.equal(init?.headers&&
        (init.headers as Record<string,string>).apikey,'sb_publishable_test_public');
      const token=(init?.headers as Record<string,string>)?.Authorization;
      if(token!=='Bearer '+access)return new Response('{}',{status:401});
      return Response.json({
        id:supabaseId,email:'confirmed@example.test',
        email_confirmed_at:verified?'2026-11-23T00:00:00Z':null,
        is_anonymous:false,
        user_metadata:{display_name:'Valid Member'},
      });
    }) as typeof fetch;
    assert.equal((await app.call('POST','/v1/auth/supabase/exchange')).status,401);
    const exchange=await app.call('POST','/v1/auth/supabase/exchange',
      {headers:{Authorization:'Bearer '+access}});
    assert.equal(exchange.status,200,JSON.stringify(exchange.body));
    assert.equal(exchange.body.expiresIn,900);
    assert.equal(exchange.body.user.displayName,'Valid Member');
    const me=await app.call('GET','/api/me',{token:exchange.body.accessToken});
    assert.equal(me.status,200,JSON.stringify(me.body));
    assert.equal(me.body.user.id,exchange.body.user.id);
    const twice=await app.call('POST','/v1/auth/supabase/exchange',
      {headers:{Authorization:'Bearer '+access}});
    assert.equal(twice.body.user.id,exchange.body.user.id,'provider subject must be stable');
    assert.equal((await app.call('GET','/api/discovery',
      {token:exchange.body.accessToken})).status,200);
    assert.ok(requestCount>=2);
    verified=false;
    const unconfirmed=await app.call('POST','/v1/auth/supabase/exchange',
      {headers:{Authorization:'Bearer '+access}});
    assert.equal(unconfirmed.status,403);
    verified=true;
    access='another-jwt';
    const wrong=await app.call('POST','/v1/auth/supabase/exchange',
      {headers:{Authorization:'Bearer invalid-jwt'}});
    assert.equal(wrong.status,401);
  }finally{
    globalThis.fetch=original;
  }
});

test('server failure and missing Supabase configuration deny token issuance',async()=>{
  const app=createApp({env:{ENVIRONMENT:'production'}});
  const notConfigured=await app.call('POST','/v1/auth/supabase/exchange',
    {headers:{Authorization:'Bearer signed-by-external-provider'}});
  assert.equal(notConfigured.status,503);
  assert.equal((await app.call('GET','/api/discovery')).status,401);
});
