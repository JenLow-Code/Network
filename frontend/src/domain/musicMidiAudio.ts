import {getDraftAttachment,saveDraftAudio} from './musicLocalStorage';
import {newMusicId} from './musicWorkspace';
import {parseMusicMidi} from './musicMidiParser';
import type {MusicNotationEvent} from './musicNotation';
import type {MusicProjectFile} from './musicWorkspace';
import {midiFrequency,samplePlaybackRate,sampleAudioRegion,drumOneShotSeconds} from './musicSampleInstrument';

const RATE=44100;
const MAX_SECONDS=420;
const MAX_NOTES=16000;
const PINK_NOTE_DURATION_TAIL=.15;

/** OfflineAudioContext is the same Web Audio platform used by the interactive
 * composer. It renders a REAL WAV buffer instead of treating .mid as audio.
 * No external upload, MP3 encoder, or server conversion is involved.
 */
async function offlineWav(events:MusicNotationEvent[],bpm:number,
  tone:string,sampleId?:string,sampleRoot=60,sampleRootHz?:number,
  drumSamples?:MusicProjectFile['drumSamples'],
  sampleEndMode:MusicProjectFile['instrumentSampleEndMode']='fade'):Promise<File>{
  if(typeof OfflineAudioContext==='undefined')
    throw new Error('Conversion MIDI en audio indisponible dans ce navigateur.');
  const notes=events.filter(e=>!e.draft&&Number.isFinite(e.midi)&&
    Number.isFinite(e.startBeats)&&Number.isFinite(e.lengthBeats));
  if(!notes.length)throw new Error('Aucune note validée à convertir en audio.');
  if(notes.length>MAX_NOTES)throw new Error('Trop de notes pour une conversion locale.');
  const speed=60/Math.max(20,Math.min(300,bpm));
  // Load the exact drum kit used by this score. Missing samples are errors:
  // silently substituting synthetic drums would change the musician's work.
  const drumBuffers=new Map<number,{buffer:AudioBuffer;
    region:ReturnType<typeof sampleAudioRegion>}>();
  const activeDrums=new Set(notes.filter(n=>n.instrument==='drum').map(n=>n.midi));
  const entries=Object.entries(drumSamples||{}).filter(([key])=>
    activeDrums.has(Number(key)));
  if(entries.length){
    const decoder=new OfflineAudioContext(2,1,RATE);
    for(const [key,assignment] of entries){
      const midi=Number(key);
      if(!Number.isFinite(midi)||!assignment?.localFileId)
        throw new Error('Un son de percussion est mal configuré.');
      const blob=await getDraftAttachment(assignment.localFileId);
      if(!blob)throw new Error('Son introuvable sur cet appareil : '+assignment.name);
      const buffer=await decoder.decodeAudioData(await blob.arrayBuffer());
      const region=sampleAudioRegion(buffer);
      if(region.peak<.002)throw new Error('Échantillon silencieux : '+assignment.name);
      drumBuffers.set(midi,{buffer,region});
    }
  }
  // A MIDI drum hit may be a sixteenth-note trigger, but its audio tail
  // (particularly a cymbal) must ring past that trigger and remain in the WAV.
  const duration=Math.max(...notes.map(n=>{
    const hit=drumBuffers.get(n.midi);
    if(n.instrument==='drum'&&hit)
      return Math.max(0,n.startBeats)*speed+
        drumOneShotSeconds(hit.buffer.duration,hit.region.offset);
    return Math.max(0,n.startBeats+n.lengthBeats)*speed;
  }))+PINK_NOTE_DURATION_TAIL;
  if(duration>MAX_SECONDS)
    throw new Error('Cette composition dépasse 7 minutes : découpe-la pour le rendu local.');
  const frames=Math.ceil(Math.max(.3,duration)*RATE);
  // Stereo 16-bit PCM. Limit temporary memory, too.
  if(frames*4>85*1024*1024)
    throw new Error('Audio trop volumineux pour un rendu local.');
  const ctx=new OfflineAudioContext(2,frames,RATE);
  let sample:AudioBuffer|null=null;
  if(tone==='Échantillon'&&!sampleId)
    throw new Error('Le son personnalisé manque : ouvre la partition et choisis un échantillon.');
  if(tone==='Échantillon'&&sampleId){
    const file=await getDraftAttachment(sampleId);
    if(!file)throw new Error('Échantillon audio manquant sur cet appareil.');
    sample=await ctx.decodeAudioData(await file.arrayBuffer());
  }
  let seed=2166136261;
  const noise=(count:number)=>{
    const b=ctx.createBuffer(1,count,RATE),data=b.getChannelData(0);
    for(let i=0;i<count;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      data[i]=((seed/4294967295)*2-1)*(1-i/count);
    }
    return b;
  };
  const drums=new Map<number,AudioBuffer>();
  const master=ctx.createGain();
  master.gain.value=.8;
  master.connect(ctx.destination);
  for(const n of notes){
    const start=Math.max(0,n.startBeats)*speed+.005;
    const held=Math.max(.055,n.lengthBeats*speed);
    const drum=n.instrument==='drum';
    const hit=drum?drumBuffers.get(n.midi):undefined;
    const length=hit?
      drumOneShotSeconds(hit.buffer.duration,hit.region.offset):
      drum?Math.min(.6,held):Math.min(held,12);
    const stop=Math.min(duration-.002,start+length);
    if(stop<=start)continue;
    const amp=Math.max(.015,Math.min(1,(n.velocity||90)/127));
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.00001,start);
    const voiceVolume=amp*(drum?.16:.20);
    const attack=Math.min(.008,length*.2);
    const release=Math.min(.07,length*.25);
    gain.gain.linearRampToValueAtTime(voiceVolume,start+attack);
    gain.gain.setValueAtTime(voiceVolume,Math.max(start+attack,stop-release));
    gain.gain.exponentialRampToValueAtTime(.0001,stop);
    gain.connect(master);
    if(drum&&hit){
      const source=ctx.createBufferSource();
      source.buffer=hit.buffer;
      source.playbackRate.value=1;
      const boost=Math.min(2.2,.6/Math.max(.05,hit.region.peak));
      const attack=Math.min(.004,length*.2);
      const release=Math.min(.05,length*.15);
      const level=voiceVolume*boost;
      gain.gain.cancelScheduledValues(start);
      gain.gain.setValueAtTime(.00001,start);
      gain.gain.linearRampToValueAtTime(level,start+attack);
      gain.gain.setValueAtTime(level,Math.max(start+attack,stop-release));
      gain.gain.exponentialRampToValueAtTime(.0001,stop);
      source.connect(gain);
      source.start(start,Math.min(hit.region.offset,
        Math.max(0,hit.buffer.duration-.015)));
      source.stop(stop);
      continue;
    }
    if(!drum&&tone==='Échantillon'&&sample){
      const source=ctx.createBufferSource();
      source.buffer=sample;
      const reference=sampleRootHz&&sampleRootHz>0&&Number.isFinite(sampleRootHz)?
        sampleRootHz:midiFrequency(sampleRoot);
      const region=sampleAudioRegion(sample);
      if(region.peak<.0001)
        throw new Error('Le son personnalisé est silencieux.');
      const offset=Math.min(region.offset,Math.max(0,sample.duration-.01));
      const available=Math.max(.015,sample.duration-offset);
      const baseRate=samplePlaybackRate(n.midi,reference);
      const rate=sampleEndMode==='slow'&&available/baseRate<length?
        Math.max(.08,available/length):baseRate;
      const audible=sampleEndMode==='repeat'?length:Math.min(length,available/rate);
      const sampleStop=Math.min(duration-.002,start+audible);
      if(sampleStop<=start)continue;
      source.playbackRate.value=rate;
      // Explicit repeat only. All other modes respect the physical end of source.
      if(sampleEndMode==='repeat'){
        source.loop=true;
        source.loopStart=region.loopEnd-region.loopStart>.07?region.loopStart:offset;
        source.loopEnd=region.loopEnd-region.loopStart>.07?region.loopEnd:sample.duration;
      }
      const boost=Math.min(2.5,.62/Math.max(.05,region.peak));
      const level=voiceVolume*boost;
      const fade=Math.min(.12,Math.max(.012,(sampleStop-start)*.22));
      const ramp=Math.min(attack,(sampleStop-start)*.2);
      gain.gain.cancelScheduledValues(start);
      gain.gain.setValueAtTime(.00001,start);
      gain.gain.linearRampToValueAtTime(level,start+ramp);
      gain.gain.setValueAtTime(level,Math.max(start+ramp,sampleStop-fade));
      gain.gain.exponentialRampToValueAtTime(.0001,sampleStop);
      source.connect(gain);
      source.start(start,offset);
      source.stop(sampleStop);
      continue;
    }
    if(drum&&n.midi!==36){
      const noiseLength=Math.round(Math.min(.5,Math.max(.09,length))*RATE);
      const key=n.midi*100000+noiseLength;
      let buffer=drums.get(key);
      if(!buffer){buffer=noise(noiseLength);drums.set(key,buffer);}
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
      source.buffer=buffer;
      filter.type=[42,46,49,51].includes(n.midi)?'highpass':'bandpass';
      filter.frequency.value=filter.type==='highpass'?5600:1200;
      source.connect(filter);filter.connect(gain);
      source.start(start);source.stop(Math.min(stop,start+buffer.duration));
      continue;
    }
    const oscillator=ctx.createOscillator();
    oscillator.type=drum?'sine':tone==='Orgue'?'sine':
      tone==='Synthé'||tone==='Cordes'?'sawtooth':'triangle';
    const hz=drum?125:440*Math.pow(2,(n.midi-69)/12);
    oscillator.frequency.setValueAtTime(hz,start);
    if(drum)oscillator.frequency.exponentialRampToValueAtTime(46,start+.13);
    oscillator.connect(gain);
    oscillator.start(start);oscillator.stop(stop);
  }
  const rendered=await ctx.startRendering();
  const length=rendered.length;
  const size=44+length*4;
  const bytes=new ArrayBuffer(size),view=new DataView(bytes);
  const write=(offset:number,value:string)=>{
    for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));
  };
  write(0,'RIFF');view.setUint32(4,size-8,true);write(8,'WAVE');
  write(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,2,true);
  view.setUint32(24,RATE,true);view.setUint32(28,RATE*4,true);
  view.setUint16(32,4,true);view.setUint16(34,16,true);
  write(36,'data');view.setUint32(40,length*4,true);
  const left=rendered.getChannelData(0),right=rendered.getChannelData(1);
  let peak=0;
  for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const scale=peak>.94?.94/peak:1;
  for(let i=0;i<length;i++){
    const x=Math.max(-1,Math.min(1,left[i]*scale));
    const y=Math.max(-1,Math.min(1,right[i]*scale));
    view.setInt16(44+i*4,Math.round(x*32767),true);
    view.setInt16(46+i*4,Math.round(y*32767),true);
  }
  return new File([bytes],'composition-midi.wav',{type:'audio/wav'});
}

/** One render per addition into an arrangement. Original MIDI/notation is
 * immutable; the resulting linked audio is local and editable as a track. */
export async function renderMidiPreviewWav(source:MusicProjectFile):Promise<File>{
  let notes=source.musicEvents;
  let bpm=source.tempoBpm||100;
  if(!notes?.length){
    if(!source.localFileId||!(/\.(mid|midi)$/i.test(source.originalFilename||'')))
      throw new Error('Ce fichier ne contient pas de notes MIDI.');
    const blob=await getDraftAttachment(source.localFileId);
    if(!blob)throw new Error('Fichier MIDI introuvable sur cet appareil.');
    const parsed=parseMusicMidi(new Uint8Array(await blob.arrayBuffer()));
    notes=parsed.events;bpm=parsed.bpm;
  }
  return offlineWav(notes,bpm,source.instrumentTone||'Piano doux',
    source.instrumentSampleLocalId,source.instrumentSampleRootMidi??60,
    source.instrumentSampleRootHz,source.drumSamples,
    source.instrumentSampleEndMode||'fade');
}

export async function renderMidiSource(source:MusicProjectFile):Promise<MusicProjectFile>{
  const wav=await renderMidiPreviewWav(source);
  const localFileId=await saveDraftAudio(wav);
  return {
    id:newMusicId(),kind:'audio',title:source.title,sectionIds:source.sectionIds||[],
    originalFilename:source.title.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,50)+'.wav',
    mimeType:'audio/wav',localFileId,durationSeconds:(wav.size-44)/(RATE*4),
    /** Traceability to the source notation; capture keeps the editable MIDI. */
    renderedFromMidiId:source.id,createdAt:new Date().toISOString(),
    instrument:source.instrument,
  };
}

export function isMidiSource(file:MusicProjectFile):boolean {
  return !!file.musicEvents?.length||
    /\.(mid|midi)$/i.test(file.originalFilename||'');
}
