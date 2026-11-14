import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, upload, wav } from './helpers/app.ts';

test('Music alternate versions preserve original attribution and linked origin, and cannot be published by outsiders', async () => {
  const app=createApp();
  const author=await app.register('Song Author');
  const outsider=await app.register('Other Artist');
  const originalAudio=await upload(app,author.token,'music_audio','audio/wav',wav());
  const title='Morceau test';
  const rights={
    originalCreatorName:'Song Author',rightsHolderName:'Song Author',
    licenseType:'own_work',attributionText:'Song Author — composition',adaptationsAllowed:true,
  };
  const original=await app.call('POST','/api/music',{token:author.token,body:{
    title,audioMediaId:originalAudio,rightsConfirmed:true,
    credits:[{displayName:'Song Author',contribution:'Chant'}],rights,
  }});
  assert.equal(original.status,201,JSON.stringify(original.body));
  const rootPubId:string=original.body.item.id;
  const root=app.db.raw.prepare('SELECT * FROM music_tracks WHERE publication_id=?').get(rootPubId) as
    {id:string;original_track_id:string|null;audio_asset_id:string};
  assert.equal(root.original_track_id,null);

  const secondAudio=await upload(app,author.token,'music_audio','audio/wav',wav());
  const second=await app.call('POST','/api/music',{token:author.token,body:{
    title:title+' — Acoustique',audioMediaId:secondAudio,rightsConfirmed:true,
    parentPublicationId:rootPubId,
    credits:[{displayName:'Song Author',contribution:'Version acoustique'}],rights,
  }});
  assert.equal(second.status,201,JSON.stringify(second.body));
  const secondPubId:string=second.body.item.id;
  const branch=app.db.raw.prepare('SELECT * FROM music_tracks WHERE publication_id=?').get(secondPubId) as
    {id:string;original_track_id:string|null;audio_asset_id:string};
  assert.equal(branch.original_track_id,root.id,'alternate release must link to the root');
  assert.equal(branch.audio_asset_id,secondAudio,'new version must not overwrite original audio');
  assert.equal((app.db.raw.prepare('SELECT audio_asset_id FROM music_tracks WHERE id=?')
    .get(root.id) as {audio_asset_id:string}).audio_asset_id,originalAudio);

  const thirdAudio=await upload(app,author.token,'music_audio','audio/wav',wav());
  const third=await app.call('POST','/api/music',{token:author.token,body:{
    title:title+' — Studio',audioMediaId:thirdAudio,rightsConfirmed:true,
    parentPublicationId:secondPubId,
    credits:[{displayName:'Song Author',contribution:'Version studio'}],rights,
  }});
  assert.equal(third.status,201,JSON.stringify(third.body));
  const thirdRow=app.db.raw.prepare('SELECT original_track_id FROM music_tracks WHERE publication_id=?')
    .get(third.body.item.id) as {original_track_id:string|null};
  assert.equal(thirdRow.original_track_id,root.id,'all variants retain the same original');

  const outsiderAudio=await upload(app,outsider.token,'music_audio','audio/wav',wav());
  const forbidden=await app.call('POST','/api/music',{token:outsider.token,body:{
    title:'Unauthorized version',audioMediaId:outsiderAudio,rightsConfirmed:true,
    parentPublicationId:rootPubId,
    credits:[{displayName:'Other Artist',contribution:'Guitare'}],
    rights:{...rights,originalCreatorName:'Other Artist',rightsHolderName:'Other Artist'},
  }});
  assert.equal(forbidden.status,403,JSON.stringify(forbidden.body));
  const mismatch=await app.call('POST','/api/music',{token:author.token,body:{
    title:'Incorrect credits',audioMediaId:thirdAudio,rightsConfirmed:true,
    parentPublicationId:rootPubId,
    credits:[{displayName:'Song Author',contribution:'Version'}],
    rights:{...rights,originalCreatorName:'Someone else'},
  }});
  assert.equal(mismatch.status,422,JSON.stringify(mismatch.body));
});
