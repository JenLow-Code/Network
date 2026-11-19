import React,{useEffect,useMemo,useState} from 'react';
import {Platform,View} from 'react-native';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type PeakData={duration:number;peaks:number[]};
/** Reuse extracted peaks across zoom/trim edits without decoding audio for every drag frame. */
const cache=new Map<string,Promise<PeakData>>();
async function extract(id:string):Promise<PeakData>{
  const blob=await getDraftAttachment(id);
  if(!blob)throw Error('Audio absent');
  const ctx=new AudioContext();
  try{
    const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples=buffer.getChannelData(0);
    const count=2048;
    const peaks=Array.from({length:count},(_,i)=>{
      const start=Math.floor(i*samples.length/count);
      const end=Math.floor((i+1)*samples.length/count);
      const stride=Math.max(1,Math.floor((end-start)/80));
      let level=0;
      for(let j=start;j<end;j+=stride)level=Math.max(level,Math.abs(samples[j]||0));
      return level;
    });
    return {duration:buffer.duration,peaks};
  }finally{await ctx.close();}
}
function getPeaks(id:string){
  if(!cache.has(id)){
    if(cache.size>=24)cache.delete(cache.keys().next().value!);
    cache.set(id,extract(id).catch(e=>{cache.delete(id);throw e;}));
  }
  return cache.get(id)!;
}
/** Same visual language for live recorder and recorded timeline clips. */
export function MusicPeakBars({levels,height=34,muted=false}:{
  levels:number[];height?:number;muted?:boolean;
}){
  const theme=useAppTheme();
  return <View accessibilityLabel="Forme d’onde audio"
    style={{height,flexDirection:'row',alignItems:'center',gap:1,
      flex:1,justifyContent:'space-between',overflow:'hidden'}}>
    {levels.length?levels.map((value,i)=><View key={i}
      style={{flex:1,maxWidth:8,
        height:Math.max(2,Math.min(height-2,2+value*(height-4))),
        borderRadius:1,backgroundColor:muted?theme.muted:PINK,
        opacity:muted?.35:.77}}/>):
      <View style={{height:2,backgroundColor:theme.border,flex:1,borderRadius:1}}/>}
  </View>;
}
type Props={file?:MusicProjectFile;muted?:boolean;height?:number;
  trimStartSeconds?:number;trimEndSeconds?:number;barCount?:number};
/** Actual decoded audio peaks, optionally limited to the selected (non-destructive) clip. */
export function MusicAudioPeaks({file,muted=false,height=25,
  trimStartSeconds=0,trimEndSeconds,barCount=48}:Props){
  const [data,setData]=useState<PeakData|null>(null);
  useEffect(()=>{
    let live=true;setData(null);
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'||!file?.localFileId)return;
    void getPeaks(file.localFileId).then(value=>{if(live)setData(value);}).catch(()=>{});
    return()=>{live=false;};
  },[file?.localFileId]);
  const levels=useMemo(()=>{
    if(!data||!data.duration)return [] as number[];
    const begin=Math.max(0,Math.min(data.duration,trimStartSeconds));
    const end=Math.max(begin,Math.min(data.duration,trimEndSeconds??data.duration));
    const total=data.peaks.length;
    const count=Math.max(8,Math.min(500,barCount));
    return Array.from({length:count},(_,i)=>{
      const lo=Math.floor((begin+(end-begin)*i/count)/data.duration*total);
      const hi=Math.min(total,Math.ceil((begin+(end-begin)*(i+1)/count)/data.duration*total));
      let peak=0;
      for(let j=lo;j<Math.max(lo+1,hi)&&j<total;j++)peak=Math.max(peak,data.peaks[j]||0);
      return peak;
    });
  },[data,trimStartSeconds,trimEndSeconds,barCount]);
  return <MusicPeakBars levels={levels} muted={muted} height={height}/>;
}
