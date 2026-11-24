import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './helpers/app.ts';
import {Ctx} from '../src/core/context.ts';
import {canSee} from '../src/privacy/visibility.ts';
import {blockedBetween} from '../src/privacy/blocking.ts';
import {requireVisibleProfile} from '../src/policies/profiles.ts';
import {requireVisiblePublication} from '../src/policies/publications.ts';
import {requireOwnedReadyMedia} from '../src/policies/media.ts';
import {requireConversationMember} from '../src/policies/messaging.ts';
import {requirePublishedTrackMember} from '../src/policies/music.ts';
import {requireVisibleEvent} from '../src/policies/agenda.ts';
import {requireVisibleSemenceShare} from '../src/policies/semenceShares.ts';
import {requireDreamOwner} from '../src/policies/aspirations.ts';
import {readBoundedJson} from '../src/security/body.ts';
test('privacy defaults to deny',()=>{
 assert.equal(canSee('unknown',true,false),false);
 assert.equal(canSee('private',true,false),false);
 assert.equal(canSee('members',false,false),false);
 assert.equal(canSee('public',false,false),true);
 assert.equal(canSee('private',true,true),true);
});
test('central authentication rejects malformed tokens and client-supplied identity',async()=>{
 const app=createApp(),u=await app.register('Security User');
 assert.equal((await app.call('GET','/api/me',{token:u.token+'.extra'})).status,401);
 assert.equal((await app.call('GET','/api/me',{headers:{'X-User-Id':u.id}})).status,401);
 assert.equal((await app.call('GET','/api/me',{token:u.token})).status,200);
 assert.equal((await app.call('GET','/api/discovery',{token:u.token})).status,404);
});
test('profile visibility, bidirectional blocking and nonexistent resources',async()=>{
 const app=createApp(),a=await app.register('Alice'),b=await app.register('Bob');
 const ctx=new Ctx(new Request('https://api.test',{headers:{Authorization:'Bearer '+a.token}}),app.env,undefined,'test');
 const viewer=await ctx.user();
 app.db.raw.prepare("UPDATE user_preferences SET profile_visibility='private' WHERE user_id=?").run(b.id);
 await assert.rejects(requireVisibleProfile(ctx.sql,viewer,b.id),{status:404});
 await requireVisibleProfile(ctx.sql,viewer,a.id);
 app.db.raw.prepare("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES(?,?)").run(b.id,a.id);
 assert.equal(await blockedBetween(ctx.sql,a.id,b.id),true);
 assert.equal(await blockedBetween(ctx.sql,b.id,a.id),true);
 for(const check of [
   ()=>requireVisiblePublication(ctx.sql,viewer,'missing'),
   ()=>requireOwnedReadyMedia(ctx.sql,viewer,'missing'),
   ()=>requireConversationMember(ctx.sql,viewer,'missing'),
   ()=>requirePublishedTrackMember(ctx.sql,viewer,'missing'),
   ()=>requireVisibleEvent(ctx.sql,viewer,'missing'),
   ()=>requireVisibleSemenceShare(ctx.sql,viewer,'missing'),
   ()=>requireDreamOwner(ctx.sql,'missing',viewer)
 ])await assert.rejects(check,{status:404});
});
test('body limit measures bytes rather than characters',async()=>{
 await assert.rejects(readBoundedJson(new Request('https://api.test',{method:'POST',body:JSON.stringify({x:'é'.repeat(100)})}),150),{status:413});
});
