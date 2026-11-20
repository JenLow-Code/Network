import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {renderMidiPreviewWav} from '@/domain/musicMidiAudio';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';

/** On-demand MIDI audio preview, with no persistent derivative or source edit.
 * AudioContext is resumed directly from the user gesture (mobile autoplay).
 * The same offline WAV renderer powers actual rendered tracks in Créer.
 */
export function MusicMidiPreview({file,iconOnly=false,onPlaybackSeconds}:{
  file:MusicProjectFile;
  iconOnly?:boolean;
  onPlaybackSeconds?:(seconds:number|null)=>void;
}){
  const theme=useAppTheme();
  const [mode,setMode]=useState<'idle'|'loading'|'playing'>('idle');
  const [error,setError]=useState('');
  const ctxRef=useRef<AudioContext|null>(null);
  const sourceRef=useRef<AudioBufferSourceNode|null>(null);
  const bufferRef=useRef<AudioBuffer|null>(null);
  const busyRef=useRef(false);
  const tickRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const callbackRef=useRef(onPlaybackSeconds);
  callbackRef.current=onPlaybackSeconds;
  const aliveRef=useRef(true);
  const stop=()=>{
    if(tickRef.current)clearInterval(tickRef.current);
    tickRef.current=null;callbackRef.current?.(null);
    const active=sourceRef.current;sourceRef.current=null;
    if(active){active.onended=null;try{active.stop();}catch{}active.disconnect();}
    setMode('idle');
  };
  useEffect(()=>{
    aliveRef.current=true;
    return ()=>{
      aliveRef.current=false;
      if(tickRef.current)clearInterval(tickRef.current);
      tickRef.current=null;
      const source=sourceRef.current;
      if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();}
      sourceRef.current=null;
      const ctx=ctxRef.current;ctxRef.current=null;
      if(ctx)void ctx.close().catch(()=>{});
    };
  },[]);
  useEffect(()=>{
    bufferRef.current=null;
    if(sourceRef.current)stop();
  },[file.musicEvents,file.tempoBpm,file.instrumentTone,
    file.instrumentSampleLocalId,file.localFileId]);
  const toggle=()=>{
    if(mode==='playing'){stop();return;}
    if(busyRef.current)return;
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'){
      setError('Préécoute MIDI disponible sur navigateur Web Audio.');
      return;
    }
    setError('');setMode('loading');busyRef.current=true;
    try{
      const ctx=ctxRef.current||new AudioContext();
      ctxRef.current=ctx;
      // Resume before awaiting conversion to preserve the user interaction.
      const resumed=ctx.resume();
      void (async()=>{
        await resumed;
        if(!bufferRef.current){
          const wav=await renderMidiPreviewWav(file);
          bufferRef.current=await ctx.decodeAudioData(await wav.arrayBuffer());
        }
        if(!aliveRef.current)return;
        const playback=ctx.createBufferSource();
        playback.buffer=bufferRef.current;
        playback.connect(ctx.destination);
        playback.onended=()=>{
          if(sourceRef.current===playback){
            if(tickRef.current)clearInterval(tickRef.current);
            tickRef.current=null;callbackRef.current?.(null);
            sourceRef.current=null;setMode('idle');
          }
        };
        sourceRef.current=playback;
        const startedAt=ctx.currentTime;
        playback.start();setMode('playing');
        callbackRef.current?.(0);
        tickRef.current=setInterval(()=>{
          callbackRef.current?.(Math.max(0,ctx.currentTime-startedAt));
        },65);
      })().catch(e=>{
        if(aliveRef.current){
          setError(e instanceof Error?e.message:'Impossible d’écouter ce MIDI.');
          setMode('idle');
        }
      }).finally(()=>{busyRef.current=false;});
    }catch(e){
      busyRef.current=false;setMode('idle');
      setError(e instanceof Error?e.message:'Audio indisponible.');
    }
  };
  return <View style={{gap:3,alignItems:'flex-start'}}>
    <Pressable onPress={toggle} accessibilityRole="button"
      accessibilityLabel={mode==='playing'?'Arrêter la préécoute MIDI':'Écouter le MIDI converti en audio'}
      disabled={mode==='loading'}
      style={iconOnly?{width:44,height:44,justifyContent:'center',
        alignItems:'center'}:{minHeight:43,flexDirection:'row',alignItems:'center',
        gap:7,paddingVertical:6,paddingHorizontal:4}}>
      {mode==='loading'?<ActivityIndicator color={PINK} size="small"/>:
        <Ionicons name={mode==='playing'?'stop-circle-outline':'play-circle-outline'}
          color={PINK} size={19}/>}
      {!iconOnly?<Text style={{fontSize:12,fontWeight:'600',color:PINK}}>
        {mode==='loading'?'Création de l’audio…':
          mode==='playing'?'Arrêter':'Écouter'}
      </Text>:null}
    </Pressable>
    {error?<Text style={{fontSize:11,color:theme.muted}}>{error}</Text>:null}
  </View>;
}
