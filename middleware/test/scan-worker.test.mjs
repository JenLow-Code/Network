import {test} from 'node:test';
import assert from 'node:assert/strict';
import scanner from '../scan-worker/worker.js';

const ROOT='https://jenlow-music-scan.jenlow-production.workers.dev';
const ORIGIN='https://network.jenlow.net';
const OMR_ORIGIN='https://omr.internal.test';
const IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAcUlEQVR4nO3aQQrAIAwAwab0/1+2j1AYhJ27kMVTILPWem726gF2FaAVoBWgFaAVoBWgFaAVoBWgfTuPZ+bIEDt7+fU/UIBWgFaAVoBWgFaAVoBWgFaAVoBWg/qfEJe0vKxRMAAAAASUVORK5CYII=';
const ID='00000000-0000-0000-0000-000000000001';
const headers={origin:ORIGIN,authorization:'Bearer opaque-supabase-token',
  'content-type':'application/json'};
const mockDb={
  prepare(){return{bind(){return this;},async run(){return{success:true};},
    async first(){return{attempt_count:1}}};},
};
const model=(answer)=>({run:async(_id,params)=>{
  const parts=params?.messages?.find(m=>m.role==='user')?.content;
  assert.ok(Array.isArray(parts));
  assert.ok(parts.some(p=>p.type==='image_url'&&p.image_url.url===IMAGE));
  return {choices:[{message:{content:JSON.stringify(answer)}}]};
}});
const call=(body,overrideHeaders={})=>new Request(ROOT+'/api/music/scan',{
  method:'POST',headers:{...headers,...overrideHeaders},body:JSON.stringify(body),
});
const authReply=()=>Response.json({id:ID});
const sampleScore={
  mode:'score',status:'needs_review',engine:'audiveris',title:'Chant',
  musicXml:'<score-partwise><part-list/></score-partwise>',
  parts:[
    {id:'P1:staff-1:voice-1',clef:'treble',name:'Voix / main droite',staff:1,voice:'1'},
    {id:'P1:staff-2:voice-2',clef:'bass',name:'Main gauche / basse',staff:2,voice:'2'},
  ],
  notes:[
    {id:'n1',instrument:'piano',midi:67,startBeats:0,lengthBeats:1,
      scorePartId:'P1:staff-1:voice-1',scoreClef:'treble'},
    {id:'n2',instrument:'piano',midi:43,startBeats:0,lengthBeats:1,
      scorePartId:'P1:staff-2:voice-2',scoreClef:'bass'},
  ],
  numerator:3,denominator:4,measureCount:4,
};
function fakeFetch(reply){
  return async(url,options)=>{
    if(String(url).includes('/auth/v1/user'))return authReply();
    assert.equal(String(url),OMR_ORIGIN+'/v1/score');
    assert.equal(options.headers.Authorization,'Bearer '+('s'.repeat(40)));
    return Response.json(reply);
  };
}
test('health states whether the real OMR backend is configured',async()=>{
  const response=await scanner.fetch(new Request(ROOT+'/health'),{AI:model({}),DB:mockDb});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{
    status:'ok',ai:true,quota:true,omr:false,
  });
});
test('unauthenticated scan is rejected before any expensive work',async()=>{
  const response=await scanner.fetch(new Request(ROOT+'/api/music/scan',{
    method:'POST',headers:{origin:ORIGIN},body:JSON.stringify({mode:'score',image:IMAGE}),
  }),{AI:model({}),DB:mockDb});
  assert.equal(response.status,401);
});
test('cross-origin writes are denied',async()=>{
  const response=await scanner.fetch(call({mode:'score',image:IMAGE},{
    origin:'https://other.example',
  }),{AI:model({}),DB:mockDb});
  assert.equal(response.status,403);
});
test('score scans fail closed when the genuine OMR backend is absent',async()=>{
  const prior=globalThis.fetch;globalThis.fetch=async()=>authReply();
  try{
    let modelCalls=0;
    const response=await scanner.fetch(call({mode:'score',image:IMAGE}),{
      AI:{run:()=>{modelCalls++;return{};}},DB:mockDb,
    });
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,'omr_required');
    assert.equal(modelCalls,0,'a vision model must NEVER invent music');
  }finally{globalThis.fetch=prior;}
});
test('text transcription continues to use the separate OCR path',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>authReply();
  try{
    const response=await scanner.fetch(call({mode:'text',image:IMAGE}),{
      AI:model({title:'Mon texte',text:'Bonjour\nmonde',language:'fr'}),DB:mockDb,
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.text,'Bonjour\nmonde');
    assert.equal(data.mode,'text');
    assert.equal(data.notes,undefined);
  }finally{globalThis.fetch=previous;}
});
test('score scanner only forwards genuine Audiveris MusicXML and separate parts',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=fakeFetch(sampleScore);
  try{
    const response=await scanner.fetch(call({
      mode:'score',image:IMAGE,sourceStructure:{staffCount:4,estimatedSystems:2},
    }),{DB:mockDb,AI:model({notes:[{midi:60}]}) ,
      OMR_ORIGIN,OMR_API_TOKEN:'s'.repeat(40)});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.engine,'audiveris');
    assert.equal(data.notes.length,2);
    assert.deepEqual(new Set(data.parts.map(x=>x.clef)),new Set(['treble','bass']));
    assert.equal(data.status,'needs_review');
  }finally{globalThis.fetch=previous;}
});
test('a generic visual-model note list is rejected even when OMR is configured',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=fakeFetch({
    mode:'score',title:'Fake',notes:Array.from({length:27},()=>({
      midi:60,startBeats:0,lengthBeats:1,
    })),
  });
  try{
    const response=await scanner.fetch(call({mode:'score',image:IMAGE}),{
      DB:mockDb,OMR_ORIGIN,OMR_API_TOKEN:'s'.repeat(40),
    });
    assert.equal(response.status,422);
    assert.equal((await response.json()).error.code,'omr_invalid');
  }finally{globalThis.fetch=previous;}
});
test('only HTTPS origins can be used as OMR backends',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>authReply();
  try{
    const response=await scanner.fetch(call({mode:'score',image:IMAGE}),{
      DB:mockDb,OMR_ORIGIN:'http://localhost:8000',OMR_API_TOKEN:'s'.repeat(40),
    });
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,'omr_configuration');
  }finally{globalThis.fetch=previous;}
});
