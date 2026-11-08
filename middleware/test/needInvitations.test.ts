import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, upload, PNG } from './helpers/app.ts';

const ok = (res:{status:number;body:unknown}, status=200)=>
  assert.equal(res.status,status,JSON.stringify(res.body));

test('direct talent invitation: pending never fills; explicit consent fills; removal notifies and releases',async()=>{
  const app=createApp();
  const owner=await app.register('Chef de projet');
  const invitee=await app.register('Batteur invité');
  const photo=await upload(app,owner.token,'dream_cover','image/png',PNG);
  const created=await app.call('POST','/api/dreams',{
    token:owner.token,body:{title:'Nouvelle équipe de louange',coverMediaId:photo}});
  ok(created,201);
  const dreamId=created.body.dream.dreamId as string;
  ok(await app.call('POST',`/api/dreams/${dreamId}/transitions`,{
    token:owner.token,body:{to:'germination'}}));
  const needRes=await app.call('POST',`/api/dreams/${dreamId}/needs`,{
    token:owner.token,body:{label:'Batteur',category:'person',slotsTotal:1}});
  ok(needRes,201);
  const needId=needRes.body.id as string;

  const manual=await app.call('POST',`/api/needs/${needId}/confirm`,{token:owner.token});
  assert.equal(manual.status,422,'owners cannot mark a human as found');
  assert.equal(manual.body.error.code,'talent_requires_acceptance');

  const sent=await app.call('POST',`/api/needs/${needId}/invitations`,{
    token:owner.token,body:{handle:invitee.handle,message:'Pourrais-tu participer aux répétitions ?'}});
  ok(sent,201);
  const invitationId=sent.body.invitation.id as string;
  const repeat=await app.call('POST',`/api/needs/${needId}/invitations`,{
    token:owner.token,body:{handle:invitee.handle}});
  assert.equal(repeat.status,409,'duplicate pending invitation is forbidden');

  const needsBefore=await app.call('GET',`/api/dreams/${dreamId}/needs`,{token:owner.token});
  assert.equal(needsBefore.body.items.find((n:any)=>n.id===needId).slotsFilled,0,
    'sending the invite cannot count as a found talent');
  const myInvites=await app.call('GET','/api/me/need-invitations',{token:invitee.token});
  assert.equal(myInvites.body.items[0].id,invitationId);
  assert.equal(myInvites.body.items[0].status,'pending');
  const inviteeNotif=await app.call('GET','/api/notifications',{token:invitee.token});
  assert.ok(inviteeNotif.body.items.some((n:any)=>n.type==='dream.talent_invitation.received'));

  ok(await app.call('POST',`/api/need-invitations/${invitationId}/respond`,{
    token:invitee.token,body:{accept:true}}));
  const needsAfter=await app.call('GET',`/api/dreams/${dreamId}/needs`,{token:owner.token});
  assert.equal(needsAfter.body.items.find((n:any)=>n.id===needId).slotsFilled,1);
  const ownerNotif=await app.call('GET','/api/notifications',{token:owner.token});
  assert.ok(ownerNotif.body.items.some((n:any)=>n.type==='dream.talent_invitation.accepted'),
    'owner is told who accepted');
  const repeatAnswer=await app.call('POST',`/api/need-invitations/${invitationId}/respond`,{
    token:invitee.token,body:{accept:true}});
  assert.equal(repeatAnswer.status,409,'acceptance cannot fill the slot twice');

  ok(await app.call('DELETE',`/api/need-invitations/${invitationId}`,{token:owner.token}));
  const needsReleased=await app.call('GET',`/api/dreams/${dreamId}/needs`,{token:owner.token});
  assert.equal(needsReleased.body.items.find((n:any)=>n.id===needId).slotsFilled,0,
    'owner removal releases the accepted slot');
  const removedNotif=await app.call('GET','/api/notifications',{token:invitee.token});
  assert.ok(removedNotif.body.items.some((n:any)=>n.type==='dream.talent_invitation.removed'),
    'recipient is notified when removed');
  assert.equal((await app.call('GET','/api/me/need-invitations',{token:invitee.token})).body.items.length,0);
});

test('direct talent invitation: decline notifies owner, notifies on cancelling a pending request',async()=>{
  const app=createApp();
  const owner=await app.register('Porteur');
  const invitee=await app.register('Musicien');
  const image=await upload(app,owner.token,'dream_cover','image/png',PNG);
  const d=await app.call('POST','/api/dreams',{token:owner.token,body:{title:'Composer une chanson',coverMediaId:image}});
  ok(d,201);
  const dreamId=d.body.dream.dreamId as string;
  ok(await app.call('POST',`/api/dreams/${dreamId}/transitions`,{token:owner.token,body:{to:'germination'}}));
  const n=await app.call('POST',`/api/dreams/${dreamId}/needs`,{
    token:owner.token,body:{label:'Guitariste',category:'person'}});
  ok(n,201);
  const needId=n.body.id as string;
  const invitation=await app.call('POST',`/api/needs/${needId}/invitations`,{
    token:owner.token,body:{handle:invitee.handle}});
  ok(invitation,201);
  const invitationId=invitation.body.invitation.id as string;
  ok(await app.call('POST',`/api/need-invitations/${invitationId}/respond`,{
    token:invitee.token,body:{accept:false}}));
  const notification=await app.call('GET','/api/notifications',{token:owner.token});
  assert.ok(notification.body.items.some((x:any)=>x.type==='dream.talent_invitation.declined'));
  const another=await app.call('POST',`/api/needs/${needId}/invitations`,{
    token:owner.token,body:{handle:invitee.handle}});
  ok(another,201);
  assert.equal(another.body.invitation.id,invitationId,'same invitation can be resent after decline');
  const bypass=await app.call('DELETE',`/api/needs/${needId}`,{token:owner.token});
  assert.equal(bypass.status,409,'needs with active invitations cannot be silently removed');
  ok(await app.call('DELETE',`/api/need-invitations/${invitationId}`,{token:owner.token}));
  ok(await app.call('DELETE',`/api/needs/${needId}`,{token:owner.token}));
});
