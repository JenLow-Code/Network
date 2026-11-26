import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './helpers/app.ts';
test('production does not run retired custom password or refresh endpoints',async()=>{
 const app=createApp({env:{ENVIRONMENT:'production'}});
 for(const path of ['email/register','email/login','refresh','logout']){
   const r=await app.call('POST','/v1/auth/'+path,{body:{}});
   assert.equal(r.status,410);
   assert.equal(r.body.error,'legacy_auth_retired');
 }
 assert.equal((await app.call('POST','/v1/auth/supabase/exchange')).status,401);
 assert.equal((await app.call('GET','/v1/auth/me')).status,401);
});
