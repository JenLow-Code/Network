import type {Router} from '../http/router';
import {ApiError, badRequest, unprocessable, unavailable, unauthenticated} from '../http/errors';
import {enforceLimit,LIMITS} from '../http/rateLimit';
import type {Ctx} from '../http/context';

// Publishable details match the existing JenLow Supabase auth client; they
// are NOT privileged secrets. The access token is verified with Supabase,
// never merely decoded or trusted based on a client-supplied user ID.
const SUPABASE_URL='https://ldliraxelqftisjofwgv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_cpxxQyXcEYEy3mwWAaTG9w_QNFg9tC9';
async function scannerIdentity(ctx:Ctx):Promise<string>{
  const native=await ctx.viewer();
  if(native)return 'jenlow:'+native.id;
  const token=ctx.request.headers.get('authorization')?.match(/^Bearer ([^ ]+)$/)?.[1];
  if(!token||token.length>4096)throw unauthenticated();
  const host=(ctx.env.SUPABASE_URL||SUPABASE_URL).replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(host))
    throw unavailable('auth_not_configured');
  const key=ctx.env.SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
  let response:Response;
  try{
    response=await fetch(host+'/auth/v1/user',{
      headers:{apikey:key,Authorization:'Bearer '+token},
      signal:AbortSignal.timeout(8000),
    });
  }catch{throw unavailable('supabase_auth_unreachable');}
  if(!response.ok)throw unauthenticated();
  const user=await response.json() as {id?:unknown};
  if(typeof user.id!=='string'||!/^[a-f0-9-]{36}$/i.test(user.id))
    throw unauthenticated();
  return 'supabase:'+user.id;
}

type ScanMode='text'|'score';
type ScoreNote={midi:number;startBeats:number;lengthBeats:number;velocity:number};

const BASE_MODEL='@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_REQUEST_BYTES=1_800_000;
const MAX_EVENTS=350;

async function boundedJson(request:Request):Promise<unknown>{
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>MAX_REQUEST_BYTES)
    throw new ApiError(413,'scan_too_large','Image trop volumineuse.');
  const stream=request.body;
  if(!stream)throw badRequest('scan_missing_image');
  const reader=stream.getReader();
  const parts:Uint8Array[]=[];
  let size=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>MAX_REQUEST_BYTES){
      await reader.cancel();
      throw new ApiError(413,'scan_too_large','Image trop volumineuse.');
    }
    parts.push(value);
  }
  const bytes=new Uint8Array(size);
  let position=0;
  for(const part of parts){bytes.set(part,position);position+=part.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}
  catch{throw badRequest('scan_invalid_json');}
}
function str(x:unknown,max=3000):string{
  return typeof x==='string'?x.trim().slice(0,max):'';
}
function fromModel(raw:string):Record<string,unknown>{
  const cleaned=raw.trim().replace(/^\`\`\`(?:json)?\s*/i,'')
    .replace(/\s*\`\`\`$/,'');
  try{
    const parsed=JSON.parse(cleaned);
    if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
      return parsed as Record<string,unknown>;
  }catch{
    // Vision models can include a short preamble despite a JSON-only prompt.
    const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
    if(start>=0&&end>start)try{
      const parsed=JSON.parse(cleaned.slice(start,end+1));
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
        return parsed as Record<string,unknown>;
    }catch{/* Explicit unrecognized result below. */}
  }
  throw unprocessable('scan_unreadable','Le moteur ne peut pas interpréter cette image.');
}
function scoreResult(model:Record<string,unknown>){
  const raw=Array.isArray(model.notes)?model.notes:[];
  const warnings=['Reconnaissance musicale expérimentale : vérifie la hauteur et la durée de chaque note, les voix et les reprises avant utilisation.'];
  const notes:ScoreNote[]=[];
  for(const item of raw.slice(0,MAX_EVENTS)){
    if(!item||typeof item!=='object'||Array.isArray(item))continue;
    const n=item as Record<string,unknown>;
    const pitch=Number(n.midi),at=Number(n.startBeats),duration=Number(n.lengthBeats);
    if(!Number.isFinite(pitch)||!Number.isFinite(at)||!Number.isFinite(duration)||
      pitch<21||pitch>108||at<0||at>6000||duration<=0||duration>64)continue;
    notes.push({midi:Math.round(pitch),
      startBeats:Math.round(at*1000)/1000,
      lengthBeats:Math.round(duration*1000)/1000,
      velocity:85});
  }
  notes.sort((a,b)=>a.startBeats-b.startBeats||a.midi-b.midi);
  if(!notes.length)
    throw unprocessable('scan_no_notes',
      'Aucune note fiable trouvée. Essaie une image plus nette ou importe un fichier MusicXML.');
  const bpm=Number(model.bpm);
  const num=Number(model.numerator),den=Number(model.denominator);
  return {
    mode:'score', title:str(model.title,100)||'Partition numérisée',
    notes,bpm:Number.isFinite(bpm)&&bpm>=30&&bpm<=240?Math.round(bpm):100,
    numerator:Number.isInteger(num)&&num>=1&&num<=16?num:4,
    denominator:[2,4,8,16].includes(den)?den:4,
    clef:model.clef==='bass'?'bass':'treble',
    warnings,
    engine:BASE_MODEL,
  };
}
export function registerMusicScan(r:Router):void{
  r.add('POST','/api/music/scan',{
    tag:'Music',summary:'Analyse privée d’une photo de paroles ou partition (résultat à vérifier)',
    auth:'required',
  },async(ctx:Ctx)=>{
    const identity=await scannerIdentity(ctx);
    await enforceLimit(ctx.sql,'music_scan',identity,Math.min(16,LIMITS.write));
    if(!ctx.env.AI)throw unavailable('music_scan_unavailable',
      'Le moteur de reconnaissance n’est pas encore configuré.');
    const body=await boundedJson(ctx.request);
    if(!body||typeof body!=='object'||Array.isArray(body))
      throw badRequest('scan_invalid_body');
    const input=body as Record<string,unknown>;
    const mode=input.mode as ScanMode;
    if(mode!=='text'&&mode!=='score')throw badRequest('scan_invalid_mode');
    const image=str(input.image,1_750_000);
    if(!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)||
      image.length>1_750_000||image.length<80)
      throw badRequest('scan_invalid_image','Utilise une image PNG, JPG ou WebP.');
    const prompt=mode==='text'?[
      'You are a careful document transcription specialist.',
      'Transcribe EXACTLY the visible printed or handwritten text in the provided image.',
      'Preserve original line breaks and languages; never translate or invent missing words.',
      'If illegible mark [illisible]. No commentary.',
      'Return ONLY valid JSON: {"title":"short heading","text":"all visible text, with line breaks","language":"fr/de/en/pt/other"}.',
    ].join(' '):[
      'You are reading a PHOTOGRAPH of music notation for a cautious editable draft.',
      'Return ONLY JSON with fields:',
      '{"title":"", "bpm":100,"numerator":3,"denominator":4,',
      '"clef":"treble","notes":[{"midi":60,"startBeats":0,"lengthBeats":1}]}.',
      'Each event must be a VISIBLE pitched note, MIDI 21..108, with startBeats and',
      'lengthBeats in quarter notes from first printed measure. Read noteheads',
      'and rests carefully; simultaneous notes share their startBeats.',
      'No lyrics as notes. No made-up pitches. If an event is unclear OMIT it.',
      'If you cannot read the printed staff reliably return "notes":[]',
      'Do not output markdown or explanations. Unknown tempo may default to 100.',
      'Never invent a complete score from a partially visible sheet.',
    ].join(' ');
    let response:unknown;
    try{
      response=await ctx.env.AI.run(BASE_MODEL,{
        messages:[{role:'system',content:'You extract only what is visible. Respond strictly as JSON.'},
          {role:'user',content:prompt}],
        image,max_tokens:mode==='score'?2900:2500,temperature:0,
      });
    }catch{
      throw unavailable('scan_engine_failed','Le moteur de reconnaissance est indisponible.');
    }
    const raw=str((response as {response?:unknown})?.response,18000);
    if(!raw)throw unprocessable('scan_unreadable','Aucun texte reconnu.');
    const parsed=fromModel(raw);
    if(mode==='score')return scoreResult(parsed);
    const text=str(parsed.text,16000);
    if(text.length<2)throw unprocessable('scan_no_text',
      'Aucun texte lisible détecté. Essaie un scan plus net.');
    return {mode:'text',title:str(parsed.title,100)||'Texte numérisé',
      text,language:str(parsed.language,30)||'fr',
      warnings:['Vérifie les accents, les mots manuscrits et les retours à la ligne avant d’enregistrer.'],
      engine:BASE_MODEL};
  });
}
