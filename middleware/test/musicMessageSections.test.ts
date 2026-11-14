import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp,upload,wav} from './helpers/app.ts';

test('music chat retains references to a song section but not in unrelated conversations',async()=>{
  const app=createApp();
  const owner=await app.register('Musician One');
  const singer=await app.register('Musician Two');
  const recording=await upload(app,owner.token,'music_audio','audio/wav',wav());
  const song=await app.call('POST','/api/music',{token:owner.token,body:{
    title:'Chant de test',audioMediaId:recording,rightsConfirmed:true,
    credits:[{displayName:'Musician One',contribution:'Composition'}],
    rights:{originalCreatorName:'Musician One',rightsHolderName:'Musician One',
      licenseType:'own_work',attributionText:'Musician One'},
  }});
  assert.equal(song.status,201,JSON.stringify(song.body));
  const chatId='music-'+song.body.item.id;
  const sectionId='music-couplet-123';
  const sent=await app.call('POST','/api/conversations/'+chatId+'/messages',{token:owner.token,
    body:{type:'text',body:'Revoir la mélodie de cette partie',
      musicSectionId:sectionId,musicSectionTitle:'Couplet 1',clientMessageId:'test-section-1'},
  });
  assert.equal(sent.status,201,JSON.stringify(sent.body));
  assert.deepEqual(sent.body.message.musicSection,{id:sectionId,title:'Couplet 1'});
  const list=await app.call('GET','/api/conversations/'+chatId+'/messages',{token:owner.token});
  assert.equal(list.status,200);
  assert.equal(list.body.items[0].musicSection.title,'Couplet 1');
  assert.equal((await app.call('POST','/api/conversations/'+chatId+'/messages',{token:owner.token,
    body:{type:'text',body:'Missing label',musicSectionId:sectionId}})).status,422);
  assert.equal((await app.call('GET','/api/conversations/'+chatId+'/messages',{token:singer.token})).status,404);
  const withoutReference=await app.call('POST','/api/conversations/'+chatId+'/messages',{
    token:owner.token,body:{type:'text',body:'Message sans partie'},
  });
  assert.equal(withoutReference.body.message.musicSection,null);
  assert.equal((await app.call('POST','/api/conversations/'+chatId+'/messages',{token:owner.token,
    body:{type:'publication',publicationId:song.body.item.id,
      musicSectionId:sectionId,musicSectionTitle:'Intro'}})).status,422);
});
