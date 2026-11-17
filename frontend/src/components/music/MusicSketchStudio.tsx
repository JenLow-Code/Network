import React, {useEffect,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import Svg, {Circle,Ellipse,Line,Text as SvgText} from 'react-native-svg';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {DRUM_PADS,PIANO_NOTES,downloadMusicMidi,musicNoteName} from '@/domain/musicNotation';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type ScoreResult={title:string;events:MusicNotationEvent[];bpm:number};
type Props={
  initialFile?:MusicProjectFile|null;
  onSave:(value:ScoreResult)=>void;
  onDirtyChange:(dirty:boolean)=>void;
};
const blacks=new Set([1,3,6,8,10]);
const natural=[0,2,4,5,7,9,11,12];
const accidental=new Set([1,3,6,8,10]);
const notePosition=(midi:number)=>{
  const semitone=((midi%12)+12)%12;
  const steps=[0,0,1,1,2,3,3,4,4,5,5,6][semitone];
  return 134-(Math.floor(midi/12)-5)*42-steps*6;
};
export function MusicScoreView({events,compact=false}:{
  events:MusicNotationEvent[];compact?:boolean;
}){
  const theme=useAppTheme();
  const maxBeat=events.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),0);
  const width=Math.max(compact?370:590,Math.ceil(maxBeat/4)*4*49+105);
  const piano=events.filter(e=>e.instrument==='piano');
  const percussion=events.filter(e=>e.instrument==='drum');
  return <ScrollView horizontal showsHorizontalScrollIndicator
    accessibilityLabel="Partition musicale, défilement horizontal"
    style={{borderWidth:1,borderColor:theme.border,borderRadius:12,
      backgroundColor:theme.surface}}>
    <Svg width={width} height={245} viewBox={'0 0 '+width+' 245'}>
      {[74,86,98,110,122].map(y=><Line key={'p'+y} x1={52} x2={width-15}
        y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>)}
      {[184,196,208,220,232].map(y=><Line key={'d'+y} x1={52} x2={width-15}
        y1={y} y2={y} stroke={theme.muted} strokeWidth={.65}/>)}
      <SvgText x={10} y={112} fontSize={40} fill={theme.foreground}>𝄞</SvgText>
      <SvgText x={7} y={205} fontSize={11} fill={theme.muted}>DR</SvgText>
      <SvgText x={54} y={37} fontSize={11} fill={theme.muted}>
        {piano.length?'Mélodie':'Joue les touches du piano pour saisir des notes'}
      </SvgText>
      <SvgText x={54} y={170} fontSize={11} fill={theme.muted}>
        {percussion.length?'Percussions':'Utilise les pads pour ajouter un rythme'}
      </SvgText>
      {Array.from({length:Math.ceil(maxBeat/4)+1},(_,i)=>i*4).map(beat=>
        <Line key={'bar'+beat} x1={72+beat*49} x2={72+beat*49}
          y1={74} y2={122} stroke={theme.muted} strokeWidth={.85}/>)}
      {piano.map(event=>{
        const x=75+event.startBeats*49;
        const y=notePosition(event.midi);
        return <React.Fragment key={event.id}>
          {y>126?<Line x1={x-12} x2={x+12} y1={134} y2={134}
            stroke={theme.foreground} strokeWidth={1}/>:null}
          {accidental.has(event.midi%12)?<SvgText x={x-18} y={y+5}
            fontSize={15} fill={theme.foreground}>♯</SvgText>:null}
          <Ellipse cx={x} cy={y} rx={7.5} ry={5.2}
            rotation={-19} origin={x+','+y} fill={PINK}/>
          <Line x1={x+7} x2={x+7} y1={y} y2={y-30}
            stroke={PINK} strokeWidth={1.6}/>
        </React.Fragment>;
      })}
      {percussion.map(event=>{
        const x=75+event.startBeats*49;
        const y=event.midi===36?226:event.midi===38||event.midi===39?208:184;
        return <React.Fragment key={event.id}>
          <Line x1={x-6} y1={y-6} x2={x+6} y2={y+6}
            stroke={PINK} strokeWidth={2}/>
          <Line x1={x-6} y1={y+6} x2={x+6} y2={y-6}
            stroke={PINK} strokeWidth={2}/>
          <Line x1={x+6} y1={y} x2={x+6} y2={y-27}
            stroke={PINK} strokeWidth={1.5}/>
        </React.Fragment>;
      })}
    </Svg>
  </ScrollView>;
}
/** Browser-only synthesized monitoring; note events and their MIDI data are platform-independent. */
function sound(ctx:AudioContext,pitch:number,drum:boolean,volume:number){
  const now=ctx.currentTime;
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(Math.max(.0001,volume*.24),now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+(drum?.18:.55));
  gain.connect(ctx.destination);
  if(drum&&pitch!==36){
    const length=Math.round(ctx.sampleRate*.25);
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const noise=ctx.createBufferSource();noise.buffer=buffer;
    const filter=ctx.createBiquadFilter();
    filter.type=(pitch===42||pitch===46||pitch===49)?'highpass':'bandpass';
    filter.frequency.value=(pitch===42||pitch===46||pitch===49)?5600:1200;
    noise.connect(filter);filter.connect(gain);noise.start(now);
    noise.stop(now+.23);
  }else{
    const osc=ctx.createOscillator();
    osc.type=drum?'sine':'triangle';
    const hz=drum?125:440*Math.pow(2,(pitch-69)/12);
    osc.frequency.setValueAtTime(hz,now);
    if(drum)osc.frequency.exponentialRampToValueAtTime(46,now+.13);
    osc.connect(gain);osc.start(now);
    osc.stop(now+(drum?.2:.58));
  }
}
const newId=()=> 'note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
export function MusicSketchStudio({initialFile,onSave,onDirtyChange}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<650;
  const [title,setTitle]=useState(initialFile?.title||'');
  const [events,setEvents]=useState<MusicNotationEvent[]>(initialFile?.musicEvents||[]);
  const [bpm,setBpm]=useState(initialFile?.tempoBpm||100);
  const [step,setStep]=useState<.5|1>(.5);
  const [recording,setRecording]=useState(false);
  const startRef=useRef(0);
  const beatOriginRef=useRef(0);
  const [volume,setVolume]=useState({piano:.8,drum:.7});
  const [last,setLast]=useState('');
  const [message,setMessage]=useState('');
  const audioRef=useRef<AudioContext|null>(null);
  const pristineEvents=JSON.stringify(initialFile?.musicEvents||[]);
  const dirty=!!events.length&&(title!== (initialFile?.title||'') ||
    JSON.stringify(events)!==pristineEvents || bpm!==(initialFile?.tempoBpm||100));
  useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);
  useEffect(()=>()=>{void audioRef.current?.close();},[]);
  const nextBeat=()=>{
    return events.reduce((max,e)=>Math.max(max,e.startBeats+e.lengthBeats),0);
  };
  const trigger=(instrument:'piano'|'drum',midi:number)=>{
    setMessage('');
    setLast(instrument==='drum'?(DRUM_PADS.find(p=>p.midi===midi)?.label||'Percussion'):musicNoteName(midi));
    if(Platform.OS==='web'){
      try{
        if(!audioRef.current)audioRef.current=new AudioContext();
        const ctx=audioRef.current;
        if(ctx.state==='suspended')void ctx.resume();
        sound(ctx,midi,instrument==='drum',volume[instrument]);
      }catch{setMessage('Aperçu sonore indisponible sur cet appareil.');}
    }
    const playedBeats=recording
      ?beatOriginRef.current+(Date.now()-startRef.current)/60000*bpm
      :nextBeat();
    const startBeats=Math.max(0,Math.round(playedBeats/step)*step);
    const event:MusicNotationEvent={id:newId(),instrument,midi,
      startBeats,lengthBeats:instrument==='drum'?.25:step,velocity:95};
    setEvents(old=>[...old,event]);
  };
  const toggleRecording=()=>{
    if(recording){setRecording(false);return;}
    beatOriginRef.current=nextBeat();startRef.current=Date.now();
    setRecording(true);setMessage('');
  };
  const exportMidi=()=>{
    try{downloadMusicMidi(events,bpm,title||'idee-musicale');setMessage('MIDI exporté.');}
    catch(e){setMessage(e instanceof Error?e.message:'Export MIDI impossible.');}
  };
  const key=(midi:number)=>{
    const note=PIANO_NOTES.find(p=>p.midi===midi)!;
    const black=blacks.has(midi%12);
    return <Pressable key={midi} onPress={()=>trigger('piano',midi)}
      accessibilityRole="button" accessibilityLabel={musicNoteName(midi)}
      style={{
        width:black?24:compact?38:55,height:black?90:150,
        backgroundColor:black?'#25252A':'#FEFEFD',
        borderWidth:1,borderColor:black?'#17171A':'#C6C6C6',
        borderBottomLeftRadius:5,borderBottomRightRadius:5,
        position:black?'absolute':'relative',top:0,
        left:black?((natural.filter(n=>n<midi-60).length)* (compact?38:55)-12):undefined,
        zIndex:black?2:1,alignItems:'center',justifyContent:'flex-end',
        paddingBottom:black?5:10,
      }}>
      {!black?<Text style={{fontSize:compact?9:11,color:'#4D4D4D'}}>{note.name}</Text>:null}
    </Pressable>;
  };
  const control=(label:string,fn:()=>void,disabled=false)=>
    <Pressable onPress={fn} disabled={disabled} accessibilityRole="button"
      style={{minHeight:38,minWidth:38,paddingHorizontal:10,alignItems:'center',
        justifyContent:'center',borderWidth:1,borderColor:theme.border,
        borderRadius:9,opacity:disabled?.4:1}}>
      <Text style={{color:theme.foreground,fontSize:13}}>{label}</Text>
    </Pressable>;
  return <View style={{gap:19}}>
    <View style={{gap:7}}>
      <TextInput value={title} onChangeText={setTitle}
        placeholder="Nom de cette idée musicale (facultatif)" placeholderTextColor={theme.muted}
        accessibilityLabel="Titre de la partition"
        style={{fontSize:compact?20:25,fontWeight:'600',
          color:theme.foreground,paddingVertical:9}}/>
      <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
        Une esquisse musicale enregistrée dans Capture, sans créer de version ni de piste audio.
      </Text>
    </View>
    <View style={{flexDirection:'row',alignItems:'center',gap:11,flexWrap:'wrap'}}>
      <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Tempo</Text>
      {control('−',()=>setBpm(v=>Math.max(40,v-5)),recording)}
      <Text style={{color:theme.foreground,fontSize:14,fontVariant:['tabular-nums']}}>{bpm} BPM</Text>
      {control('+',()=>setBpm(v=>Math.min(240,v+5)),recording)}
      <View style={{width:8}}/>
      <Text style={{color:theme.muted,fontSize:12}}>Pas</Text>
      {control('½ temps',()=>setStep(.5),recording)}
      {control('1 temps',()=>setStep(1),recording)}
    </View>
    <MusicScoreView events={events} compact={compact}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <Pressable onPress={toggleRecording} accessibilityRole="button"
        accessibilityLabel={recording?'Arrêter la saisie en direct':'Enregistrer les gestes en temps réel'}
        style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:9,
          backgroundColor:recording?'#A82C3A':PINK,paddingHorizontal:16,borderRadius:11}}>
        <Ionicons name={recording?'stop':'radio-button-on'} color="#fff" size={19}/>
        <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>
          {recording?'Arrêter':'Enregistrer en direct'}
        </Text>
      </Pressable>
      <Text style={{fontSize:12,color:theme.muted,flex:1}}>
        {recording?'Joue le piano et les pads : les gestes sont placés dans le temps.':
          'Hors enregistrement, chaque touche ajoute une note à la suite.'}
      </Text>
    </View>
    <View style={{gap:10}}>
      <Text style={{fontSize:11,fontWeight:'700',color:PINK}}>PIANO · {last||'—'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{paddingBottom:5}}>
        <View style={{height:152,width:(compact?38:55)*8,position:'relative'}}>
          <View style={{flexDirection:'row'}}>
            {natural.map(semitone=>key(60+semitone))}
          </View>
          {[1,3,6,8,10].map(semitone=>key(60+semitone))}
        </View>
      </ScrollView>
    </View>
    <View style={{gap:10}}>
      <Text style={{fontSize:11,fontWeight:'700',color:PINK}}>PADS · BATTERIE</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {DRUM_PADS.map(pad=><Pressable key={pad.midi}
          onPress={()=>trigger('drum',pad.midi)} accessibilityRole="button"
          accessibilityLabel={'Jouer '+pad.label}
          style={{minHeight:compact?69:80,width:compact?'31%':'30%',
            minWidth:compact?85:125,backgroundColor:theme.dark?'#3A3035':'#ECE5E6',
            borderColor:theme.border,borderWidth:1,borderRadius:12,
            alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="radio-button-off-outline" size={18} color={PINK}/>
          <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>{pad.label}</Text>
        </Pressable>)}
      </View>
    </View>
    <View style={{gap:10}}>
      <Text style={{fontSize:11,fontWeight:'700',color:PINK}}>NIVEAUX D’ÉCOUTE</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:20}}>
        {(['piano','drum'] as const).map(which=><View key={which}
          style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <Text style={{fontSize:13,color:theme.foreground}}>
            {which==='piano'?'Piano':'Pads'}
          </Text>
          {control('−',()=>setVolume(old=>({...old,[which]:Math.max(0,old[which]-.1)})))}
          <Text style={{minWidth:38,textAlign:'center',color:theme.muted,fontSize:12}}>
            {Math.round(volume[which]*100)} %
          </Text>
          {control('+',()=>setVolume(old=>({...old,[which]:Math.min(1,old[which]+.1)})))}
        </View>)}
      </View>
    </View>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      {control('Annuler la dernière note',()=>setEvents(old=>old.slice(0,-1)),!events.length||recording)}
      {control('Tout effacer',()=>setEvents([]),!events.length||recording)}
      <Text style={{fontSize:12,color:theme.muted}}>{events.length} notes / frappes</Text>
    </View>
    {message?<Text style={{color:theme.muted,fontSize:12}}>{message}</Text>:null}
    <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:14,
      flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <Pressable onPress={exportMidi} disabled={!events.length||recording}
        accessibilityRole="button" style={{minHeight:43,flexDirection:'row',
          gap:7,alignItems:'center',opacity:events.length&&!recording?1:.4}}>
        <Ionicons name="download-outline" size={18} color={PINK}/>
        <Text style={{fontSize:13,color:PINK,fontWeight:'600'}}>Exporter MIDI</Text>
      </Pressable>
      <Pressable onPress={()=>onSave({title:title.trim()||'Idée musicale',events,bpm})}
        disabled={!events.length||recording} accessibilityRole="button"
        style={{minHeight:46,paddingHorizontal:18,borderRadius:10,
          justifyContent:'center',backgroundColor:events.length&&!recording?PINK:theme.border}}>
        <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Conserver la capture</Text>
      </Pressable>
    </View>
    {Platform.OS!=='web'?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      La saisie et la partition fonctionnent sur mobile. L’aperçu sonore synthétisé
      et l’export MIDI sont disponibles sur le web pour le moment.
    </Text>:null}
  </View>;
}
