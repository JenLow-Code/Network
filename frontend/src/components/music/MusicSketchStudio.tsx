import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import Svg,{Circle,Ellipse,Line,Path,Text as SvgText} from 'react-native-svg';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {DRUM_PADS,downloadMusicMidi,downloadMusicScorePdf,musicNoteName,liveNoteLength,liveNotePosition,resizeMusicNote} from '@/domain/musicNotation';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import {saveDraftAudio,getDraftAudio} from '@/domain/musicLocalStorage';
import {analyzeSamplePitch,midiFrequency,samplePlaybackRate,sampleRegion} from '@/domain/musicSampleInstrument';

const PINK='#CB245C';
type Instrument='piano'|'drum';
type ScoreResult={title:string;events:MusicNotationEvent[];bpm:number;
  tone:string;sampleLocalId?:string;sampleName?:string;
  sampleRootMidi?:number;sampleRootHz?:number;clef?:'treble'|'bass'};
type Props={
  initialFile?:MusicProjectFile|null;
  onSave:(value:ScoreResult)=>void;
  onDirtyChange:(dirty:boolean)=>void;
  active?:boolean;
};
type MidiPort={id:string;name?:string;send:(data:number[])=>void};
type MidiAccess={outputs:Map<string,MidiPort>};
const NOTE_VALUES=[
  {beats:.25,label:'Double croche'},
  {beats:.5,label:'Croche'},
  {beats:.75,label:'Croche pointée'},
  {beats:1,label:'Noire'},
  {beats:1.5,label:'Noire pointée'},
  {beats:2,label:'Blanche'},
  {beats:3,label:'Blanche pointée'},
  {beats:4,label:'Ronde'},
] as const;
const TONES=['Piano doux','Orgue','Synthé','Cordes'] as const;
const BLACKS=new Set([1,3,6,8,10]);
const newId=()=> 'note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const beatLabel=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const durationLabel=(v:number)=>v===.25?'¼':v===.5?'½':v+'';
const notePosition=(midi:number)=>{
  const semitone=((midi%12)+12)%12;
  const steps=[0,0,1,1,2,3,3,4,4,5,5,6][semitone];
  return 134-(Math.floor(midi/12)-5)*42-steps*6;
};

/** Render the shape of the rhythmic note value, including beams/flags and dots.
 * A held live performance can have an unquantized length: show the closest
 * familiar notation value without altering its exact stored timing. */
function NoteValueGlyph({beats,color,size=38}:{
  beats:number;color:string;size?:number;
}){
  const options=[.25,.5,.75,1,1.5,2,3,4];
  const closest=options.reduce((best,candidate)=>
    Math.abs(candidate-beats)<Math.abs(best-beats)?candidate:best,options[0]);
  const fill=closest<2;
  const stem=closest<4;
  const flags=closest<.5?2:closest<1?1:0;
  const dot=[.75,1.5,3].includes(closest);
  return <Svg width={size} height={size+7} viewBox="0 0 38 46"
    accessibilityLabel={NOTE_VALUES.find(v=>v.beats===closest)?.label||'Note'}>
    <Ellipse cx={13} cy={34} rx={8} ry={5} origin="13,34"
      rotation={-20} fill={fill?color:'none'} stroke={color} strokeWidth={1.9}/>
    {stem?<Line x1={20} y1={33} x2={20} y2={8}
      stroke={color} strokeWidth={2}/>:null}
    {flags>=1?<Path d="M20 9 C35 12 32 24 25 27 C30 17 20 18 20 16"
      stroke={color} fill="none" strokeWidth={1.8}/>:null}
    {flags===2?<Path d="M20 15 C35 18 32 30 25 33"
      stroke={color} fill="none" strokeWidth={1.8}/>:null}
    {dot?<Circle cx={30} cy={33} r={2.2} fill={color}/>:null}
  </Svg>;
}
/** A score remains a preview, while the event editor owns timing and duration. */
export function MusicScoreView({events,compact=false,instrument,
  bpm=100,clef='treble',selectedId,onSelectNote,onTempoPress,onClefPress,playheadBeats=null}:{
  events:MusicNotationEvent[];compact?:boolean;instrument?:Instrument;
  bpm?:number;clef?:'treble'|'bass';selectedId?:string;
  onSelectNote?:(id:string)=>void;onTempoPress?:()=>void;onClefPress?:()=>void;
  playheadBeats?:number|null;
}){
  const theme=useAppTheme();
  const visible=instrument?events.filter(e=>e.instrument===instrument):events;
  const maxBeat=visible.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),4);
  const unit=compact?49:56;
  const scoreWidth=Math.max(compact?540:660,Math.ceil(maxBeat/4)*4*unit+105);
  const piano=visible.filter(e=>e.instrument==='piano');
  const percussion=visible.filter(e=>e.instrument==='drum');
  const showPiano=instrument!=='drum',showDrum=instrument!=='piano';
  const height=showPiano&&showDrum?245:showPiano?151:145;
  const drumsY=(midi:number)=>midi===36?showPiano?226:123:
    midi===38||midi===39?showPiano?208:105:showPiano?184:81;
  const pitchY=(midi:number)=>notePosition(midi+(clef==='bass'?12:0));
  const staffRef=useRef<React.ElementRef<typeof ScrollView>>(null);
  useEffect(()=>{
    if(playheadBeats===null||playheadBeats===undefined)return;
    staffRef.current?.scrollTo({x:Math.max(0,75+playheadBeats*unit-150),animated:false});
  },[playheadBeats,unit]);
  const gaps=visible.slice().sort((a,b)=>a.startBeats-b.startBeats)
    .reduce<{from:number;to:number}[]>((out,event,index,list)=>{
      if(index===0){
        if(event.startBeats>=.125)out.push({from:0,to:event.startBeats});
      }else{
        const previous=Math.max(...list.slice(0,index).map(note=>note.startBeats+
          note.lengthBeats));
        if(event.startBeats-previous>=.125)
          out.push({from:previous,to:event.startBeats});
      }
      return out;
    },[]);
  return <View style={{position:'relative',borderWidth:1,
    borderColor:theme.border,borderRadius:14,backgroundColor:theme.surface,
    overflow:'hidden'}}>
    <ScrollView ref={staffRef} horizontal showsHorizontalScrollIndicator={false}
      accessibilityLabel="Partition interactive, défilement horizontal"
      style={{height}}>
      <View style={{position:'relative',width:scoreWidth,height}}>
      <Svg width={scoreWidth} height={height} viewBox={'0 0 '+scoreWidth+' '+height}>
        {showPiano?[74,86,98,110,122].map(y=><Line key={'p'+y}
          x1={52} x2={scoreWidth-15}
          y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>):null}
        {showDrum?(showPiano?[184,196,208,220,232]:[81,93,105,117,129])
          .map(y=><Line key={'d'+y} x1={52} x2={scoreWidth-15}
            y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>):null}
        {showPiano?<SvgText x={10} y={112} fontSize={40}
          fill={theme.foreground}>{clef==='bass'?'𝄢':'𝄞'}</SvgText>:null}
        {showDrum?<SvgText x={7} y={showPiano?205:105} fontSize={11}
          fill={theme.muted}>DR</SvgText>:null}
        {!visible.length?<SvgText x={65} y={showPiano?62:66}
          fontSize={11} fill={theme.muted}>
          {showPiano?'Joue une touche pour ajouter des notes':'Joue un pad pour commencer'}
        </SvgText>:null}
        {Array.from({length:Math.ceil(maxBeat/4)+1},(_,i)=>i*4).map(beat=>
          <Line key={'bar'+beat} x1={72+beat*unit} x2={72+beat*unit}
            y1={showPiano?74:81} y2={showPiano?122:129}
            stroke={theme.muted} strokeWidth={.8}/>)}
        {gaps.map((gap,i)=>{
          const x=75+(gap.from+Math.min((gap.to-gap.from)/2,.5))*unit;
          const y=showPiano?98:108;
          return <React.Fragment key={'rest'+i}>
            <Line x1={x-4} y1={y-13} x2={x+5} y2={y-7}
              stroke={theme.muted} strokeWidth={2}/>
            <Line x1={x+5} y1={y-7} x2={x-2} y2={y+2}
              stroke={theme.muted} strokeWidth={2}/>
            <Line x1={x-2} y1={y+2} x2={x+4} y2={y+9}
              stroke={theme.muted} strokeWidth={2}/>
          </React.Fragment>;
        })}
        {playheadBeats!==null&&playheadBeats!==undefined?
          <Line x1={75+playheadBeats*unit} x2={75+playheadBeats*unit}
            y1={showPiano?65:75} y2={showDrum?showPiano?235:132:126}
            stroke={PINK} strokeWidth={1.5} opacity={.6}/>:null}
        {piano.map(event=>{
          const x=75+event.startBeats*unit,y=pitchY(event.midi);
          const selected=selectedId===event.id;
          const sounding=playheadBeats!==null&&playheadBeats!==undefined&&
            !event.draft&&playheadBeats>=event.startBeats&&
            playheadBeats<event.startBeats+event.lengthBeats;
          const color=event.draft?theme.muted:PINK;
          return <React.Fragment key={event.id}>
            {y>126?<Line x1={x-12} x2={x+12} y1={134} y2={134}
              stroke={theme.foreground} strokeWidth={1}/>:null}
            {selected?<Ellipse cx={x} cy={y} rx={13} ry={10}
              fill="none" stroke={PINK} strokeWidth={1.3}/>:null}
            {BLACKS.has(event.midi%12)?<SvgText x={x-18} y={y+5}
              fontSize={15} fill={color}>♯</SvgText>:null}
            <Ellipse cx={x} cy={y} rx={sounding?11:7.5} ry={sounding?7:5.2} rotation={-19}
              origin={x+','+y} fill={event.lengthBeats<2?color:'none'}
              stroke={color} strokeWidth={1.6}/>
            {event.lengthBeats<3.5?<Line x1={x+7} x2={x+7} y1={y} y2={y-30}
              stroke={color} strokeWidth={1.6}/>:null}
            {event.lengthBeats<1?<Path
              d={`M ${x+7} ${y-30} Q ${x+21} ${y-25} ${x+14} ${y-15}`}
              stroke={color} fill="none" strokeWidth={1.8}/>:null}
            {event.lengthBeats<.45?<Path
              d={`M ${x+7} ${y-24} Q ${x+21} ${y-19} ${x+14} ${y-9}`}
              stroke={color} fill="none" strokeWidth={1.8}/>:null}
            {[.75,1.5,3].some(beats=>Math.abs(event.lengthBeats-beats)<.01)?
              <Circle cx={x+16} cy={y} r={2} fill={color}/>:null}
          </React.Fragment>;
        })}
        {percussion.map(event=>{
          const x=75+event.startBeats*unit,y=drumsY(event.midi);
          const sounding=playheadBeats!==null&&playheadBeats!==undefined&&
            !event.draft&&playheadBeats>=event.startBeats&&
            playheadBeats<event.startBeats+event.lengthBeats;
          const color=event.draft?theme.muted:PINK;
          return <React.Fragment key={event.id}>
            <Line x1={x-(sounding?9:6)} y1={y-(sounding?9:6)} x2={x+(sounding?9:6)} y2={y+(sounding?9:6)}
              stroke={color} strokeWidth={2}/>
            <Line x1={x-(sounding?9:6)} y1={y+(sounding?9:6)} x2={x+(sounding?9:6)} y2={y-(sounding?9:6)}
              stroke={color} strokeWidth={2}/>
            <Line x1={x+6} y1={y} x2={x+6} y2={y-27}
              stroke={color} strokeWidth={1.5}/>
          </React.Fragment>;
        })}
      </Svg>
      {showPiano?<Pressable onPress={onClefPress} disabled={!onClefPress}
        accessibilityRole="button" accessibilityLabel={'Changer la clef '+
          (clef==='treble'?'de sol':'de fa')}
        style={{position:'absolute',top:72,left:5,width:44,height:57}}/>:null}
      {visible.map(event=>{
        const x=75+event.startBeats*unit;
        const y=event.instrument==='piano'?pitchY(event.midi):drumsY(event.midi);
        return <Pressable key={'tap'+event.id}
          onPress={()=>onSelectNote?.(event.id)}
          disabled={!onSelectNote}
          accessibilityRole="button"
          accessibilityLabel={'Modifier '+musicNoteName(event.midi)+
            ', temps '+beatLabel(event.startBeats)}
          style={{position:'absolute',top:y-19,left:x-16,
            width:34,height:39,borderRadius:18}}/>;
      })}
      </View>
    </ScrollView>
    <Pressable onPress={onTempoPress} disabled={!onTempoPress}
      accessibilityRole="button" accessibilityLabel={'Modifier le tempo '+bpm+' BPM'}
      style={{position:'absolute',top:3,right:9,minHeight:39,
        paddingHorizontal:10,justifyContent:'center',alignItems:'flex-end',
        backgroundColor:theme.surface,borderRadius:8,zIndex:4}}>
      <Text style={{fontSize:17,fontWeight:'600',
        color:theme.foreground}}>♩ = {bpm}</Text>
    </Pressable>
  </View>;
}
/** WebAudio previews do not alter the saved MIDI event or the original audio. */
/** Each pressed key has its own polyphonic gain envelope and sample source. */
const voiceGains=new WeakMap<AudioScheduledSourceNode,{gain:GainNode;ctx:AudioContext}>();
function releaseSound(source:AudioScheduledSourceNode){
  const voice=voiceGains.get(source);
  if(!voice){try{source.stop();}catch{}return;}
  const now=voice.ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setTargetAtTime(.0001,now,.025);
  try{source.stop(now+.12);}catch{}
  voiceGains.delete(source);
}
function playSound(ctx:AudioContext,pitch:number,drum:boolean,level:number,
  tone:string,sample:AudioBuffer|null,seconds?:number,
  startDelay=0,sampleRootMidi=60,sampleRootHz?:number):AudioScheduledSourceNode{
  const now=ctx.currentTime+Math.max(0,startDelay);
  if(!drum&&tone==='Échantillon'&&!sample)
    throw Error('L’échantillon ne s’est pas chargé. Réimporte-le ou attends la fin du chargement.');
  const duration=Math.max(.09,Math.min(16,seconds??
    (drum?.24:tone==='Orgue'||tone==='Cordes'?.78:.62)));
  const end=now+duration;
  const gain=ctx.createGain();
  const attack=Math.min(.012,duration*.2);
  const release=Math.min(.085,duration*.25);
  const sourceVolume=Math.max(.001,level*.25);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(sourceVolume,now+attack);
  gain.gain.setValueAtTime(sourceVolume,Math.max(now+attack,end-release));
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  gain.connect(ctx.destination);
  if(!drum&&tone==='Échantillon'&&sample){
    const source=ctx.createBufferSource();
    source.buffer=sample;
    const region=sampleRegion(sample.getChannelData(0),sample.sampleRate);
    if(region.peak<.0001)throw Error('Ce fichier audio est silencieux.');
    const exactRoot=sampleRootHz&&Number.isFinite(sampleRootHz)&&sampleRootHz>0?
      sampleRootHz:midiFrequency(sampleRootMidi);
    source.playbackRate.setValueAtTime(samplePlaybackRate(pitch,exactRoot),now);
    // A sample is a reference instrument; loop its stable middle section
    // while a note is held, rather than exhausting the recorded note once.
    if(region.loopEnd-region.loopStart>.07){
      source.loop=true;
      source.loopStart=region.loopStart;
      source.loopEnd=region.loopEnd;
    }
    // Modest automatic level correction for very quiet microphone takes.
    const boost=Math.min(2.5,.62/Math.max(.05,region.peak));
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.linearRampToValueAtTime(sourceVolume*boost,now+attack);
    gain.gain.setValueAtTime(sourceVolume*boost,Math.max(now+attack,end-release));
    gain.gain.exponentialRampToValueAtTime(.0001,end);
    source.connect(gain);
    source.start(now,Math.min(region.offset,Math.max(0,sample.duration-.01)));
    source.stop(end);
    voiceGains.set(source,{gain,ctx});
    return source;
  }
  if(drum&&pitch!==36){
    const length=Math.round(ctx.sampleRate*.24);
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const noise=ctx.createBufferSource();noise.buffer=buffer;
    const filter=ctx.createBiquadFilter();
    filter.type=(pitch===42||pitch===46||pitch===49)?'highpass':'bandpass';
    filter.frequency.value=(pitch===42||pitch===46||pitch===49)?5600:1200;
    noise.connect(filter);filter.connect(gain);
    noise.start(now);noise.stop(Math.min(end,now+.23));
    voiceGains.set(noise,{gain,ctx});
    return noise;
  }
  const osc=ctx.createOscillator();
  osc.type=drum?'sine':tone==='Orgue'?'sine':
    tone==='Synthé'||tone==='Cordes'?'sawtooth':'triangle';
  const hz=drum?125:midiFrequency(pitch);
  osc.frequency.setValueAtTime(hz,now);
  if(drum)osc.frequency.exponentialRampToValueAtTime(46,now+.13);
  osc.connect(gain);osc.start(now);osc.stop(end);
  voiceGains.set(osc,{gain,ctx});
  return osc;
}

export function MusicSketchStudio({initialFile,onSave,onDirtyChange,active=true}:Props){
  const theme=useAppTheme();
  const {width,height}=useWindowDimensions();
  const compact=width<650;
  const [title,setTitle]=useState(initialFile?.title||'');
  const [events,setEvents]=useState<MusicNotationEvent[]>(initialFile?.musicEvents||[]);
  const [bpm,setBpm]=useState(initialFile?.tempoBpm||100);
  const [part,setPart]=useState<Instrument>('piano');
  const [clef,setClef]=useState<'treble'|'bass'>(initialFile?.scoreClef||'treble');
  const [editor,setEditor]=useState<'note'|'chord'|'tempo'|'clef'|null>(null);
  const [tempoDraft,setTempoDraft]=useState(String(initialFile?.tempoBpm||100));
  const [toneOpen,setToneOpen]=useState(false);
  const [previewPlaying,setPreviewPlaying]=useState(false);
  const [previewBeat,setPreviewBeat]=useState<number|null>(null);
  const previewTick=useRef<ReturnType<typeof setInterval>|null>(null);
  const previewTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
  const previewSources=useRef<AudioScheduledSourceNode[]>([]);
  const [duration,setDuration]=useState<number>(.5);
  const [cursor,setCursor]=useState(()=>(initialFile?.musicEvents||[])
    .reduce((v,e)=>Math.max(v,e.startBeats+e.lengthBeats),0));
  const [selectedId,setSelectedId]=useState('');
  const [recording,setRecording]=useState(false);
  const startRef=useRef(0),beatOriginRef=useRef(0);
  const liveHeldRef=useRef<Map<string,{id:string;pressedAt:number;startBeats:number}>>(new Map());
  const liveSourcesRef=useRef<Map<string,AudioScheduledSourceNode>>(new Map());
  const releaseRef=useRef<(instrument:Instrument,midi:number)=>void>(()=>{});
  const clock=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const chordRef=useRef<{at:number;beat:number}|null>(null);
  const heldKeysRef=useRef<Set<string>>(new Set());
  const triggerRef=useRef<(instrument:Instrument,midi:number)=>void>(()=>{});
  const [octaves,setOctaves]=useState<12|18|24|30>(12);
  const [baseMidi,setBaseMidi]=useState(60);
  const [tone,setTone]=useState<string>(initialFile?.instrumentTone||'Piano doux');
  const [sampleName,setSampleName]=useState(initialFile?.instrumentSampleName||'');
  const [sampleId,setSampleId]=useState(initialFile?.instrumentSampleLocalId||'');
  const [sampleRootMidi,setSampleRootMidi]=useState(
    initialFile?.instrumentSampleRootMidi??60);
  const [sampleRootHz,setSampleRootHz]=useState<number|null>(
    initialFile?.instrumentSampleRootHz??null);
  const [sampleConfidence,setSampleConfidence]=useState<number|null>(null);
  const [sampleLoading,setSampleLoading]=useState(false);
  const [sampleReady,setSampleReady]=useState(false);
  const [sampleError,setSampleError]=useState('');
  const sampleRef=useRef<AudioBuffer|null>(null);
  const [volume,setVolume]=useState({piano:.8,drum:.7});
  const [last,setLast]=useState('');
  const [message,setMessage]=useState('');
  const audioRef=useRef<AudioContext|null>(null);
  const midiRef=useRef<MidiPort|null>(null);
  const [midiPorts,setMidiPorts]=useState<MidiPort[]>([]);
  const [midiPortId,setMidiPortId]=useState('');
  const [midiOpen,setMidiOpen]=useState(false);
  const pristine=JSON.stringify(initialFile?.musicEvents||[]);
  const dirty=title!==(initialFile?.title||'')||
    JSON.stringify(events)!==pristine||bpm!==(initialFile?.tempoBpm||100)||
    tone!==(initialFile?.instrumentTone||'Piano doux')||
    sampleId!==(initialFile?.instrumentSampleLocalId||'')||
    sampleRootMidi!==(initialFile?.instrumentSampleRootMidi??60)||
    (sampleRootHz??null)!==(initialFile?.instrumentSampleRootHz??null)||
    clef!==(initialFile?.scoreClef||'treble');
  useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);
  useEffect(()=>()=>{void audioRef.current?.close();},[]);
  useEffect(()=>{
    const id=initialFile?.instrumentSampleLocalId;
    if(!id||Platform.OS!=='web')return;
    let live=true;
    setSampleReady(false);setSampleLoading(true);
    void getDraftAudio(id).then(async blob=>{
      if(!blob)throw Error('Échantillon introuvable sur cet appareil.');
      if(!audioRef.current)audioRef.current=new AudioContext();
      const decoded=await audioRef.current.decodeAudioData(await blob.arrayBuffer());
      if(live){sampleRef.current=decoded;setSampleReady(true);setSampleError('');}
    }).catch(e=>{
      if(live)setSampleError(e instanceof Error?e.message:'Échantillon indisponible.');
    }).finally(()=>{if(live)setSampleLoading(false);});
    return()=>{live=false;};
  },[initialFile?.instrumentSampleLocalId]);
  const selected=events.find(e=>e.id===selectedId&&e.instrument===part);
  const chordNotes=selected?events.filter(e=>e.instrument===part&&
    Math.abs(e.startBeats-selected.startBeats)<.001)
    .slice().sort((a,b)=>a.midi-b.midi):[];
  const drafts=events.filter(e=>e.draft);
  const confirmed=events.filter(e=>!e.draft);
  const nextBeat=()=>events.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),cursor);
  const patchEvent=(id:string,changes:Partial<MusicNotationEvent>)=>
    setEvents(old=>old.map(e=>e.id===id?{...e,...changes}:e));
  const trigger=(instrument:Instrument,midi:number)=>{
    if(instrument==='piano'&&liveHeldRef.current.has(instrument+':'+midi))return;
    const playedAt=clock();
    setMessage('');setLast(instrument==='piano'?musicNoteName(midi):
      DRUM_PADS.find(p=>p.midi===midi)?.label||'Percussion');
    if(Platform.OS==='web'){
      try{
        if(!audioRef.current)audioRef.current=new AudioContext();
        const ctx=audioRef.current;
        if(ctx.state==='suspended')void ctx.resume();
        const source=playSound(ctx,midi,instrument==='drum',volume[instrument],tone,
          sampleRef.current,instrument==='piano'?12:undefined,
          0,sampleRootMidi,sampleRootHz??undefined);
        if(instrument==='piano')
          liveSourcesRef.current.set(instrument+':'+midi,source);
      }catch{setMessage('Aperçu sonore indisponible sur cet appareil.');}
      try{
        if(midiRef.current){
          const channel=instrument==='piano'?0:9;
          midiRef.current.send([0x90|channel,midi,95]);
          if(instrument==='drum')
            setTimeout(()=>{try{midiRef.current?.send([0x80|channel,midi,0]);}catch{}},
              Math.round(duration*60000/bpm));
        }
      }catch{setMessage('Sortie MIDI déconnectée.');}
    }
    const chord=!recording&&!!chordRef.current&&
      playedAt-chordRef.current.at<130;
    const beat=recording?
      liveNotePosition(startRef.current,playedAt,bpm,beatOriginRef.current):
      chord?chordRef.current!.beat:cursor;
    const startBeats=recording?beat:Math.max(0,Math.round(beat*4)/4);
    const event:MusicNotationEvent={id:newId(),instrument,midi,
      startBeats,lengthBeats:instrument==='piano'?.125:
        instrument==='drum'?.25:duration,velocity:95,
      draft:!recording};
    setEvents(old=>[...old,event]);setSelectedId(event.id);
    if(instrument==='piano'){
      liveHeldRef.current.set(instrument+':'+midi,
        {id:event.id,pressedAt:playedAt,startBeats});
    }
    if(!recording){
      chordRef.current={at:playedAt,beat:startBeats};
      if(!chord)setCursor(startBeats+event.lengthBeats);
    }
  };
  const releaseNote=(instrument:Instrument,midi:number)=>{
    const key=instrument+':'+midi;
    const held=liveHeldRef.current.get(key);
    if(!held)return;
    liveHeldRef.current.delete(key);
    const lengthBeats=liveNoteLength(held.pressedAt,clock(),bpm);
    setEvents(old=>old.map(event=>event.id===held.id?
      {...event,lengthBeats}:event));
    setCursor(old=>Math.max(old,held.startBeats+lengthBeats));
    const source=liveSourcesRef.current.get(key);
    if(source){releaseSound(source);liveSourcesRef.current.delete(key);}
    if(Platform.OS==='web'&&midiRef.current){
      try{midiRef.current.send([instrument==='piano'?0x80:0x89,midi,0]);}
      catch{setMessage('Sortie MIDI déconnectée.');}
    }
  };
  triggerRef.current=trigger;
  releaseRef.current=releaseNote;
  useEffect(()=>{
    if(!active||Platform.OS!=='web'||typeof window==='undefined')return;
    const pianoKeys:Record<string,number>={
      s:0,e:1,d:2,r:3,f:4,g:5,t:6,h:7,y:8,j:9,u:10,k:11,l:12,
    };
    // Six keys in a row, deliberately active ONLY in Batterie mode.
    // A kick · S snare · D closed HH · F open HH · G clap · H crash.
    const drumKeys:Record<string,number>={
      a:36,s:38,d:42,f:46,g:39,h:49,
    };
    const down=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target&&(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||
        target.isContentEditable))return;
      if(event.repeat||event.ctrlKey||event.altKey||event.metaKey)return;
      const key=event.key.toLowerCase();
      const note=part==='piano'?pianoKeys[key]:drumKeys[key];
      if(note===undefined||heldKeysRef.current.has(key))return;
      event.preventDefault();
      heldKeysRef.current.add(key);
      triggerRef.current(part,part==='piano'?baseMidi+note:note);
    };
    const up=(event:KeyboardEvent)=>{
      const key=event.key.toLowerCase();
      if(!heldKeysRef.current.delete(key))return;
      if(part==='piano'&&pianoKeys[key]!==undefined)
        releaseRef.current('piano',baseMidi+pianoKeys[key]);
    };
    const cancel=()=>{
      heldKeysRef.current.forEach(key=>{
        if(part==='piano'&&pianoKeys[key]!==undefined)
          releaseRef.current('piano',baseMidi+pianoKeys[key]);
      });
      heldKeysRef.current.clear();
    };
    window.addEventListener('keydown',down);
    window.addEventListener('keyup',up);
    window.addEventListener('blur',cancel);
    return()=>{
      window.removeEventListener('keydown',down);
      window.removeEventListener('keyup',up);
      window.removeEventListener('blur',cancel);
      cancel();
    };
  },[active,part,baseMidi]);
  const stopPreview=()=>{
    previewSources.current.forEach(source=>{try{source.stop();}catch{}});
    previewSources.current=[];
    if(previewTimeout.current){clearTimeout(previewTimeout.current);previewTimeout.current=null;}
    if(previewTick.current){clearInterval(previewTick.current);previewTick.current=null;}
    setPreviewBeat(null);setPreviewPlaying(false);
  };
  const playComposition=()=>{
    if(previewPlaying){stopPreview();return;}
    if(!events.length){setMessage('Joue quelques notes pour écouter ta composition.');return;}
    if(Platform.OS!=='web'){setMessage('Préécoute disponible sur navigateur web.');return;}
    try{
      if(!audioRef.current)audioRef.current=new AudioContext();
      const ctx=audioRef.current;
      if(ctx.state==='suspended')void ctx.resume();
      // Preview all notes, including grey drafts, so a musician can hear
      // the result before explicitly validating/exporting them.
      const notes=events;
      const first=Math.min(...notes.map(event=>event.startBeats));
      const last=Math.max(...notes.map(event=>event.startBeats+event.lengthBeats));
      const startedAt=ctx.currentTime;
      previewSources.current=notes.map(event=>playSound(
        ctx,event.midi,event.instrument==='drum',volume[event.instrument],
        tone,sampleRef.current,event.lengthBeats*60/bpm,
        (event.startBeats-first)*60/bpm,sampleRootMidi,sampleRootHz??undefined));
      setPreviewPlaying(true);setPreviewBeat(first);
      previewTick.current=setInterval(()=>{
        setPreviewBeat(Math.min(last,first+
          Math.max(0,ctx.currentTime-startedAt)*bpm/60));
      },65);
      previewTimeout.current=setTimeout(()=>{
        previewSources.current=[];
        if(previewTick.current)clearInterval(previewTick.current);
        previewTick.current=null;setPreviewBeat(null);
        setPreviewPlaying(false);previewTimeout.current=null;
      },Math.ceil((last-first)*60000/bpm)+200);
      setMessage('');
    }catch{setMessage('Lecture de la composition impossible dans ce navigateur.');}
  };
  const toggleRecording=()=>{
    if(recording){
      for(const key of Array.from(liveHeldRef.current.keys())){
        const [instrument,midi]=key.split(':');
        releaseNote(instrument as Instrument,Number(midi));
      }
      setRecording(false);
      setMessage('Prise enregistrée : les durées et silences reflètent le jeu.');
      return;
    }
    if(previewPlaying)stopPreview();
    beatOriginRef.current=nextBeat();
    startRef.current=clock();
    chordRef.current=null;
    setRecording(true);setMessage('');
  };
  const exportMidi=()=>{
    if(!events.length){setMessage('Ajoute des notes avant l’export MIDI.');return;}
    try{downloadMusicMidi(events.map(e=>({...e,draft:false})),
      bpm,title||'idee-musicale');
      setMessage('Fichier .mid exporté (piano canal 1, batterie canal 10).');}
    catch(e){setMessage(e instanceof Error?e.message:'Export MIDI impossible.');}
  };
  const audition=(event:MusicNotationEvent)=>{
    if(Platform.OS!=='web')return;
    try{
      if(!audioRef.current)audioRef.current=new AudioContext();
      const ctx=audioRef.current;
      if(ctx.state==='suspended')void ctx.resume();
      playSound(ctx,event.midi,event.instrument==='drum',volume[event.instrument],
        tone,sampleRef.current,event.lengthBeats*60/bpm,0,sampleRootMidi,
        sampleRootHz??undefined);
    }catch{setMessage('Aperçu sonore indisponible sur cet appareil.');}
  };
  const testSample=(midi:number)=>{
    if(Platform.OS!=='web'||!sampleRef.current){
      setSampleError('Le son n’est pas encore prêt. Réimporte-le ou attends son chargement.');
      return;
    }
    try{
      if(!audioRef.current)audioRef.current=new AudioContext();
      const ctx=audioRef.current;
      if(ctx.state==='suspended')void ctx.resume();
      playSound(ctx,midi,false,volume.piano,'Échantillon',
        sampleRef.current,1.25,0,sampleRootMidi,sampleRootHz??undefined);
      setSampleError('');
    }catch(e){
      setSampleError(e instanceof Error?e.message:'Impossible d’écouter le son.');
    }
  };
  const importTone=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setMessage('Import de son disponible sur navigateur web.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';picker.accept='audio/*,.wav,.mp3,.ogg,.m4a';
    picker.onchange=()=>{
      const file=picker.files?.[0];if(!file)return;
      setSampleLoading(true);setSampleError('');
      void(async()=>{
        if(file.size>12*1024*1024)throw Error('Fichier trop grand (12 Mo maximum).');
        if(!audioRef.current)audioRef.current=new AudioContext();
        const buffer=await audioRef.current.decodeAudioData(await file.arrayBuffer());
        if(buffer.duration<.12)throw Error('La note doit durer au moins 0,12 seconde.');
        const region=sampleRegion(buffer.getChannelData(0),buffer.sampleRate);
        if(region.peak<.002)throw Error('Le fichier ne contient aucun son audible.');
        // Stereo microphones can have very different levels on each side.
        const possible=Array.from({length:buffer.numberOfChannels},(_,index)=>
          analyzeSamplePitch(buffer.getChannelData(index),buffer.sampleRate))
          .filter((value):value is NonNullable<typeof value>=>!!value)
          .sort((left,right)=>right.confidence-left.confidence);
        const detected=possible[0]||null;
        const id=await saveDraftAudio(file);
        sampleRef.current=buffer;
        setSampleName(file.name);setSampleId(id);
        setSampleReady(true);
        setSampleRootMidi(detected?.midi??60);
        setSampleRootHz(detected?.frequencyHz??null);
        setSampleConfidence(detected?.confidence??null);
        setTone('Échantillon');setToneOpen(true);
        setMessage(detected?
          'Note reconnue : '+musicNoteName(detected.midi)+
          '. Teste le son sur le clavier, puis ajuste si nécessaire.':
          'Note non reconnue avec fiabilité. Choisis la note d’origine avant de jouer.');
        if(!detected)setSampleError(
          'La détection fonctionne surtout avec une note isolée et tenue, sans accompagnement.');
      })().catch(e=>setSampleError(
        e instanceof Error?e.message:'Ce fichier audio ne peut pas être importé.'
      )).finally(()=>setSampleLoading(false));
    };
    picker.click();
  };
  const connectMidi=async()=>{
    if(Platform.OS!=='web'||typeof navigator==='undefined')return;
    const request=(navigator as Navigator&{requestMIDIAccess?:()=>Promise<MidiAccess>})
      .requestMIDIAccess;
    if(!request){setMessage('MIDI Out non disponible dans ce navigateur.');return;}
    try{
      const access=await request.call(navigator);
      const available=Array.from(access.outputs.values());
      setMidiPorts(available);setMidiOpen(true);
      if(!available.length)setMessage('Aucune sortie MIDI détectée.');
    }catch{setMessage('Accès MIDI refusé ou indisponible.');}
  };
  const exportPdf=()=>{
    try{
      downloadMusicScorePdf(events,bpm,title||'idee-musicale',clef);
      setMessage('Partition PDF exportée.');
    }catch(e){setMessage(e instanceof Error?e.message:'Export PDF impossible.');}
  };
  const insertRestBefore=(event:MusicNotationEvent,beats:number)=>{
    setEvents(old=>old.map(e=>
      e.instrument===event.instrument&&e.startBeats>=event.startBeats?
        {...e,startBeats:Math.round((e.startBeats+beats)*4)/4}:e));
    setCursor(v=>v+beats);
  };
  const openNote=(id:string)=>{
    setSelectedId(id);
    const event=events.find(note=>note.id===id);
    const simultaneous=events.filter(note=>event&&note.instrument===event.instrument&&
      Math.abs(note.startBeats-event.startBeats)<.001);
    setEditor(simultaneous.length>1?'chord':'note');
  };
  const openTempo=()=>{setTempoDraft(String(bpm));setEditor('tempo');};
  const confirmTempo=()=>{
    const value=Number(tempoDraft.replace(',','.'));
    if(!Number.isFinite(value)||value<40||value>240){
      setMessage('Choisis un tempo entre 40 et 240 BPM.');return;
    }
    setBpm(Math.round(value));setEditor(null);setMessage('');
  };
  useEffect(()=>()=>{previewSources.current.forEach(source=>{
    try{source.stop();}catch{}
  });
    if(previewTimeout.current)clearTimeout(previewTimeout.current);
    if(previewTick.current)clearInterval(previewTick.current);
  },[]);
  const control=(label:string,fn:()=>void,disabled=false,active=false)=>
    <Pressable onPress={fn} disabled={disabled} accessibilityRole="button"
      accessibilityLabel={label}
      style={{minHeight:39,minWidth:39,paddingHorizontal:10,alignItems:'center',
        justifyContent:'center',borderWidth:1,borderColor:active?PINK:theme.border,
        backgroundColor:active?(theme.dark?'#452935':'#FAE9EF'):'transparent',
        borderRadius:10,opacity:disabled?.45:1}}>
      <Text style={{color:active?PINK:theme.foreground,fontSize:12,
        fontWeight:active?'700':'500'}}>{label}</Text>
    </Pressable>;
  const applyDuration=(length:number)=>{
    setDuration(length);
    if(selected){
      const previousEnd=selected.startBeats+selected.lengthBeats;
      setEvents(old=>resizeMusicNote(old,selected.id,length));
      setCursor(old=>old>=previousEnd-.00001?
        Math.max(0,Math.round((old+length-selected.lengthBeats)*1000)/1000):old);
    }
  };
  const blackOffsets=Array.from({length:octaves},(_,i)=>i)
    .filter(i=>BLACKS.has(i%12));
  const whiteOffsets=Array.from({length:octaves},(_,i)=>i)
    .filter(i=>!BLACKS.has(i%12));
  const areaWidth=Math.min(compact?Math.max(260,width-68):680,680);
  const whiteWidth=Math.max(compact?17:27,Math.floor(areaWidth/whiteOffsets.length));
  const blackWidth=Math.max(11,Math.round(whiteWidth*.6));
  const keyboardHeight=compact?119:155;
  const choosePart=(next:Instrument)=>{
    setPart(next);setSelectedId('');setEditor(null);
  };
  const instrumentEvents=events.filter(e=>e.instrument===part)
    .slice().sort((a,b)=>a.startBeats-b.startBeats);
  return <View style={{gap:compact?13:19}}>
    <View style={{gap:6}}>
      <TextInput value={title} onChangeText={setTitle}
        placeholder="Nom de la composition" placeholderTextColor={theme.muted}
        accessibilityLabel="Titre de la partition"
        style={{fontSize:compact?17:22,fontWeight:'600',color:theme.foreground,
          paddingVertical:compact?5:9}}/>
      <View style={{flexDirection:'row',gap:8,alignItems:'center',
        justifyContent:'space-between',flexWrap:'wrap'}}>
        <Pressable onPress={()=>setMidiOpen(v=>!v)} accessibilityRole="button"
          accessibilityState={{expanded:midiOpen}}
          style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:43,
            borderWidth:1,borderRadius:12,borderColor:midiPortId?PINK:theme.border,
            paddingHorizontal:12,backgroundColor:theme.surface}}>
          <Ionicons name="hardware-chip-outline" color={PINK} size={19}/>
          <View>
            <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
              MIDI OUT
            </Text>
            <Text numberOfLines={1} style={{fontSize:10,color:theme.muted,
              maxWidth:170}}>
              {midiPortId?midiPorts.find(port=>port.id===midiPortId)?.name||'Connecté':
                'Connecter un instrument'}
            </Text>
          </View>
          <Ionicons name={midiOpen?'chevron-up':'chevron-down'}
            size={15} color={theme.muted}/>
        </Pressable>
        <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
          <Pressable onPress={exportMidi} disabled={!events.length||recording}
            accessibilityRole="button" accessibilityLabel="Exporter en MIDI"
            style={{minHeight:43,flexDirection:'row',alignItems:'center',gap:4,
              opacity:events.length&&!recording?1:.4}}>
            <Ionicons name="download-outline" color={PINK} size={17}/>
            <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>MIDI</Text>
          </Pressable>
          <Pressable onPress={exportPdf} disabled={!events.length||recording}
            accessibilityRole="button" accessibilityLabel="Exporter en PDF"
            style={{minHeight:43,flexDirection:'row',alignItems:'center',gap:5,
              opacity:events.length&&!recording?1:.4}}>
            <Ionicons name="document-outline" color={PINK} size={17}/>
            <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>PDF</Text>
          </Pressable>
        </View>
      </View>
      {midiOpen?<View style={{gap:7,padding:12,borderRadius:13,
        backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
          Envoie les notes jouées vers un clavier ou instrument MIDI connecté.
        </Text>
        {control('Rechercher les sorties MIDI',()=>{void connectMidi();})}
        {midiPorts.map(port=><Pressable key={port.id}
          onPress={()=>{setMidiPortId(port.id);midiRef.current=port;}}
          accessibilityRole="button" style={{minHeight:42,
            flexDirection:'row',alignItems:'center',gap:8}}>
          <Ionicons name={midiPortId===port.id?'radio-button-on':'radio-button-off'}
            color={PINK} size={18}/>
          <Text style={{color:theme.foreground,fontSize:13}}>
            {port.name||'Sortie MIDI'}
          </Text>
        </Pressable>)}
        {midiPortId?control('Déconnecter',()=>{
          midiRef.current=null;setMidiPortId('');
        }):null}
      </View>:null}
    </View>
    <View style={{flexDirection:'row',gap:8}}>
      {([{id:'piano',label:'Piano',icon:'musical-notes-outline'},
        {id:'drum',label:'Batterie',icon:'grid-outline'}] as const).map(item=>
        <Pressable key={item.id} onPress={()=>choosePart(item.id)}
          accessibilityRole="tab" accessibilityState={{selected:part===item.id}}
          style={{flex:1,minHeight:43,flexDirection:'row',gap:7,
            alignItems:'center',justifyContent:'center',borderRadius:12,
            backgroundColor:part===item.id?PINK:theme.surface,
            borderWidth:part===item.id?0:1,borderColor:theme.border}}>
          <Ionicons name={item.icon} size={18}
            color={part===item.id?'#fff':theme.muted}/>
          <Text style={{fontSize:13,fontWeight:'600',
            color:part===item.id?'#fff':theme.foreground}}>{item.label}</Text>
        </Pressable>)}
    </View>
    <MusicScoreView events={events} compact={compact} instrument={part}
      bpm={bpm} clef={clef} selectedId={selectedId}
      playheadBeats={previewBeat}
      onSelectNote={recording?undefined:openNote}
      onTempoPress={recording?undefined:openTempo}
      onClefPress={recording?undefined:()=>setEditor('clef')}/>
    {editor==='tempo'?<View style={{gap:10,padding:13,borderRadius:14,
      borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'space-between'}}>
        <Text style={{fontSize:22,color:theme.foreground}}>
          Tempo
        </Text>
        <Pressable onPress={()=>setEditor(null)} accessibilityRole="button"
          accessibilityLabel="Fermer le réglage du tempo"
          style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
        <TextInput value={tempoDraft} onChangeText={setTempoDraft}
          keyboardType="number-pad" accessibilityLabel="Tempo en BPM"
          style={{minWidth:85,borderWidth:1,borderColor:theme.border,
            borderRadius:10,paddingHorizontal:13,paddingVertical:10,
            color:theme.foreground,fontSize:17}}/>
        <Text style={{fontSize:13,color:theme.muted}}>BPM</Text>
        {control('Appliquer',confirmTempo)}
      </View>
    </View>:null}
    {editor==='clef'?<View style={{gap:10,padding:13,borderRadius:14,
      borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{fontSize:22,color:theme.foreground}}>
          Choisir la clef
        </Text>
        <Pressable onPress={()=>setEditor(null)} accessibilityRole="button"
          accessibilityLabel="Fermer le choix de clef"
          style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',gap:9}}>
        {control('𝄞 Clé de sol',()=>{setClef('treble');setEditor(null);},
          false,clef==='treble')}
        {control('𝄢 Clé de fa',()=>{setClef('bass');setEditor(null);},
          false,clef==='bass')}
      </View>
    </View>:null}
    {/* A vertical notation palette floats over the score instead of pushing
         the keyboard and musical staff down the screen. */}
    <Modal transparent visible={!!selected&&(editor==='note'||editor==='chord')}
      animationType="fade" onRequestClose={()=>setEditor(null)}>
      <View style={{flex:1,justifyContent:'center',alignItems:'flex-end'}}>
        <Pressable onPress={()=>setEditor(null)}
          accessibilityRole="button" accessibilityLabel="Fermer les figures de note"
          style={{position:'absolute',top:0,left:0,right:0,bottom:0,
            backgroundColor:'rgba(0,0,0,0.16)'}}/>
        <View style={{width:142,maxHeight:Math.max(250,height-70),
          borderRadius:16,borderWidth:1,borderColor:theme.border,
          backgroundColor:theme.surface,marginRight:12,
          shadowOpacity:.15,shadowRadius:15,elevation:9,overflow:'hidden'}}>
          <ScrollView keyboardShouldPersistTaps="handled"
            contentContainerStyle={{padding:8,gap:4,alignItems:'center'}}>
            <View style={{height:39,width:'100%',flexDirection:'row',
              alignItems:'center',justifyContent:'space-between'}}>
              <Text style={{fontSize:14,fontWeight:'600',color:theme.foreground}}>
                {selected?musicNoteName(selected.midi):''}
              </Text>
              <Pressable onPress={()=>setEditor(null)}
                accessibilityRole="button" accessibilityLabel="Fermer"
                style={{minWidth:40,minHeight:39,alignItems:'center',
                  justifyContent:'center'}}>
                <Ionicons name="close" size={19} color={theme.muted}/>
              </Pressable>
            </View>
            {editor==='chord'?chordNotes.map(note=>
              <Pressable key={note.id} onPress={()=>{
                setSelectedId(note.id);setEditor('note');
              }} accessibilityRole="button"
                accessibilityLabel={'Modifier '+musicNoteName(note.midi)}
                style={{width:'100%',height:44,borderRadius:10,borderWidth:1,
                  justifyContent:'center',alignItems:'center',borderColor:theme.border}}>
                <Text style={{fontWeight:'600',fontSize:13,color:theme.foreground}}>
                  {musicNoteName(note.midi)}
                </Text>
              </Pressable>):
            NOTE_VALUES.map(option=>{
              const current=!!selected&&Math.abs(selected.lengthBeats-option.beats)<.001;
              return <Pressable key={option.beats}
                onPress={()=>selected&&applyDuration(option.beats)}
                accessibilityRole="button" accessibilityLabel={option.label}
                accessibilityState={{selected:current}}
                style={{width:69,height:45,borderRadius:9,borderWidth:1,
                  borderColor:current?PINK:theme.border,
                  alignItems:'center',justifyContent:'center',
                  backgroundColor:current?(theme.dark?'#452935':'#FAE9EF'):
                    'transparent'}}>
                <NoteValueGlyph beats={option.beats}
                  color={current?PINK:theme.foreground} size={30}/>
              </Pressable>;
            })}
            {editor==='note'&&selected?<View style={{gap:8,alignItems:'center',
              width:'100%',paddingTop:6,
              borderTopWidth:1,borderColor:theme.border}}>
              <View style={{flexDirection:'row',justifyContent:'center',gap:7}}>
                <Pressable onPress={()=>patchEvent(selected.id,{
                  midi:Math.max(0,selected.midi-1)})}
                  accessibilityRole="button" accessibilityLabel="Note plus grave"
                  style={{width:43,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="remove" size={20} color={theme.foreground}/>
                </Pressable>
                <Pressable onPress={()=>patchEvent(selected.id,{
                  midi:Math.min(127,selected.midi+1)})}
                  accessibilityRole="button" accessibilityLabel="Note plus aiguë"
                  style={{width:43,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="add" size={20} color={theme.foreground}/>
                </Pressable>
              </View>
              <View style={{flexDirection:'row',gap:5}}>
                <Pressable onPress={()=>patchEvent(selected.id,{startBeats:
                  Math.max(0,Math.round((selected.startBeats-.25)*4)/4)})}
                  accessibilityRole="button" accessibilityLabel="Déplacer la note vers la gauche"
                  style={{width:43,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="arrow-back-outline" size={19} color={theme.foreground}/>
                </Pressable>
                <Pressable onPress={()=>patchEvent(selected.id,{startBeats:
                  Math.round((selected.startBeats+.25)*4)/4})}
                  accessibilityRole="button" accessibilityLabel="Déplacer la note vers la droite"
                  style={{width:43,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="arrow-forward-outline" size={19} color={theme.foreground}/>
                </Pressable>
              </View>
              <View style={{flexDirection:'row',gap:4}}>
                <Pressable onPress={()=>audition(selected)} accessibilityRole="button"
                  accessibilityLabel="Écouter la note"
                  style={{width:39,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="play-outline" size={21} color={PINK}/>
                </Pressable>
                {selected.draft?<Pressable onPress={()=>{
                  patchEvent(selected.id,{draft:false});setEditor(null);
                }} accessibilityRole="button" accessibilityLabel="Valider la note"
                  style={{width:39,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="checkmark-outline" size={21} color={PINK}/>
                </Pressable>:null}
                <Pressable onPress={()=>{
                  setEvents(old=>old.filter(event=>event.id!==selected.id));
                  setSelectedId('');setEditor(null);
                }} accessibilityRole="button" accessibilityLabel="Supprimer la note"
                  style={{width:39,height:42,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="trash-outline" size={20} color={theme.muted}/>
                </Pressable>
              </View>
            </View>:null}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <Pressable onPress={playComposition} disabled={!events.length||recording}
        accessibilityRole="button" accessibilityLabel={previewPlaying?
          'Arrêter l’écoute de la composition':'Écouter ma composition'}
        style={{minHeight:46,flexDirection:'row',gap:7,alignItems:'center',
          borderWidth:1,borderColor:theme.border,borderRadius:12,
          paddingHorizontal:13,opacity:events.length&&!recording?1:.45}}>
        <Ionicons name={previewPlaying?'stop':'play-outline'} color={PINK} size={20}/>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>
          {previewPlaying?'Arrêter l’écoute':'Écouter mes notes'}
        </Text>
      </Pressable>
      <Pressable onPress={toggleRecording} accessibilityRole="button"
        accessibilityLabel={recording?'Arrêter l’enregistrement en direct':
          'Enregistrer les notes en direct'}
        style={{minHeight:46,flexDirection:'row',gap:7,alignItems:'center',
          backgroundColor:recording?'#A83246':PINK,
          paddingHorizontal:13,borderRadius:12}}>
        <Ionicons name={recording?'stop':'radio-button-on'} color="#fff" size={18}/>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>
          {recording?'Arrêter':'Enregistrer'}
        </Text>
      </Pressable>
      {drafts.length&&!recording?<Pressable
        onPress={()=>setEvents(old=>old.map(event=>({...event,draft:false})))}
        accessibilityRole="button" style={{minHeight:43,justifyContent:'center',
          paddingHorizontal:4}}>
        <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>
          Valider {drafts.length}
        </Text>
      </Pressable>:null}
    </View>
    {part==='piano'?<View style={{gap:12}}>
      <View style={{gap:7}}>
        <Pressable onPress={()=>setToneOpen(v=>!v)} accessibilityRole="button"
          accessibilityLabel="Choisir le son de l’instrument"
          accessibilityState={{expanded:toneOpen}}
          style={{minHeight:47,borderWidth:1,borderColor:theme.border,
            backgroundColor:theme.surface,borderRadius:12,
            flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12}}>
          <Ionicons name="musical-note-outline" color={PINK} size={20}/>
          <View style={{flex:1,gap:2}}>
            <Text style={{fontSize:11,color:theme.muted}}>Son du clavier</Text>
            <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
              {tone==='Échantillon'?sampleName||'Son importé':tone}
            </Text>
          </View>
          <Ionicons name={toneOpen?'chevron-up':'chevron-down'}
            color={theme.muted} size={18}/>
        </Pressable>
        {toneOpen?<View style={{borderWidth:1,borderColor:theme.border,
          borderRadius:13,backgroundColor:theme.surface,padding:9,gap:3}}>
          {TONES.map(value=><Pressable key={value} onPress={()=>{
            setTone(value);setToneOpen(false);
          }} accessibilityRole="button"
            style={{minHeight:42,flexDirection:'row',alignItems:'center',
              gap:10,paddingHorizontal:8,borderRadius:9,
              backgroundColor:tone===value?(theme.dark?'#492835':'#FBEAF0'):
                'transparent'}}>
            <Ionicons name={tone===value?'radio-button-on':'radio-button-off'}
              size={17} color={tone===value?PINK:theme.muted}/>
            <Text style={{fontSize:13,color:theme.foreground}}>{value}</Text>
          </Pressable>)}
          {sampleId?<Pressable onPress={()=>{
            setTone('Échantillon');setToneOpen(false);
          }} accessibilityRole="button"
            style={{minHeight:42,flexDirection:'row',alignItems:'center',gap:10,
              paddingHorizontal:8}}>
            <Ionicons name={tone==='Échantillon'?'radio-button-on':'radio-button-off'}
              size={17} color={PINK}/>
            <Text style={{fontSize:13,color:theme.foreground,flex:1}}
              numberOfLines={1}>{sampleName}</Text>
          </Pressable>:null}
          <Pressable onPress={importTone} accessibilityRole="button"
            style={{minHeight:45,flexDirection:'row',alignItems:'center',gap:10,
              borderTopWidth:1,borderColor:theme.border,paddingHorizontal:8}}>
            <Ionicons name="cloud-upload-outline" color={PINK} size={18}/>
            <Text style={{fontSize:13,color:PINK,fontWeight:'600'}}>
              Importer un son ou une note chantée
            </Text>
          </Pressable>
          {sampleId?<View style={{gap:7,paddingVertical:7,paddingHorizontal:8}}>
            <Text style={{fontSize:11,color:theme.muted}}>
              Note de référence de l’échantillon : {musicNoteName(sampleRootMidi)}
            </Text>
            <View style={{flexDirection:'row',gap:7}}>
              {control('− ½ ton',()=>setSampleRootMidi(v=>Math.max(24,v-1)))}
              {control('+ ½ ton',()=>setSampleRootMidi(v=>Math.min(96,v+1)))}
            </View>
          </View>:null}
        </View>:null}
      </View>
      <View style={{gap:8}}>
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600',
            marginRight:3}}>Clavier</Text>
          {control('− octave',()=>setBaseMidi(v=>Math.max(24,v-12)),recording)}
          <Text style={{fontSize:19,
            color:theme.foreground}}>{musicNoteName(baseMidi)}</Text>
          {control('+ octave',()=>setBaseMidi(v=>Math.min(84,v+12)),recording)}
          <View style={{flex:1}}/>
        </View>
        <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {([12,18,24,30] as const).map(count=>control(
            count===12?'1 oct.':count===18?'1½':count===24?'2':'2½',
            ()=>setOctaves(count),false,octaves===count))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingBottom:4}}>
          <View style={{height:keyboardHeight,width:whiteOffsets.length*whiteWidth,
            position:'relative',flexDirection:'row'}}>
            {whiteOffsets.map(offset=>{
              const midi=baseMidi+offset;
              const shortcut=['S','E','D','R','F','G','T','H','Y','J','U','K','L'][offset];
              return <Pressable key={midi}
                onPressIn={()=>trigger('piano',midi)}
                onPressOut={()=>releaseNote('piano',midi)}
                accessibilityRole="button" accessibilityLabel={musicNoteName(midi)}
                style={{width:whiteWidth,height:keyboardHeight,
                  backgroundColor:'#FEFEFD',borderWidth:1,
                  borderColor:'#C7C7C7',borderBottomLeftRadius:5,
                  borderBottomRightRadius:5,alignItems:'center',
                  justifyContent:'flex-end',paddingBottom:6}}>
                {Platform.OS==='web'&&!compact&&shortcut?
                  <Text style={{fontSize:12,fontWeight:'700',color:'#9A7D8B',
                    marginBottom:5}}>{shortcut}</Text>:null}
                <Text style={{fontSize:whiteWidth>24?9:8,color:'#505050'}}>
                  {midi%12===0?musicNoteName(midi):whiteWidth>30?
                    musicNoteName(midi).replace(/[0-9]+$/,''):''}
                </Text>
              </Pressable>;
            })}
            {blackOffsets.map(offset=>{
              const midi=baseMidi+offset;
              const before=whiteOffsets.filter(n=>n<offset).length;
              const shortcut=['S','E','D','R','F','G','T','H','Y','J','U','K','L'][offset];
              return <Pressable key={midi}
                onPressIn={()=>trigger('piano',midi)}
                onPressOut={()=>releaseNote('piano',midi)}
                accessibilityRole="button" accessibilityLabel={musicNoteName(midi)}
                style={{position:'absolute',top:0,zIndex:2,
                  left:before*whiteWidth-blackWidth/2,width:blackWidth,
                  height:Math.round(keyboardHeight*.63),
                  backgroundColor:'#26262A',borderColor:'#16161A',
                  borderWidth:1,borderBottomLeftRadius:4,borderBottomRightRadius:4,
                  alignItems:'center',justifyContent:'flex-end',paddingBottom:5}}>
                {Platform.OS==='web'&&!compact&&shortcut?
                  <Text style={{fontSize:10,fontWeight:'700',color:'#F2D6E0'}}>
                    {shortcut}
                  </Text>:null}
              </Pressable>;
            })}
          </View>
        </ScrollView>
        {Platform.OS==='web'&&!compact?<Text style={{fontSize:11,
          color:theme.muted}}>Clavier PC : S = Do, E = Do♯, D = Ré, R = Ré♯,
          F = Mi… Plusieurs touches simultanément pour les accords.</Text>:null}
      </View>
    </View>:<View style={{gap:10}}>
      <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
        Pads · {last||'Batterie'}
      </Text>
      <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
        {DRUM_PADS.map((pad,index)=><Pressable key={pad.midi}
          onPress={()=>trigger('drum',pad.midi)} accessibilityRole="button"
          accessibilityLabel={'Jouer '+pad.label}
          style={{width:compact?'31%':'30%',minHeight:compact?64:76,
            backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
            borderRadius:13,alignItems:'center',justifyContent:'center',gap:3}}>
          <Ionicons name="radio-button-off-outline" size={17} color={PINK}/>
          <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
            {pad.label}
          </Text>
          {Platform.OS==='web'?<Text style={{fontSize:10,color:theme.muted,
            fontWeight:'600'}}>{['A','S','D','F','G','H'][index]}</Text>:null}
        </Pressable>)}
      </View>
    </View>}
    <View style={{flexDirection:'row',gap:7,flexWrap:'wrap',alignItems:'center'}}>
      <Text style={{fontSize:11,color:theme.muted}}>
        Position {beatLabel(cursor)} · silence :
      </Text>
      {control('½ temps',()=>{setCursor(v=>v+.5);chordRef.current=null;},
        recording)}
      {control('1 temps',()=>{setCursor(v=>v+1);chordRef.current=null;},
        recording)}
      <View style={{flex:1}}/>
      {control('Annuler',()=>{setEvents(old=>old.slice(0,-1));setEditor(null);},
        !events.length||recording)}
    </View>
    {message?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      {message}
    </Text>:null}
    <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:13,
      flexDirection:'row',gap:9,alignItems:'center',justifyContent:'flex-end'}}>
      <Pressable onPress={()=>onSave({title:title.trim()||'Idée musicale',
        events,bpm,tone,sampleRootMidi,
        sampleRootHz:sampleRootHz??undefined,clef,
        sampleLocalId:sampleId||undefined,sampleName:sampleName||undefined})}
        disabled={!events.length||recording}
        accessibilityRole="button"
        style={{minHeight:47,paddingHorizontal:18,borderRadius:12,
          alignItems:'center',justifyContent:'center',
          backgroundColor:events.length&&!recording?PINK:theme.border}}>
        <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>
          Conserver la partition
        </Text>
      </Pressable>
    </View>
    {drafts.length?<Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
      Les notes grises peuvent être modifiées ou validées en touchant la partition.
    </Text>:null}
    {Platform.OS!=='web'?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Sur mobile natif, la saisie reste disponible. L’import de sons,
      la sortie MIDI et le téléchargement .mid nécessitent le navigateur web.
    </Text>:null}
  </View>;
}
