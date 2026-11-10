import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './helpers/app.ts';

const blocks=[
 {id:'photo-1',kind:'image',title:'Idée de visuel',content:'https://images.example.test/flower.jpg',
   tileSize:'1x1',media:['https://images.example.test/flower.jpg']},
 {id:'verse-1',kind:'bible-verse',title:'Jean 3:12',content:'Si vous ne croyez pas…',tileSize:'1x1',media:[]},
 {id:'note-1',kind:'note',title:'Une note',content:'',tileSize:'1x2',
   noteBlocks:[{id:'a',type:'checklist',text:'Parler au studio',checked:true}]},
];

test('Semence public profile snapshot excludes private notebooks and stays out of Discovery',async()=>{
 const app=createApp();
 const author=await app.register('Auteure');
 const outsider=await app.register('Lecteur');
 const before=(await app.call('GET','/api/discovery')).body.items.length;
 const published=await app.call('POST','/api/semence-shares',{token:author.token,
   body:{title:'Enregistrer mon chant',summary:'Préparer ce chant',visibility:'public',
     sourceLocalId:'local-chant-01',blocks,
     privateNotebooks:[{title:'Secret',blocks:[{text:'NE PAS PARTAGER'}]}]}});
 assert.equal(published.status,201,JSON.stringify(published.body));
 const id=published.body.item.id as string;
 const detail=await app.call('GET','/api/semence-shares/'+id);
 assert.equal(detail.status,200,JSON.stringify(detail.body));
 assert.deepEqual(detail.body.item.previewImages,['https://images.example.test/flower.jpg']);
 assert.equal(detail.body.item.blocks[2].noteBlocks[0].checked,true);
 assert.equal(JSON.stringify(detail.body).includes('NE PAS PARTAGER'),false);
 assert.equal((await app.call('GET','/api/me/semence-shares',{token:author.token})).body.items.length,1);
 assert.equal((await app.call('GET','/api/users/'+author.handle+'/semence-shares')).body.items.length,1);
 assert.equal((await app.call('GET','/api/discovery')).body.items.length,before);
 assert.equal((await app.call('DELETE','/api/semence-shares/'+id,{token:outsider.token})).status,403);
 assert.equal((await app.call('DELETE','/api/semence-shares/'+id,{token:author.token})).status,200);
 assert.equal((await app.call('GET','/api/semence-shares/'+id)).status,404);
});

test('Friends-only Semence requires real reciprocal contact',async()=>{
 const app=createApp();
 const author=await app.register('Auteur');
 const friend=await app.register('Ami');
 const outsider=await app.register('Inconnu');
 const result=await app.call('POST','/api/semence-shares',{token:author.token,
   body:{title:'Idée',sourceLocalId:'idea-1',visibility:'friends',blocks}});
 assert.equal(result.status,201,JSON.stringify(result.body));
 const url='/api/semence-shares/'+result.body.item.id;
 assert.equal((await app.call('GET',url)).status,404);
 assert.equal((await app.call('GET',url,{token:outsider.token})).status,404);
 assert.equal((await app.call('GET',url,{token:friend.token})).status,404);
 assert.equal((await app.call('GET','/api/users/'+author.handle+'/semence-shares',
   {token:outsider.token})).body.items.length,0);
 app.db.exec("INSERT INTO contacts(user_id,contact_user_id) VALUES('"+author.id+"','"+friend.id+"'),('"+friend.id+"','"+author.id+"');");
 assert.equal((await app.call('GET',url,{token:friend.token})).status,200);
 assert.equal((await app.call('GET','/api/users/'+author.handle+'/semence-shares',
   {token:friend.token})).body.items.length,1);
 assert.equal((await app.call('GET',url)).status,404);
});

test('Semence publishing rejects unsafe links and empty selections',async()=>{
 const app=createApp();
 const author=await app.register('Auteur');
 const bad=await app.call('POST','/api/semence-shares',{token:author.token,
   body:{title:'Test',sourceLocalId:'x',visibility:'public',
     blocks:[{kind:'link',title:'Unsafe',content:'javascript:alert(1)'}]}});
 assert.equal(bad.status,422,JSON.stringify(bad.body));
 const empty=await app.call('POST','/api/semence-shares',{token:author.token,
   body:{title:'Test',sourceLocalId:'x',visibility:'public',blocks:[]}});
 assert.equal(empty.status,422);
 assert.equal((await app.call('POST','/api/semence-shares',{body:{
   title:'Test',sourceLocalId:'x',visibility:'public',blocks}})).status,401);
});
