import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {isPlayableMusicFile} from '@/domain/musicNext';
import type {WorkingMusicVersion} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
const pink='#CB245C';

type Voice={source:AudioBufferSourceNode;gain:GainNode};
type Engine={ctx:AudioContext;voices:Map<string,Voice>;startedAt:number;
  position:number;duration:number;timer:ReturnType<typeof setInterval>|null};
export function MusicStudioTransport({version,files}:{version:WorkingMusicVersion;
  files:MusicProjectFile[]}){
  const theme=useAppTheme();
  const engine=useRef<Engine|null>(null);
  const width=useRef(1);
  const positionRef=useRef(0);
  const playingRef=useRef(false);
  const [position,setPosition]=useState(0);
  const [duration,setDuration]=useState(Math.max(0,...version.tracks.map(t=>
    (files.find(f=>f.id===t.sourceFileId)?.durationSeconds||0)+t.offsetSeconds)));
  const [playing,setPlaying]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const active=version.tracks.filter(t=>isPlayableMusicFile(
    files.find(f=>f.id===t.sourceFileId)||({} as MusicProjectFile)));
  const clear=(reset=false)=>{
    const e=engine.current;
    if(e){
      if(e.timer)clearInterval(e.timer);
      e.voices.forEach(v=>{try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();});
      void e.ctx.close().catch(()=>{});
      engine.current=null;
    }
    playingRef.current=false;setPlaying(false);
    if(reset){positionRef.current=0;setPosition(0);}
  };
  useEffect(()=>()=>{const e=engine.current;if(!e)return;
    if(e.timer)clearInterval(e.timer);
    e.voices.forEach(v=>{try{v.source.stop();}catch{}});
    void e.ctx.close().catch(()=>{});engine.current=null;
  },[version.id]);
  useEffect(()=>{
    const e=engine.current;if(!e)return;
    const anySolo=version.tracks.some(t=>t.solo);
    version.tracks.forEach(t=>{
      const voice=e.voices.get(t.id);
      if(voice)voice.gain.gain.setTargetAtTime(t.muted||(anySolo&&!t.solo)?0:1,
        e.ctx.currentTime,.012);
    });
  },[version.tracks]);
  const pause=()=>{
    const e=engine.current;
    if(e){positionRef.current=Math.min(e.duration,e.position+(e.ctx.currentTime-e.startedAt));}
    setPosition(positionRef.current);clear();
  };
  const begin=async(at:number)=>{
    if(busy||playingRef.current)return;
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'){
      setError('Lecture multipiste disponible dans le navigateur compatible Web Audio.');return;
    }
    if(!active.length){setError('Ajoute une piste audio pour écouter cette version.');return;}
    setBusy(true);setError('');
    let ctx:AudioContext|null=null;
    try{
      ctx=new AudioContext();
      await ctx.resume();
      const loaded=await Promise.all(active.map(async t=>{
        const f=files.find(file=>file.id===t.sourceFileId);
        if(!f?.localFileId)throw Error('Enregistrement introuvable : '+t.title);
        const blob=await getDraftAttachment(f.localFileId);
        if(!blob)throw Error('Audio absent de ce navigateur : '+t.title);
        const data=await blob.arrayBuffer();
        const buffer=await ctx!.decodeAudioData(data);
        return {t,buffer};
      }));
      const maximum=Math.max(0,...loaded.map(({t,buffer})=>
        Math.max(0,t.offsetSeconds)+(t.trimEndSeconds??buffer.duration)-
        (t.trimStartSeconds??0)));
      if(at>=maximum){at=0;setPosition(0);positionRef.current=0;}
      const startTime=ctx.currentTime+0.09;
      const solo=version.tracks.some(t=>t.solo);
      const voices=new Map<string,Voice>();
      loaded.forEach(({t,buffer})=>{
        const clipStart=Math.max(0,t.trimStartSeconds||0);
        const clipEnd=Math.min(buffer.duration,t.trimEndSeconds??buffer.duration);
        const source=ctx!.createBufferSource();source.buffer=buffer;
        const gain=ctx!.createGain();gain.gain.value=t.muted||(solo&&!t.solo)?0:1;
        source.connect(gain);gain.connect(ctx!.destination);
        const timelineStart=Math.max(0,t.offsetSeconds);
        const playAt=Math.max(timelineStart,at);
        const offsetInAudio=clipStart+Math.max(0,playAt-timelineStart);
        const remain=clipEnd-offsetInAudio;
        if(remain>0){source.start(startTime+(playAt-at),offsetInAudio,remain);
          voices.set(t.id,{source,gain});
        }
      });
      const session:Engine={ctx,voices,startedAt:startTime,position:at,
        duration:maximum,timer:null};
      engine.current=session;playingRef.current=true;
      setDuration(maximum);setPlaying(true);setPosition(at);positionRef.current=at;
      session.timer=setInterval(()=>{
        if(engine.current!==session)return;
        const elapsed=Math.max(0,ctx!.currentTime-session.startedAt);
        const current=Math.min(maximum,session.position+elapsed);
        positionRef.current=current;setPosition(current);
        if(current>=maximum){clear(true);}
      },140);
    }catch(e){
      if(ctx)void ctx.close().catch(()=>{});
      setError(e instanceof Error?e.message:'Lecture multipiste impossible.');
    }finally{setBusy(false);}
  };
  const toggle=()=>{if(playingRef.current)pause();else void begin(positionRef.current);};
  const seek=(fraction:number)=>{
    const next=duration*Math.min(1,Math.max(0,fraction));
    const wasPlaying=playingRef.current;
    clear();positionRef.current=next;setPosition(next);
    if(wasPlaying)void begin(next);
  };
  return <View style={{padding:13,backgroundColor:theme.surface,borderWidth:1,
    borderColor:theme.border,borderRadius:16,gap:12}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <Pressable onPress={toggle} disabled={busy}
        accessibilityRole="button" accessibilityLabel={playing?'Pause':'Lire cette version'}
        style={{width:47,height:47,borderRadius:24,backgroundColor:pink,
          alignItems:'center',justifyContent:'center',opacity:busy?.5:1}}>
        <Ionicons name={playing?'pause':'play'} color="#fff" size={21}/>
      </Pressable>
      <View style={{flex:1,gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>
            {formatMusicDuration(position)} / {formatMusicDuration(duration)}
          </Text>
          <Pressable onPress={()=>clear(true)} accessibilityLabel="Revenir au début">
            <Ionicons name="play-skip-back-outline" color={theme.muted} size={19}/>
          </Pressable>
        </View>
        <Pressable accessibilityRole="adjustable" accessibilityLabel="Position de lecture"
          accessibilityValue={{min:0,max:100,now:duration?Math.round(position/duration*100):0}}
          onLayout={e=>{width.current=e.nativeEvent.layout.width||1;}}
          onPress={e=>seek(e.nativeEvent.locationX/width.current)}
          style={{height:23,justifyContent:'center'}}>
          <View style={{height:4,borderRadius:2,backgroundColor:theme.border}}>
            <View style={{width:(duration?position/duration*100:0)+'%',
              height:4,borderRadius:2,backgroundColor:pink}}/>
          </View>
        </Pressable>
      </View>
    </View>
    {error?<Text style={{color:'#B34D67',fontSize:11}}>{error}</Text>:null}
    {!active.length?<Text style={{fontSize:11,color:theme.muted}}>
      Ajoute une prise audio pour commencer l’écoute de cette version.
    </Text>:null}
  </View>;
}
