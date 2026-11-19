import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import Svg,{Ellipse,Line,Text as SvgText} from 'react-native-svg';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {DRUM_PADS,downloadMusicMidi,musicNoteName} from '@/domain/musicNotation';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Instrument='piano'|'drum';
type ScoreResult={title:string;events:MusicNotationEvent[];bpm:number};
type Props={
  initialFile?:MusicProjectFile|null;
  onSave:(value:ScoreResult)=>void;
  onDirtyChange:(dirty:boolean)=>void;
};
type MidiPort={id:string;name?:string;send:(data:number[])=>void};
type MidiAccess={outputs:Map<string,MidiPort>};
const DURATIONS=[.25,.5,1,2,4] as const;
const TONES=['Piano doux','Orgue','Synthé'] as const;
const BLACKS=new Set([1,3,6,8,10]);
const newId=()=> 'note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const beatLabel=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const durationLabel=(v:number)=>v===.25?'¼':v===.5?'½':v+'';
const notePosition=(midi:number)=>{
  const semitone=((midi%12)+12)%12;
  const steps=[0,0,1,1,2,3,3,4,4,5,5,6][semitone];
  return 134-(Math.floor(midi/12)-5)*42-steps*6;
};

/** A score remains a preview, while the event editor owns timing and duration. */
export function MusicScoreView({events,compact=false,instrument}:{
  events:MusicNotationEvent[];compact?:boolean;instrument?:Instrument;
}){
  const theme=useAppTheme();
  const visible=instrument?events.filter(e=>e.instrument===instrument):events;
  const maxBeat=visible.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),4);
  const unit=compact?37:49;
  const width=Math.max(compact?305:590,Math.ceil(maxBeat/4)*4*unit+105);
  const piano=visible.filter(e=>e.instrument==='piano');
  const percussion=visible.filter(e=>e.instrument==='drum');
  const showPiano=instrument!=='drum',showDrum=instrument!=='piano';
  const height=showPiano&&showDrum?245:showPiano?151:145;
  const drumsY=(midi:number)=>midi===36?showPiano?226:123:
    midi===38||midi===39?showPiano?208:105:showPiano?184:81;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}
    accessibilityLabel="Partition musicale, défilement horizontal"
    style={{borderWidth:1,borderColor:theme.border,borderRadius:12,
      backgroundColor:theme.surface}}>
    <Svg width={width} height={height} viewBox={'0 0 '+width+' '+height}>
      {showPiano?[74,86,98,110,122].map(y=><Line key={'p'+y} x1={52} x2={width-15}
        y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>):null}
      {showDrum?(showPiano?[184,196,208,220,232]:[81,93,105,117,129]).map(y=>
        <Line key={'d'+y} x1={52} x2={width-15}
          y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>):null}
      {showPiano?<SvgText x={10} y={112} fontSize={40} fill={theme.foreground}>𝄞</SvgText>:null}
      {showDrum?<SvgText x={7} y={showPiano?205:105} fontSize={11}
        fill={theme.muted}>DR</SvgText>:null}
      {!visible.length?<SvgText x={65} y={showPiano?54:60}
        fontSize={12} fill={theme.muted}>
        {showPiano?'Joue une touche pour commencer':'Joue un pad pour commencer'}
      </SvgText>:null}
      {Array.from({length:Math.ceil(maxBeat/4)+1},(_,i)=>i*4).map(beat=>
        <Line key={'bar'+beat} x1={72+beat*unit} x2={72+beat*unit}
          y1={showPiano?74:81} y2={showPiano?122:129}
          stroke={theme.muted} strokeWidth={.85}/>)}
      {piano.map(event=>{
        const x=75+event.startBeats*unit,y=notePosition(event.midi);
        const color=event.draft?theme.muted:PINK;
        return <React.Fragment key={event.id}>
          {y>126?<Line x1={x-12} x2={x+12} y1={134} y2={134}
            stroke={theme.foreground} strokeWidth={1}/>:null}
          {BLACKS.has(event.midi%12)?<SvgText x={x-18} y={y+5}
            fontSize={15} fill={color}>♯</SvgText>:null}
          <Ellipse cx={x} cy={y} rx={7.5} ry={5.2} rotation={-19}
            origin={x+','+y} fill={color}/>
          <Line x1={x+7} x2={x+7} y1={y} y2={y-30}
            stroke={color} strokeWidth={1.6}/>
        </React.Fragment>;
      })}
      {percussion.map(event=>{
        const x=75+event.startBeats*unit,y=drumsY(event.midi);
        const color=event.draft?theme.muted:PINK;
        return <React.Fragment key={event.id}>
          <Line x1={x-6} y1={y-6} x2={x+6} y2={y+6}
            stroke={color} strokeWidth={2}/>
          <Line x1={x-6} y1={y+6} x2={x+6} y2={y-6}
            stroke={color} strokeWidth={2}/>
          <Line x1={x+6} y1={y} x2={x+6} y2={y-27}
            stroke={color} strokeWidth={1.5}/>
        </React.Fragment>;
      })}
    </Svg>
  </ScrollView>;
}

/** WebAudio previews do not alter the saved MIDI event or the original audio. */
function playSound(ctx:AudioContext,pitch:number,drum:boolean,level:number,
  tone:string,sample:AudioBuffer|null){
  const now=ctx.currentTime;
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(Math.max(.0001,level*.25),now);
  const duration=drum?.24:tone==='Orgue'?.72:.62;
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  gain.connect(ctx.destination);
  if(!drum&&tone==='Échantillon'&&sample){
    const source=ctx.createBufferSource();
    source.buffer=sample;
    source.playbackRate.value=Math.pow(2,(pitch-60)/12);
    source.connect(gain);source.start(now);source.stop(now+duration);
    return;
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
    noise.connect(filter);filter.connect(gain);noise.start(now);noise.stop(now+.23);
  }else{
    const osc=ctx.createOscillator();
    osc.type=drum?'sine':tone==='Orgue'?'sine':tone==='Synthé'?'sawtooth':'triangle';
    const hz=drum?125:440*Math.pow(2,(pitch-69)/12);
    osc.frequency.setValueAtTime(hz,now);
    if(drum)osc.frequency.exponentialRampToValueAtTime(46,now+.13);
    osc.connect(gain);osc.start(now);osc.stop(now+duration);
  }
}

export function MusicSketchStudio({initialFile,onSave,onDirtyChange}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<650;
  const [title,setTitle]=useState(initialFile?.title||'');
  const [events,setEvents]=useState<MusicNotationEvent[]>(initialFile?.musicEvents||[]);
  const [bpm,setBpm]=useState(initialFile?.tempoBpm||100);
  const [part,setPart]=useState<Instrument>('piano');
  const [duration,setDuration]=useState<number>(.5);
  const [cursor,setCursor]=useState(()=>(initialFile?.musicEvents||[])
    .reduce((v,e)=>Math.max(v,e.startBeats+e.lengthBeats),0));
  const [selectedId,setSelectedId]=useState('');
  const [recording,setRecording]=useState(false);
  const startRef=useRef(0),beatOriginRef=useRef(0);
  const [octaves,setOctaves]=useState<12|18|24|30>(12);
  const [baseMidi,setBaseMidi]=useState(60);
  const [tone,setTone]=useState<string>('Piano doux');
  const [sampleName,setSampleName]=useState('');
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
    JSON.stringify(events)!==pristine||bpm!==(initialFile?.tempoBpm||100);
  useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);
  useEffect(()=>()=>{void audioRef.current?.close();},[]);
  const selected=events.find(e=>e.id===selectedId&&e.instrument===part);
  const drafts=events.filter(e=>e.draft);
  const confirmed=events.filter(e=>!e.draft);
  const nextBeat=()=>events.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),cursor);
  const patchEvent=(id:string,changes:Partial<MusicNotationEvent>)=>
    setEvents(old=>old.map(e=>e.id===id?{...e,...changes}:e));
  const trigger=(instrument:Instrument,midi:number)=>{
    setMessage('');setLast(instrument==='piano'?musicNoteName(midi):
      DRUM_PADS.find(p=>p.midi===midi)?.label||'Percussion');
    if(Platform.OS==='web'){
      try{
        if(!audioRef.current)audioRef.current=new AudioContext();
        const ctx=audioRef.current;
        if(ctx.state==='suspended')void ctx.resume();
        playSound(ctx,midi,instrument==='drum',volume[instrument],tone,sampleRef.current);
      }catch{setMessage('Aperçu sonore indisponible sur cet appareil.');}
      try{
        if(midiRef.current){
          const channel=instrument==='piano'?0:9;
          midiRef.current.send([0x90|channel,midi,95]);
          setTimeout(()=>{try{midiRef.current?.send([0x80|channel,midi,0]);}catch{}},
            Math.round(duration*60000/bpm));
        }
      }catch{setMessage('Sortie MIDI déconnectée.');}
    }
    const beat=recording?beatOriginRef.current+
      (Date.now()-startRef.current)/60000*bpm:cursor;
    const startBeats=Math.max(0,Math.round(beat*4)/4);
    const event:MusicNotationEvent={id:newId(),instrument,midi,
      startBeats,lengthBeats:instrument==='drum'?.25:duration,velocity:95,
      draft:!recording};
    setEvents(old=>[...old,event]);setSelectedId(event.id);
    if(!recording)setCursor(startBeats+event.lengthBeats);
  };
  const toggleRecording=()=>{
    if(recording){setRecording(false);return;}
    beatOriginRef.current=nextBeat();startRef.current=Date.now();
    setRecording(true);setMessage('');
  };
  const exportMidi=()=>{
    if(!confirmed.length){setMessage('Valide d’abord les notes grises.');return;}
    try{downloadMusicMidi(confirmed,bpm,title||'idee-musicale');
      setMessage('Fichier .mid exporté (piano canal 1, batterie canal 10).');}
    catch(e){setMessage(e instanceof Error?e.message:'Export MIDI impossible.');}
  };
  const importTone=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setMessage('Import de son disponible sur navigateur web.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';picker.accept='audio/*,.wav,.mp3,.ogg,.m4a';
    picker.onchange=()=>{
      const file=picker.files?.[0];if(!file)return;
      void(async()=>{
        if(!audioRef.current)audioRef.current=new AudioContext();
        const buffer=await audioRef.current.decodeAudioData(await file.arrayBuffer());
        sampleRef.current=buffer;setSampleName(file.name);setTone('Échantillon');
        setMessage('Son importé pour cette session. La note d’origine est supposée Do4.');
      })().catch(()=>setMessage('Ce fichier audio ne peut pas être décodé.'));
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
    if(selected)patchEvent(selected.id,{lengthBeats:length});
  };
  const blackOffsets=Array.from({length:octaves},(_,i)=>i)
    .filter(i=>BLACKS.has(i%12));
  const whiteOffsets=Array.from({length:octaves},(_,i)=>i)
    .filter(i=>!BLACKS.has(i%12));
  const areaWidth=Math.min(compact?Math.max(260,width-68):680,680);
  const whiteWidth=Math.max(compact?17:27,Math.floor(areaWidth/whiteOffsets.length));
  const blackWidth=Math.max(11,Math.round(whiteWidth*.6));
  const keyboardHeight=compact?119:155;
  const choosePart=(next:Instrument)=>{setPart(next);setSelectedId('');};
  const instrumentEvents=events.filter(e=>e.instrument===part)
    .slice().sort((a,b)=>a.startBeats-b.startBeats);
  return <View style={{gap:compact?13:20}}>
    <View style={{gap:5}}>
      <TextInput value={title} onChangeText={setTitle}
        placeholder="Nom de l’idée musicale" placeholderTextColor={theme.muted}
        accessibilityLabel="Titre de la partition"
        style={{fontSize:compact?17:22,fontWeight:'600',color:theme.foreground,
          paddingVertical:compact?6:9}}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
        flexWrap:'wrap',gap:7}}>
        <Text style={{fontSize:11,color:theme.muted}}>
          {events.length} notes · {drafts.length} brouillons
        </Text>
        <Pressable onPress={exportMidi} disabled={!confirmed.length||recording}
          accessibilityRole="button" accessibilityLabel="Exporter le fichier MIDI"
          style={{minHeight:39,alignItems:'center',flexDirection:'row',gap:6,
            opacity:confirmed.length&&!recording?1:.45}}>
          <Ionicons name="download-outline" color={PINK} size={18}/>
          <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>Exporter .mid</Text>
        </Pressable>
      </View>
    </View>
    <View style={{flexDirection:'row',gap:8}}>
      {([{id:'piano',label:'Piano',icon:'musical-notes-outline'},
        {id:'drum',label:'Batterie',icon:'grid-outline'}] as const).map(item=>
        <Pressable key={item.id} onPress={()=>choosePart(item.id)}
          accessibilityRole="tab" accessibilityState={{selected:part===item.id}}
          style={{flex:1,minHeight:44,flexDirection:'row',gap:7,
            alignItems:'center',justifyContent:'center',borderRadius:12,
            backgroundColor:part===item.id?PINK:theme.surface,
            borderWidth:part===item.id?0:1,borderColor:theme.border}}>
          <Ionicons name={item.icon} size={18}
            color={part===item.id?'#fff':theme.muted}/>
          <Text style={{fontSize:13,fontWeight:'600',
            color:part===item.id?'#fff':theme.foreground}}>{item.label}</Text>
        </Pressable>)}
    </View>
    <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7}}>
      <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>Tempo</Text>
      {control('−',()=>setBpm(v=>Math.max(40,v-5)),recording)}
      <Text style={{fontSize:13,color:theme.foreground,
        fontVariant:['tabular-nums']}}>{bpm} BPM</Text>
      {control('+',()=>setBpm(v=>Math.min(240,v+5)),recording)}
      <Text style={{fontSize:11,color:theme.muted,marginLeft:6}}>Durée</Text>
      {DURATIONS.slice(0,3).map(v=>control(durationLabel(v),
        ()=>applyDuration(v),recording,duration===v))}
    </View>
    <MusicScoreView events={events} compact={compact} instrument={part}/>
    <View style={{flexDirection:'row',gap:9,alignItems:'center',flexWrap:'wrap'}}>
      <Pressable onPress={toggleRecording} accessibilityRole="button"
        accessibilityLabel={recording?'Arrêter l’enregistrement en direct':
          'Enregistrer des notes en temps réel'}
        style={{minHeight:44,flexDirection:'row',gap:8,alignItems:'center',
          backgroundColor:recording?'#A83246':PINK,
          paddingHorizontal:14,borderRadius:12}}>
        <Ionicons name={recording?'stop':'radio-button-on'} color="#fff" size={18}/>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>
          {recording?'Terminer la prise':'Enregistrer en direct'}
        </Text>
      </Pressable>
      {drafts.length&&!recording?<Pressable
        onPress={()=>setEvents(old=>old.map(e=>({...e,draft:false})))}
        accessibilityRole="button"
        style={{minHeight:43,paddingHorizontal:9,justifyContent:'center'}}>
        <Text style={{fontSize:12,color:PINK,fontWeight:'700'}}>
          Valider {drafts.length} note{drafts.length>1?'s':''}
        </Text>
      </Pressable>:null}
    </View>
    <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
      {recording?'Les notes jouées sont enregistrées en rose, à leur position réelle.':
        'Les notes saisies sont grises jusqu’à validation. Les pauses décalent la prochaine note.'}
    </Text>
    {part==='piano'?<View style={{gap:12}}>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontWeight:'600',fontSize:12}}>
          Son du piano
        </Text>
        <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
          {TONES.map(value=>control(value,()=>setTone(value),false,tone===value))}
          {control(sampleName?'Son importé':'Importer un son',importTone)}
          {sampleName?control('Échantillon',()=>setTone('Échantillon'),false,
            tone==='Échantillon'):null}
        </View>
        {sampleName?<Text style={{fontSize:11,color:theme.muted}} numberOfLines={1}>
          {sampleName} · référence Do4 · session actuelle
        </Text>:null}
      </View>
      <View style={{gap:7}}>
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600',
            marginRight:4}}>Clavier</Text>
          {control('− octave',()=>setBaseMidi(v=>Math.max(24,v-12)),recording)}
          <Text style={{fontSize:12,color:theme.muted}}>{musicNoteName(baseMidi)}</Text>
          {control('+ octave',()=>setBaseMidi(v=>Math.min(84,v+12)),recording)}
        </View>
        <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <Text style={{fontSize:11,color:theme.muted,marginRight:3}}>Plage</Text>
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
              return <Pressable key={midi} onPress={()=>trigger('piano',midi)}
                accessibilityRole="button" accessibilityLabel={musicNoteName(midi)}
                style={{width:whiteWidth,height:keyboardHeight,
                  backgroundColor:'#FEFEFD',borderWidth:1,
                  borderColor:'#C7C7C7',borderBottomLeftRadius:5,
                  borderBottomRightRadius:5,alignItems:'center',
                  justifyContent:'flex-end',paddingBottom:7}}>
                <Text style={{fontSize:whiteWidth>24?9:8,color:'#505050'}}>
                  {midi%12===0?musicNoteName(midi):whiteWidth>30?
                    musicNoteName(midi).replace(/[0-9]+$/,''):''}
                </Text>
              </Pressable>;
            })}
            {blackOffsets.map(offset=>{
              const midi=baseMidi+offset;
              const before=whiteOffsets.filter(n=>n<offset).length;
              return <Pressable key={midi} onPress={()=>trigger('piano',midi)}
                accessibilityRole="button" accessibilityLabel={musicNoteName(midi)}
                style={{position:'absolute',top:0,zIndex:2,
                  left:before*whiteWidth-blackWidth/2,width:blackWidth,
                  height:Math.round(keyboardHeight*.63),
                  backgroundColor:'#26262A',borderColor:'#16161A',
                  borderWidth:1,borderBottomLeftRadius:4,
                  borderBottomRightRadius:4}}/>;
            })}
          </View>
        </ScrollView>
      </View>
    </View>:<View style={{gap:10}}>
      <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
        Pads · {last||'Batterie'}
      </Text>
      <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
        {DRUM_PADS.map(pad=><Pressable key={pad.midi}
          onPress={()=>trigger('drum',pad.midi)} accessibilityRole="button"
          accessibilityLabel={'Jouer '+pad.label}
          style={{width:compact?'31%':'30%',minHeight:compact?64:76,
            backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
            borderRadius:13,alignItems:'center',justifyContent:'center',gap:3}}>
          <Ionicons name="radio-button-off-outline" size={17} color={PINK}/>
          <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
            {pad.label}
          </Text>
        </Pressable>)}
      </View>
    </View>}
    <View style={{gap:9}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'}}>
        <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
          Prochaine note · temps {beatLabel(cursor)}
        </Text>
        {control('Pause ½',()=>setCursor(v=>v+.5),recording)}
        {control('Pause 1',()=>setCursor(v=>v+1),recording)}
      </View>
      <Text style={{fontSize:11,color:theme.muted}}>
        Choisis une note pour déplacer, changer sa durée ou la supprimer.
      </Text>
      {instrumentEvents.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap:7,paddingVertical:3}}>
        {instrumentEvents.map(event=><Pressable key={event.id}
          onPress={()=>setSelectedId(event.id)} accessibilityRole="button"
          accessibilityLabel={'Modifier '+musicNoteName(event.midi)}
          style={{borderWidth:1,borderColor:selected?.id===event.id?PINK:theme.border,
            backgroundColor:selected?.id===event.id?
              (theme.dark?'#412633':'#FAE9EF'):theme.surface,
            paddingHorizontal:11,minHeight:41,borderRadius:11,
            alignItems:'center',justifyContent:'center',gap:3}}>
          <Text style={{color:event.draft?theme.muted:PINK,
            fontSize:12,fontWeight:'600'}}>
            {event.instrument==='piano'?musicNoteName(event.midi):
              DRUM_PADS.find(p=>p.midi===event.midi)?.label||'Pad'}
          </Text>
          <Text style={{color:theme.muted,fontSize:10}}>
            {beatLabel(event.startBeats)} · {durationLabel(event.lengthBeats)}
          </Text>
        </Pressable>)}
      </ScrollView>:null}
      {selected?<View style={{borderRadius:13,borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.surface,padding:12,gap:10}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
            {part==='piano'?musicNoteName(selected.midi):'Frappe'} · temps {beatLabel(selected.startBeats)}
          </Text>
          <Text style={{fontSize:11,color:selected.draft?theme.muted:PINK}}>
            {selected.draft?'Brouillon':'Enregistrée'}
          </Text>
        </View>
        <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <Text style={{fontSize:11,color:theme.muted}}>Durée</Text>
          {DURATIONS.map(v=>control(durationLabel(v),
            ()=>patchEvent(selected.id,{lengthBeats:v}),recording,
            selected.lengthBeats===v))}
        </View>
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <Text style={{fontSize:11,color:theme.muted}}>Déplacer</Text>
          {control('← ¼',()=>patchEvent(selected.id,{startBeats:
            Math.max(0,Math.round((selected.startBeats-.25)*4)/4)}),recording)}
          {control('¼ →',()=>patchEvent(selected.id,{startBeats:
            Math.round((selected.startBeats+.25)*4)/4}),recording)}
          {control('Supprimer',()=>{
            setEvents(old=>old.filter(e=>e.id!==selected.id));setSelectedId('');
          },recording)}
        </View>
      </View>:null}
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'}}>
      {control('Annuler la dernière note',()=>setEvents(old=>old.slice(0,-1)),
        !events.length||recording)}
      {control('Tout effacer',()=>{setEvents([]);setCursor(0);setSelectedId('');},
        !events.length||recording)}
    </View>
    <View style={{gap:7}}>
      <Pressable onPress={()=>setMidiOpen(v=>!v)} accessibilityRole="button"
        accessibilityState={{expanded:midiOpen}}
        style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:41}}>
        <Ionicons name="hardware-chip-outline" size={17} color={PINK}/>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
          Sortie MIDI vers un instrument
        </Text>
        <Ionicons name={midiOpen?'chevron-up':'chevron-down'} size={16}
          color={theme.muted}/>
      </Pressable>
      {midiOpen?<View style={{gap:9,padding:12,borderRadius:12,
        borderWidth:1,borderColor:theme.border}}>
        <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
          Les notes peuvent aussi être envoyées à un appareil MIDI connecté,
          dans un navigateur compatible.
        </Text>
        {control('Rechercher les sorties MIDI',()=>{void connectMidi();})}
        {midiPorts.map(port=><Pressable key={port.id}
          onPress={()=>{setMidiPortId(port.id);midiRef.current=port;}}
          accessibilityRole="button"
          style={{minHeight:40,justifyContent:'center'}}>
          <Text style={{fontSize:12,color:midiPortId===port.id?PINK:theme.foreground}}>
            {midiPortId===port.id?'✓  ':''}{port.name||'Sortie MIDI'}
          </Text>
        </Pressable>)}
        {midiPortId?control('Déconnecter',()=>{midiRef.current=null;setMidiPortId('');}):null}
      </View>:null}
    </View>
    {message?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      {message}
    </Text>:null}
    <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:13,
      flexDirection:'row',gap:9,alignItems:'center',justifyContent:'flex-end'}}>
      <Pressable onPress={()=>onSave({title:title.trim()||'Idée musicale',
        events:events.map(e=>({...e,draft:false})),bpm})}
        disabled={!confirmed.length||!!drafts.length||recording}
        accessibilityRole="button"
        style={{minHeight:47,paddingHorizontal:18,borderRadius:12,
          alignItems:'center',justifyContent:'center',
          backgroundColor:confirmed.length&&!drafts.length&&!recording?PINK:theme.border}}>
        <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>
          Conserver la partition
        </Text>
      </Pressable>
    </View>
    {drafts.length?<Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
      Valide les notes grises pour conserver ou exporter la partition.
    </Text>:null}
    {Platform.OS!=='web'?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Sur mobile natif, la saisie reste disponible. L’import de sons,
      la sortie MIDI et le téléchargement .mid nécessitent le navigateur web.
    </Text>:null}
  </View>;
}
