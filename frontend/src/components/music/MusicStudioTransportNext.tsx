import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {musicStampMs} from '@/domain/musicEditing';
import {isPlayableMusicFile} from '@/domain/musicNext';
import {MusicArrangementTimeline} from './MusicArrangementTimeline';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Voice={source:AudioBufferSourceNode;gain:GainNode};
type Engine={ctx:AudioContext;voices:Map<string,Voice>;startTime:number;
  from:number;duration:number;interval:ReturnType<typeof setInterval>|null};
type Props={
  version:WorkingMusicVersion;files:MusicProjectFile[];
  onPositionChange?:(position:number)=>void;
  onTrackChange?:(id:string,change:Partial<WorkingMusicTrack>)=>void;
  onSelectTrack?:(id:string)=>void;
  onMarkTrackRange?:(trackId:string,startSeconds:number,endSeconds:number)=>void;
  onRenameTrack?:(trackId:string,title:string)=>void;
  onEmojiTrack?:(trackId:string,emoji:string)=>void;
  onRemoveTrack?:(trackId:string)=>void;
  onDropSource?:(sourceFileId:string,atSeconds:number)=>void;
  playbackRequest?:{at:number;serial:number}|null;
  pauseRequest?:number;
};
function versionLength(version:WorkingMusicVersion,files:MusicProjectFile[]){
  return Math.max(0,...version.tracks.map(t=>{
    const file=files.find(x=>x.id===t.sourceFileId);
    const length=file?.durationSeconds||0;
    const trim=Math.max(0,Math.min(t.trimEndSeconds??length,length)-(t.trimStartSeconds||0));
    return Math.max(0,t.offsetSeconds)+trim;
  }));
}
export function MusicStudioTransport({version,files,onPositionChange,onTrackChange,
  onSelectTrack,onMarkTrackRange,onRenameTrack,onEmojiTrack,onRemoveTrack,onDropSource,
  playbackRequest,pauseRequest}:Props){
  const theme=useAppTheme();
  const engine=useRef<Engine|null>(null);
  const playingRef=useRef(false);
  const posRef=useRef(0);
  const [position,setPosition]=useState(0);
  const [duration,setDuration]=useState(versionLength(version,files));
  const [playing,setPlaying]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const active=version.tracks.filter(t=>
    isPlayableMusicFile(files.find(f=>f.id===t.sourceFileId)||({} as MusicProjectFile)));
  const close=(reset=false)=>{
    const running=engine.current;
    if(running){
      if(running.interval)clearInterval(running.interval);
      running.voices.forEach(v=>{
        try{v.source.stop();}catch{}
        v.source.disconnect();v.gain.disconnect();
      });
      void running.ctx.close().catch(()=>{});engine.current=null;
    }
    playingRef.current=false;setPlaying(false);
    if(reset){posRef.current=0;setPosition(0);}
  };
  useEffect(()=>{
    return ()=>{
      const running=engine.current;
      if(!running)return;
      if(running.interval)clearInterval(running.interval);
      running.voices.forEach(v=>{try{v.source.stop();}catch{}});
      void running.ctx.close().catch(()=>{});
      engine.current=null;playingRef.current=false;
    };
  },[version.id]);
  const metadataDuration=versionLength(version,files);
  useEffect(()=>setDuration(metadataDuration),[metadataDuration,version.id]);
  useEffect(()=>{onPositionChange?.(position);},[position,onPositionChange]);
  useEffect(()=>{
    const running=engine.current;
    if(!running)return;
    const anySolo=version.tracks.some(t=>t.solo);
    version.tracks.forEach(t=>{
      const voice=running.voices.get(t.id);
      if(voice)voice.gain.gain.setTargetAtTime(
        t.muted||(anySolo&&!t.solo)?0:1,running.ctx.currentTime,.012);
    });
  },[version.tracks]);
  const pause=()=>{
    const running=engine.current;
    if(running)posRef.current=Math.max(0,Math.min(running.duration,
      running.from+Math.max(0,running.ctx.currentTime-running.startTime)));
    setPosition(posRef.current);close();
  };
  const play=async(at:number)=>{
    if(playingRef.current||busy)return;
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'){
      setError('Lecture multipiste actuellement disponible sur navigateur Web Audio.');return;
    }
    if(!active.length){setError('Ajoute au moins une piste audio pour écouter la version.');return;}
    setBusy(true);setError('');
    let ctx:AudioContext|null=null;
    try{
      ctx=new AudioContext();await ctx.resume();
      const loaded=await Promise.all(active.map(async t=>{
        const f=files.find(file=>file.id===t.sourceFileId);
        if(!f?.localFileId)throw Error('Enregistrement introuvable : '+t.title);
        const blob=await getDraftAttachment(f.localFileId);
        if(!blob)throw Error('Audio absent de cet appareil : '+t.title);
        const buffer=await ctx!.decodeAudioData(await blob.arrayBuffer());
        return {track:t,buffer};
      }));
      const maximum=Math.max(0,...loaded.map(({track,buffer})=>{
        const start=Math.max(0,track.trimStartSeconds||0);
        const end=Math.min(buffer.duration,track.trimEndSeconds??buffer.duration);
        return Math.max(0,track.offsetSeconds)+Math.max(0,end-start);
      }));
      if(maximum<=0)throw Error('Aucun passage écoutable dans les pistes.');
      const from=at>=maximum?0:Math.max(0,at);
      const startTime=ctx.currentTime+.085;
      const anySolo=version.tracks.some(t=>t.solo);
      const voices=new Map<string,Voice>();
      for(const {track,buffer} of loaded){
        const clipStart=Math.max(0,track.trimStartSeconds||0);
        const clipEnd=Math.min(buffer.duration,track.trimEndSeconds??buffer.duration);
        const starts=Math.max(0,track.offsetSeconds);
        const playAt=Math.max(from,starts);
        const offset=clipStart+Math.max(0,playAt-starts);
        const remaining=clipEnd-offset;
        if(remaining<=0)continue;
        const source=ctx.createBufferSource();
        source.buffer=buffer;
        const gain=ctx.createGain();
        gain.gain.value=track.muted||(anySolo&&!track.solo)?0:1;
        source.connect(gain);gain.connect(ctx.destination);
        source.start(startTime+(playAt-from),offset,remaining);
        voices.set(track.id,{source,gain});
      }
      const running:Engine={ctx,voices,startTime,from,duration:maximum,interval:null};
      engine.current=running;playingRef.current=true;
      setPosition(from);posRef.current=from;setDuration(maximum);setPlaying(true);
      running.interval=setInterval(()=>{
        if(engine.current!==running)return;
        const now=Math.min(maximum,
          from+Math.max(0,ctx!.currentTime-running.startTime));
        posRef.current=now;setPosition(now);
        if(now>=maximum)close(true);
      },60);
    }catch(e){
      if(ctx)void ctx.close().catch(()=>{});
      setError(e instanceof Error?e.message:'Impossible de lire cette version.');
    }finally{setBusy(false);}
  };
  const toggle=()=>{if(playingRef.current)pause();else void play(posRef.current);};
  const seek=(seconds:number)=>{
    const next=Math.max(0,Math.min(duration,seconds));
    const resume=playingRef.current;
    close();posRef.current=next;setPosition(next);
    if(resume)void play(next);
  };
  useEffect(()=>{
    if(!playbackRequest)return;
    close();
    const next=Math.max(0,playbackRequest.at);
    posRef.current=next;setPosition(next);
    void play(next);
  // A new serial is a new explicit backing-track playback request.
  },[playbackRequest?.serial]);
  useEffect(()=>{if(pauseRequest)pause();},[pauseRequest]);
  const timeSignature=version.tracks.map(t=>
    [t.id,t.sourceFileId,t.offsetSeconds,t.trimStartSeconds,t.trimEndSeconds].join(':')).join('|');
  const oldSignature=useRef(timeSignature);
  useEffect(()=>{
    if(oldSignature.current!==timeSignature&&playingRef.current)pause();
    oldSignature.current=timeSignature;
  },[timeSignature]);
  return <View style={{gap:12}}>
    <View style={{paddingHorizontal:4,paddingVertical:5,gap:8}}>
      <View style={{flexDirection:'row',gap:13,alignItems:'center'}}>
        <Pressable onPress={toggle} disabled={busy} accessibilityRole="button"
          accessibilityLabel={playing?'Mettre la version en pause':'Lire la version'}
          style={{width:42,height:42,borderRadius:21,backgroundColor:PINK,
            opacity:busy?.5:1,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name={playing?'pause':'play'} color="#fff" size={21}/>
        </Pressable>
        <View style={{flex:1,gap:2}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}>
            <Text style={{fontSize:13,color:theme.foreground,fontWeight:'700',
              fontVariant:['tabular-nums']}}>
              {musicStampMs(position)} / {musicStampMs(duration)}
            </Text>
            <Pressable onPress={()=>seek(0)} accessibilityLabel="Revenir au début">
              <Ionicons name="play-skip-back-outline" size={19} color={theme.muted}/>
            </Pressable>
          </View>

        </View>
      </View>
      {error?<Text style={{fontSize:11,color:'#B44B61',lineHeight:18}}>{error}</Text>:null}
      {!active.length?<Text style={{fontSize:11,color:theme.muted}}>
        Aucune piste audio écoutable sur cet appareil.
      </Text>:null}
    </View>
    <MusicArrangementTimeline version={version} files={files}
      duration={duration} position={position} onSeek={seek}
      onChangeTrack={onTrackChange} onSelectTrack={onSelectTrack}
      onMarkTrackRange={onMarkTrackRange}
      onRenameTrack={onRenameTrack} onEmojiTrack={onEmojiTrack}
      onRemoveTrack={onRemoveTrack}
      onDropSource={onDropSource}
      onToggleMute={id=>{const t=version.tracks.find(t=>t.id===id);
        if(t)onTrackChange?.(id,{muted:!t.muted});}}
      onToggleSolo={id=>{const t=version.tracks.find(t=>t.id===id);
        if(t)onTrackChange?.(id,{solo:!t.solo});}}/>
  </View>;
}
