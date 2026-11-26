import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './helpers/app.ts';
import {signAccessToken} from '../src/sessions/tokens.ts';

const subject='4ec693bf-0d25-4ad8-8284-9f3b8cb0ca79';
const providerSession='ee0f45c1-7e15-43a0-a242-f2a87bcb05f8';
const providerToken='header.'+Buffer.from(JSON.stringify({sub:subject,session_id:providerSession})).toString('base64url')+'.fixture';
test('production session lifecycle and product isolation',async()=>{
 const app=createApp({env:{ENVIRONMENT:'production',PRODUCT:'network'}});
 const old=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({id:subject,email:'session@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false});
 try{
   const exchange=()=>app.call('POST','/v1/auth/supabase/exchange',{token:providerToken});
   const first=await exchange();assert.equal(first.status,200,JSON.stringify(first.body));
   const token=first.body.accessToken,uid=first.body.user.id,profile=first.body.user.profileId;
   assert.equal((await app.call('GET','/v1/auth/me',{token})).body.user.profile_id,profile);
   assert.equal((await app.call('GET','/v1/auth/me',{token:await signAccessToken(uid,app.env)})).status,401);
   app.db.raw.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,'admin')").run(uid);
   assert.deepEqual((await app.call('GET','/v1/auth/me',{token})).body.user.roles,[]);
   app.db.raw.prepare("INSERT INTO product_role_grants(profile_id,role) VALUES(?,'moderator')").run(profile);
   assert.deepEqual((await app.call('GET','/v1/auth/me',{token})).body.user.roles,['moderator']);
   app.env.PRODUCT='tools';
   assert.equal((await app.call('GET','/v1/auth/me',{token})).status,401);
   assert.equal((await exchange()).status,401);
   app.env.PRODUCT='network';
   const oldActivity=Math.floor(Date.now()/1000)-120;
   app.db.raw.prepare('UPDATE provider_sessions SET last_activity_at=?').run(oldActivity);
   assert.equal((await exchange()).status,200);
   assert.equal((app.db.raw.prepare('SELECT last_activity_at FROM provider_sessions').get() as {last_activity_at:number}).last_activity_at,oldActivity);
   assert.equal((await app.call('POST','/v1/auth/session/activity',{token})).status,200);
   assert.ok((app.db.raw.prepare('SELECT last_activity_at FROM provider_sessions').get() as {last_activity_at:number}).last_activity_at>oldActivity);
   app.db.raw.exec("UPDATE provider_sessions SET verified_at=1");
   assert.equal((await app.call('GET','/v1/auth/me',{token})).status,401);
   assert.equal((await exchange()).status,200);
   assert.equal((await app.call('POST','/v1/auth/session/revoke',{token})).status,200);
   assert.equal((await app.call('GET','/v1/auth/me',{token})).status,401);
   assert.equal((await exchange()).status,401);
 }finally{globalThis.fetch=old;}
});
test('inactive provider sessions cannot be revived by background token exchange',async()=>{
 const app=createApp({env:{ENVIRONMENT:'production',PRODUCT:'network'}});
 const old=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({id:subject,email:'idle@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',is_anonymous:false});
 try{
   const first=await app.call('POST','/v1/auth/supabase/exchange',{token:providerToken});
   assert.equal(first.status,200);
   app.db.raw.prepare('UPDATE provider_sessions SET last_activity_at=?').run(Math.floor(Date.now()/1000)-7*86400);
   assert.equal((await app.call('GET','/v1/auth/me',{token:first.body.accessToken})).status,401);
   assert.equal((await app.call('POST','/v1/auth/supabase/exchange',{token:providerToken})).status,401);
 }finally{globalThis.fetch=old;}
});
