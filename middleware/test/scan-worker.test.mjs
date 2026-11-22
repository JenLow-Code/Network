import {test} from 'node:test';
import assert from 'node:assert/strict';
import scanner from '../scan-worker/worker.js';

const ROOT='https://jenlow-music-scan.jenlow-production.workers.dev';
const ORIGIN='https://network.jenlow.net';
const IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAcUlEQVR4nO3aQQrAIAwAwab0/1+2j1AYhJ27kMVTILPWem726gF2FaAVoBWgFaAVoBWgFaAVoBWgfTuPZ+bIEDt7+fU/UIBWgFaAVoBWgFaAVoBWgDbdSmAFaAVoBWgFaAVoBWgFaAVoBWg/qfEJe0vKxRMAAAAASUVORK5CYII=';
const ID='00000000-0000-0000-0000-000000000001';
const headers={origin:ORIGIN,authorization:'Bearer an-opaque-supabase-token',
  'content-type':'application/json'};
const mockDb={
  prepare(){
    return {bind(){return this;},async run(){return {success:true};},
      async first(){return {attempt_count:1};}};
  },
};
const model=(payload)=>({run:async(_id,params)=>{
  const parts=params?.messages?.find(msg=>msg.role==='user')?.content;
  assert.ok(Array.isArray(parts),'Vision request must carry image + prompt');
  assert.ok(parts.some(part=>part.type==='image_url'&&part.image_url.url===IMAGE));
  assert.deepEqual(params.chat_template_kwargs,{enable_thinking:false});
  return {choices:[{message:{content:JSON.stringify(payload)}}]};
}});
const makeRequest=(body,overrides={})=>new Request(ROOT+'/api/music/scan',{
  method:'POST',headers:{...headers,...overrides},
  body:JSON.stringify(body),
});
const fakeIdentity=()=>Response.json({id:ID});

test('scanner health reports model and quota bindings',async()=>{
  const response=await scanner.fetch(new Request(ROOT+'/health'),{AI:model({}),DB:mockDb});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'ok',ai:true,quota:true});
});
test('scanner denies unauthorized requests before calling the AI',async()=>{
  const response=await scanner.fetch(new Request(ROOT+'/api/music/scan',{
    method:'POST',headers:{origin:ORIGIN},body:JSON.stringify({mode:'text',image:IMAGE}),
  }),{AI:model({}),DB:mockDb});
  assert.equal(response.status,401);
});
test('scanner denies cross-origin writes',async()=>{
  const response=await scanner.fetch(makeRequest({mode:'text',image:IMAGE},
    {origin:'https://unrelated.example'}),{AI:model({}),DB:mockDb});
  assert.equal(response.status,403);
});
test('scanner fails closed without AI configuration',async()=>{
  const response=await scanner.fetch(makeRequest({mode:'text',image:IMAGE}),
    {DB:mockDb});
  assert.equal(response.status,503);
});
test('text recognition returns verified raw editable content, not a fake score',async()=>{
  const prior=globalThis.fetch;
  globalThis.fetch=async()=>fakeIdentity();
  try{
    const response=await scanner.fetch(makeRequest({mode:'text',image:IMAGE}),
      {AI:model({title:'Ma chanson',text:'Bonjour\nmonde',language:'fr'}),DB:mockDb});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.text,'Bonjour\nmonde');
    assert.equal(data.mode,'text');
    assert.equal(data.notes,undefined);
  }finally{globalThis.fetch=prior;}
});
test('musical recognition produces structured notes for preview, but only as a draft',async()=>{
  const prior=globalThis.fetch;
  globalThis.fetch=async()=>fakeIdentity();
  try{
    const response=await scanner.fetch(makeRequest({mode:'score',image:IMAGE}),
      {AI:model({title:'Test',bpm:90,numerator:3,denominator:4,
        notes:[{midi:67,startBeats:0,lengthBeats:1},
          {midi:60,startBeats:1,lengthBeats:2}]}),DB:mockDb});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.notes.length,2);
    assert.equal(data.bpm,90);
    assert.equal(data.warnings.length>0,true);
  }finally{globalThis.fetch=prior;}
});
test('unreadable score never creates synthetic notes',async()=>{
  const prior=globalThis.fetch;
  globalThis.fetch=async()=>fakeIdentity();
  try{
    const response=await scanner.fetch(makeRequest({mode:'score',image:IMAGE}),
      {AI:model({notes:[]}),DB:mockDb});
    assert.equal(response.status,422);
    const data=await response.json();
    assert.equal(data.error.code,'scan_no_notes');
  }finally{globalThis.fetch=prior;}
});
