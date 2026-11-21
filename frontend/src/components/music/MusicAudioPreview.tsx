import React, { useEffect, useState } from 'react';
import { ActivityIndicator,Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getDraftAudio } from '@/domain/musicLocalStorage';
import { resolveMusicAudio } from '@/domain/musicMedia';
import { useAppTheme } from '@/theme/AppTheme';
import {MusicCapturePlaybackBar} from './MusicCapturePlaybackBar';
import {MusicPeakBars} from './MusicAudioPeaksNext';

type Source = { audioUrl?: string; audioMediaId?: string; localAudioId?: string };
const pink = '#CB245C';

/** Only real uploaded or stored audio is played; missing references are never simulated. */
export function MusicAudioPreview({ source, transcription=false, captureStyle=false }: {
  source: Source; transcription?: boolean; captureStyle?:boolean;
}) {
  const theme = useAppTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let temporary: string | null = null;
    setUri(null);setError('');
    if (!source.audioUrl && !source.audioMediaId && !source.localAudioId) return;
    setLoading(true);
    const read = async () => {
      if (source.localAudioId) {
        const blob = await getDraftAudio(source.localAudioId);
        if (!blob) throw new Error('Enregistrement local introuvable dans ce navigateur.');
        temporary = URL.createObjectURL(blob);
        return temporary;
      }
      if (source.audioMediaId) {
        const value = await resolveMusicAudio(source.audioMediaId);
        if (!value) throw new Error('Enregistrement inaccessible avec cette session.');
        return value;
      }
      return source.audioUrl || null;
    };
    void read().then(result => {if(live)setUri(result);})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Audio indisponible.');})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;if(temporary)URL.revokeObjectURL(temporary);};
  },[source.audioMediaId,source.audioUrl,source.localAudioId]);
  if (error) return <Text style={{color:'#B34D67',fontSize:11}}>{error}</Text>;
  if (loading) return <ActivityIndicator color={pink} size="small"/>;
  if (!uri) return <Text style={{color:theme.muted,fontSize:11}}>Pas d’enregistrement joint.</Text>;
  return <Playback key={uri} uri={uri} transcription={transcription} captureStyle={captureStyle}/>;
}
function fmt(value:number) {
  const safe=Number.isFinite(value)?Math.max(0,value):0;
  return Math.floor(safe/60)+':'+String(Math.floor(safe%60)).padStart(2,'0');
}
function Playback({uri,transcription,captureStyle}:{uri:string;transcription:boolean;captureStyle:boolean}) {
  const theme=useAppTheme();
  const [actualPeaks,setActualPeaks]=useState<number[]>([]);
  useEffect(()=>{
    let live=true;
    if(!captureStyle||Platform.OS!=='web'||typeof AudioContext==='undefined')return;
    const abort=new AbortController();
    void (async()=>{
      // Decode only reasonably-sized real audio. This never invents a waveform;
      // inaccessible streaming sources retain a neutral progress line.
      const response=await fetch(uri,{signal:abort.signal});
      if(!response.ok)return;
      const maximum=12*1024*1024;
      const indicated=Number(response.headers.get('content-length')||0);
      if(indicated>maximum)return;
      let bytes:ArrayBuffer;
      if(response.body){
        const reader=response.body.getReader();
        const chunks:ArrayBuffer[]=[];
        let size=0;
        while(true){
          const {done,value}=await reader.read();
          if(done)break;
          size+=value.byteLength;
          if(size>maximum){await reader.cancel();return;}
          const chunk=new ArrayBuffer(value.byteLength);
          new Uint8Array(chunk).set(value);
          chunks.push(chunk);
        }
        bytes=await new Blob(chunks).arrayBuffer();
      }else bytes=await response.arrayBuffer();
      const context=new AudioContext();
      try{
        const decoded=await context.decodeAudioData(bytes);
        const samples=decoded.getChannelData(0);
        const count=76;
        const peaks=Array.from({length:count},(_,i)=>{
          const lo=Math.floor(i*samples.length/count);
          const hi=Math.floor((i+1)*samples.length/count);
          const stride=Math.max(1,Math.floor((hi-lo)/70));
          let peak=0;
          for(let j=lo;j<hi;j+=stride)peak=Math.max(peak,Math.abs(samples[j]||0));
          return peak;
        });
        if(live)setActualPeaks(peaks);
      }finally{await context.close();}
    })().catch(()=>{/* Playback still works if waveform decoding is not permitted. */});
    return ()=>{live=false;abort.abort();};
  },[uri,captureStyle]);
  const player=useAudioPlayer({uri});
  const status=useAudioPlayerStatus(player);
  const length=status.duration || 0;
  const percent=length?Math.min(1,Math.max(0,status.currentTime/length)):0;
  const toggle=()=>{if(status.playing)player.pause();else{
    if(status.didJustFinish)void player.seekTo(0);
    player.play();
  }};
  if(captureStyle)return <MusicCapturePlaybackBar title="la piste proposée"
    playing={status.playing} onToggle={toggle}
    position={status.currentTime} duration={length}
    waveform={<MusicPeakBars levels={actualPeaks} height={26}
      progress={length>0?status.currentTime/length:0}/>}/>;
  return <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing?'Pause':'Lecture'}
      onPress={()=>{if(status.playing)player.pause();else{
        if(status.didJustFinish)void player.seekTo(0);
        player.play();
      }}} style={{width:38,height:38,borderRadius:19,
      alignItems:'center',justifyContent:'center',backgroundColor:pink}}>
      <Ionicons name={status.playing?'pause':'play'} size={17} color="#fff"/>
    </Pressable>
    {transcription?<Pressable onPress={()=>void player.seekTo(Math.max(0,status.currentTime-5))}
      accessibilityRole="button" accessibilityLabel="Reculer de cinq secondes"
      style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="play-back-outline" size={21} color={theme.foreground}/>
    </Pressable>:null}
    {transcription?<Pressable onPress={()=>void player.seekTo(Math.min(length||Infinity,status.currentTime+5))}
      accessibilityRole="button" accessibilityLabel="Avancer de cinq secondes"
      style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="play-forward-outline" size={21} color={theme.foreground}/>
    </Pressable>:null}
    <View style={{flex:1,gap:7}}>
      <View style={{height:3,borderRadius:2,backgroundColor:theme.border}}>
        <View style={{height:3,borderRadius:2,backgroundColor:pink,width:(percent*100)+'%'}}/>
      </View>
      <Text style={{color:theme.muted,fontSize:10}}>{fmt(status.currentTime)} / {length?fmt(length):'—'}</Text>
    </View>
  </View>;
}
