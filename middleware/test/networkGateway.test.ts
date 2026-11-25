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
