import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp,upload,wav} from './helpers/app.ts';
import {runScheduled} from '../src/jobs/scheduled.ts';

test('music review: test stays unanswered, archive lasts thirty days once, owner is reminded',async()=>{
  const app=createApp();
  const owner=await app.register('Music Review Owner');
  const contributor=await app.register('Music Review Contributor');
  const stranger=await app.register('Music Review Stranger');
  const source=await upload(app,owner.token,'music_audio','audio/wav',wav());
  const published=await app.call('POST','/api/music',{token:owner.token,body:{
    title:'Une chanson à plusieurs',audioMediaId:source,rightsConfirmed:true,
    credits:[{displayName:'Music Review Owner',contribution:'Auteur'}],
    rights:{originalCreatorName:'Music Review Owner',rightsHolderName:'Music Review Owner',
      licenseType:'own_work',attributionText:'Music Review Owner',adaptationsAllowed:true},
  }});
  assert.equal(published.status,201,JSON.stringify(published.body));
  const track=published.body.item.id;
  const proposalAudio=await upload(app,contributor.token,'music_proposal','audio/wav',wav());
  const sent=await app.call('POST','/api/music/'+track+'/proposals',{
    token:contributor.token,body:{
      description:'Je propose une vraie prise pour le refrain',
      audioMediaId:proposalAudio,
      credits:[{displayName:'Music Review Contributor',contribution:'Guitare'}],
    },
  });
  assert.equal(sent.status,201,JSON.stringify(sent.body));
  const id:string=sent.body.proposal.id;
  const route='/api/music-proposals/'+id;

  const unauthorized=await app.call('POST',route+'/review',{
    token:stranger.token,body:{action:'test'},
  });
  assert.equal(unauthorized.status,404);

  const testing=await app.call('POST',route+'/review',{
    token:owner.token,body:{action:'test'},
  });
  assert.equal(testing.status,200,JSON.stringify(testing.body));
  assert.equal(testing.body.proposal.status,'submitted');
  assert.equal(testing.body.proposal.reviewState,'testing');

  const sentInbox=await app.call('GET','/api/me/music-proposals?role=sent',{
    token:contributor.token,
  });
  const sentProposal=sentInbox.body.items.find((p:{id:string})=>p.id===id);
  assert.equal(sentProposal.status,'submitted');
  assert.equal(sentProposal.reviewState,'in_review',
    'contributors see only review is underway, not private testing/archiving');
  assert.equal(sentProposal.archiveUntil,null);

  const archived=await app.call('POST',route+'/review',{
    token:owner.token,body:{action:'archive'},
  });
  assert.equal(archived.status,200,JSON.stringify(archived.body));
  assert.equal(archived.body.proposal.status,'submitted');
  assert.equal(archived.body.proposal.reviewState,'archived');
  assert.equal(archived.body.proposal.canArchive,false);
  assert.ok(archived.body.proposal.archiveUntil);
  const duplicated=await app.call('POST',route+'/review',{
    token:owner.token,body:{action:'archive'},
  });
  assert.equal(duplicated.status,409,'archive is one-time even during deferral');

  const before=app.db.raw.prepare(
    'SELECT status,review_state,archived_once_at,archive_until FROM music_collab_proposals WHERE id=?'
  ).get(id) as {status:string;review_state:string;archived_once_at:string;archive_until:string};
  assert.equal(before.status,'submitted');
  assert.equal(before.review_state,'archived');
  assert.ok(before.archived_once_at);
  assert.ok(before.archive_until);

  const expireAt=new Date(Date.parse(before.archive_until.replace(' ','T')+'Z')+60_000);
  const stats=await runScheduled(app.env,expireAt);
  assert.equal(stats.musicReviewReminders,1);
  const reopened=app.db.raw.prepare(
    'SELECT status,review_state,archived_once_at,archive_until FROM music_collab_proposals WHERE id=?'
  ).get(id) as typeof before;
  assert.equal(reopened.status,'submitted');
  assert.equal(reopened.review_state,'pending');
  assert.equal(reopened.archive_until,null);
  assert.ok(reopened.archived_once_at);
  const repeat=await app.call('POST',route+'/review',{
    token:owner.token,body:{action:'archive'},
  });
  assert.equal(repeat.status,409,'archive cannot be renewed after 30 days');

  const reminder=app.db.raw.prepare(
    "SELECT notification_type FROM notifications WHERE user_id=? AND entity_id=?"
  ).all(owner.id,id) as {notification_type:string}[];
  assert.equal(reminder.filter(n=>n.notification_type==='music.proposal.archive_reminder').length,1);
  const secondRun=await runScheduled(app.env,new Date(expireAt.getTime()+15*60_000));
  assert.equal(secondRun.musicReviewReminders,0,'a reminder must not ring twice');

  const accepted=await app.call('POST',route+'/accept',{
    token:owner.token,body:{},
  });
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  assert.equal(accepted.body.proposal.status,'accepted');
});
