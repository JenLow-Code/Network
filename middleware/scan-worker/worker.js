/** JenLow Music private OCR + assisted OMR Worker.
 *
 * Cloudflare bindings: AI (Workers AI) and DB (existing D1 auth_rate_limits).
 * Private image bytes are not persisted, cached, logged or returned.
 * Exact notes from a scan are only drafts for mandatory human review.
 */
const MODEL='@cf/google/gemma-4-26b-a4b-it';
const FALLBACK_MODEL='@cf/qwen/qwen3.8-27b';
const URL_AUTH='https://ldliraxelqftisjofwgv.supabase.co';
const ANON_KEY='sb_publishable_cpxxQyXcEYEy3mwWAaTG9w_QNFg9tC9';
const ALLOWED=new Set(['https://network.jenlow.net',
  'http://localhost:8081','http://localhost:19006']);
const LIMIT=1_800_000;
function json(data,status=200,origin=''){
  const headers={
    'content-type':'application/json;charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
  };
  if(origin&&ALLOWED.has(origin)){
    headers['access-control-allow-origin']=origin;
    headers['vary']='Origin';
  }
  return new Response(JSON.stringify(data),{status,headers});
}
function error(code,status,origin,message){
  return json({error:{code,message:message||code}},status,origin);
}
async function auth(request){
  const token=request.headers.get('authorization')?.match(/^Bearer ([^ ]+)$/)?.[1];
  if(!token||token.length>4096)return null;
  try{
    const resp=await fetch(URL_AUTH+'/auth/v1/user',{
      headers:{apikey:ANON_KEY,authorization:'Bearer '+token},
      signal:AbortSignal.timeout(9000),
    });
    if(!resp.ok)return null;
    const user=await resp.json();
    return typeof user.id==='string'&&/^[a-f\d-]{36}$/i.test(user.id)?user.id:null;
  }catch{return null;}
}
async function quota(env,userId){
  const now=Math.floor(Date.now()/1000),start=now-now%900;
  const input=new TextEncoder().encode('music_scan:'+userId);
  const digest=await crypto.subtle.digest('SHA-256',input);
  const key=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare(
    'INSERT INTO auth_rate_limits(throttle_key,attempt_count,window_start,expires_at) '+
    'VALUES(?,1,?,?) ON CONFLICT(throttle_key) DO UPDATE SET '+
    'attempt_count=CASE WHEN window_start=? THEN attempt_count+1 ELSE 1 END,'+
    'window_start=?,expires_at=?',
  ).bind(key,start,start+900,start,start,start+900).run();
  const current=await env.DB.prepare(
    'SELECT attempt_count FROM auth_rate_limits WHERE throttle_key=?')
    .bind(key).first();
  return (current?.attempt_count??1000)<=12;
}
async function safeJson(request){
  const claimed=Number(request.headers.get('content-length')||0);
  if(claimed>LIMIT)throw Error('too_large');
  if(!request.body)throw Error('empty');
  const reader=request.body.getReader();
  const chunks=[];let length=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    length+=value.length;
    if(length>LIMIT){await reader.cancel();throw Error('too_large');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}
  catch{throw Error('invalid_json');}
}
function parseResponse(raw){
  if(typeof raw!=='string')throw Error('unreadable');
  const text=raw.trim().replace(/^\`\`\`(?:json)?\s*/i,'')
    .replace(/\s*\`\`\`$/,'');
  try{return JSON.parse(text);}catch{
    const a=text.indexOf('{'),b=text.lastIndexOf('}');
    if(a>=0&&b>a)try{return JSON.parse(text.slice(a,b+1));}catch{}
  }
  throw Error('unreadable');
}
function scanResult(data,mode){
  if(!data||typeof data!=='object')throw Error('unreadable');
  const title=typeof data.title==='string'?data.title.trim().slice(0,100):'';
  if(mode==='text'){
    const text=typeof data.text==='string'?data.text.trim().slice(0,16000):'';
    if(text.length<2)throw Error('no_text');
    return {mode:'text',title:title||'Texte numérisé',
      text,language:typeof data.language==='string'?data.language.slice(0,30):'fr',
      engine:MODEL,warnings:[
        'Vérifie les mots manuscrits, accents et retours à la ligne avant d’enregistrer.',
      ]};
  }
  const notes=[];
  for(const raw of (Array.isArray(data.notes)?data.notes:[]).slice(0,350)){
    if(!raw||typeof raw!=='object')continue;
    const midi=Number(raw.midi),startBeats=Number(raw.startBeats);
    const lengthBeats=Number(raw.lengthBeats);
    if(![midi,startBeats,lengthBeats].every(Number.isFinite)||
      midi<21||midi>108||startBeats<0||startBeats>6000||
      lengthBeats<=0||lengthBeats>64)continue;
    notes.push({midi:Math.round(midi),
      startBeats:Math.round(startBeats*1000)/1000,
      lengthBeats:Math.round(lengthBeats*1000)/1000,
      velocity:85});
  }
  notes.sort((a,b)=>a.startBeats-b.startBeats||a.midi-b.midi);
  if(!notes.length)throw Error('no_notes');
  const bpm=Number(data.bpm),numerator=Number(data.numerator);
  const denominator=Number(data.denominator);
  return {mode:'score',title:title||'Partition numérisée',
    notes,bpm:bpm>=30&&bpm<=240?Math.round(bpm):100,
    numerator:Number.isInteger(numerator)&&numerator>=1&&numerator<=16?
      numerator:4,denominator:[2,4,8,16].includes(denominator)?
      denominator:4,clef:data.clef==='bass'?'bass':'treble',
    engine:MODEL,warnings:[
      'Estimation expérimentale, non une transcription garantie : vérifie les notes, les rythmes et les voix avant utilisation.',
    ]};
}
const TEXT_PROMPT=[
  'Read this photographed document, including handwriting.',
  'Return ONLY JSON {"title":"", "text":"verbatim visible text with line breaks",',
  '"language":"fr"}. Preserve line breaks and original language.',
  'Mark illegible words [illisible], do not invent or translate.',
].join(' ');
const SCORE_PROMPT=[
  'Analyze this printed music score photo. Respond ONLY with JSON:',
  '{"title":"", "bpm":100,"numerator":3,"denominator":4,',
  '"clef":"treble","notes":[{"midi":60,"startBeats":0,"lengthBeats":1}]}.',
  'Read ONLY VISIBLE notes, based on staff positions and clef.',
  'Each note has a MIDI pitch and exact timing in quarter notes.',
  'Simultaneous notes share startBeats. Do not treat lyrics as notes.',
  'Skip unclear notes rather than guessing. If impossible, return notes: [].',
  'This is a draft for human review, not an authoritative transcription.',
].join(' ');
export default{
  async fetch(request,env){
    const origin=request.headers.get('origin')||'';
    if(origin&&!ALLOWED.has(origin))
      return error('origin_not_allowed',403,origin);
    const path=new URL(request.url).pathname;
    if(request.method==='OPTIONS'&&origin&&ALLOWED.has(origin))
      return new Response(null,{status:204,headers:{
        'access-control-allow-origin':origin,
        'access-control-allow-methods':'POST,GET,OPTIONS',
        'access-control-allow-headers':'Authorization,Content-Type',
        'access-control-max-age':'3600','vary':'Origin',
      }});
    if(path==='/health'&&request.method==='GET')
      return json({status:'ok',ai:!!env.AI,quota:!!env.DB},200,origin);
    if(path!=='/api/music/scan'||request.method!=='POST')
      return error('not_found',404,origin);
    if(!env.AI||!env.DB)return error('scan_unavailable',503,origin,
      'Scanner AI not configured.');
    const identity=await auth(request);
    if(!identity)return error('not_authenticated',401,origin);
    try{
      if(!(await quota(env,identity)))return error('rate_limited',429,origin,
        'Maximum 12 scans per 15 minutes.');
    }catch{return error('quota_unavailable',503,origin);}
    let body;
    try{body=await safeJson(request);}
    catch(e){return error(e.message==='too_large'?'image_too_large':'invalid_json',
      e.message==='too_large'?413:400,origin);}
    const mode=body?.mode;
    if(mode!=='text'&&mode!=='score')return error('invalid_mode',400,origin);
    const image=body?.image;
    if(typeof image!=='string'||image.length<100||image.length>1_750_000||
      !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image))
      return error('invalid_image',400,origin);
    // A failure of the primary model is NOT proof the scanner is unconfigured.
    // Try a second EU-usable vision model. Both outputs are unverified drafts.
    let failure='model_unavailable';
    for(const model of [MODEL,FALLBACK_MODEL]){
      try{
        const answer=await env.AI.run(model,{
          messages:[{role:'system',
            content:'Return strictly valid JSON from the visible image; never invent missing notes or text.'},
            {role:'user',content:[
              {type:'text',text:mode==='text'?TEXT_PROMPT:SCORE_PROMPT},
              {type:'image_url',image_url:{url:image}},
            ]}],
          max_completion_tokens:mode==='text'?2900:4400,
          chat_template_kwargs:{enable_thinking:false},
          temperature:0,store:false,
        });
        const raw=answer?.choices?.[0]?.message?.content||answer?.response;
        const scanned=scanResult(parseResponse(raw),mode);
        return json({...scanned,engine:model},200,origin);
      }catch(e){
        const reason=String(e?.message||e);
        if(reason.includes('no_notes'))failure='scan_no_notes';
        else if(reason.includes('no_text'))failure='scan_no_text';
        else if(reason.includes('unreadable'))failure='scan_unreadable';
        else if(/invalid data for image|image dimensions|invalid base64|too large/i.test(reason))
          failure='image_unreadable';
        else if(/quota|insufficient|limit exceeded|rate limit|credits|balance/i.test(reason))
          failure='model_quota';
        else failure='model_unavailable';
      }
    }
    const unreadable=['scan_no_notes','scan_no_text','scan_unreadable','image_unreadable']
      .includes(failure);
    const explanation=failure==='scan_no_notes'?
      'Aucune note fiable reconnue. Recadre la portée et réessaie ou importe du MusicXML.':
      failure==='scan_no_text'?
      'Aucun texte lisible reconnu. Réessaie avec un scan plus net.':
      failure==='image_unreadable'?
      'Le modèle ne peut pas lire cette image. Essaie une photo JPG recadrée.':
      failure==='model_quota'?
      'Le service d’analyse a atteint sa limite temporaire.':
      unreadable?
      'La reconnaissance de cette image a échoué. Recadre le document et réessaie.':
      'Le service d’analyse a échoué. Réessaie avec une image plus petite.';
    return error(failure,unreadable?422:503,origin,explanation);
  },
};
