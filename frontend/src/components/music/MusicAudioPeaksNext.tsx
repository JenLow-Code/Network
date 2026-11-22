import React,{useEffect,useMemo,useState} from 'react';
import Svg,{Defs,ClipPath,Rect,Path,Line} from 'react-native-svg';
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
    // Extract real per-window peaks from every channel. A quiet voice should
    // not disappear because the source was recorded at a low input gain.
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>
      buffer.getChannelData(i));
    const sampleCount=buffer.length;
    const count=4096;
    const peaks=Array.from({length:count},(_,i)=>{
      const start=Math.floor(i*sampleCount/count);
      const end=Math.min(sampleCount,Math.max(start+1,
        Math.floor((i+1)*sampleCount/count)));
      const stride=Math.max(1,Math.floor((end-start)/120));
      let level=0;
      for(let j=start;j<end;j+=stride)
        for(const channel of channels)
          level=Math.max(level,Math.abs(channel[j]||0));
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
export function MusicPeakBars({levels,height=34,muted=false,progress,detailed=false}:{
  levels:number[];height?:number;muted?:boolean;
  /** Real playback fraction; omitted for live recording. */
  progress?:number;detailed?:boolean;
}){
  const theme=useAppTheme();
  if(detailed)return <MusicDensePeakBars levels={levels} height={height}
    muted={muted} progress={progress}/>;
  return <View accessibilityLabel="Forme d’onde audio"
    style={{height,flexDirection:'row',alignItems:'center',gap:1,
      flex:1,justifyContent:'space-between',overflow:'hidden'}}>
    {levels.length?levels.map((value,i)=>{
      const portion=progress===undefined?undefined:
        Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
      const played=portion!==undefined&&i<(portion*levels.length);
      return <View key={i}
        style={{flex:1,maxWidth:8,
          height:Math.max(2,Math.min(height-2,2+value*(height-4))),
          borderRadius:1,
          backgroundColor:portion===undefined?
            (muted?theme.muted:PINK):
            played?PINK:(theme.dark?'#77747B':'#C9C6C8'),
          opacity:portion===undefined?(muted?.35:.77):played?.9:.85}}/>;
    }):
      <View style={{height:2,backgroundColor:theme.border,flex:1,borderRadius:1}}/>}
  </View>;
}
/** Dense, actual-audio waveform: subpixel-width bars share a continuous
 * center line, as in the recorder/editor. The overlay masks the played portion
 * without replacing peaks with synthetic data or spaced dashes. */
function MusicDensePeakBars({levels,height,progress,muted=false}:{
  levels:number[];height:number;progress?:number;muted?:boolean;
}){
  const theme=useAppTheme();
  const [width,setWidth]=useState(0);
  const clipId=React.useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const geometry=useMemo(()=>{
    if(!width||!levels.length)return '';
    const pitch=1.2;
    const count=Math.max(1,Math.floor(width/pitch));
    const peaks=Array.from({length:count},(_,i)=>{
      const lo=Math.floor(i*levels.length/count);
      const hi=Math.min(levels.length,Math.ceil((i+1)*levels.length/count));
      let level=0;
      for(let j=lo;j<Math.max(lo+1,hi)&&j<levels.length;j++)
        level=Math.max(level,levels[j]||0);
      return level;
    });
    // Peak normalization for *display only* (never touches the recording).
    // A fixed gain ceiling previously flattened soft recordings into dashes.
    // Use the actual 96th percentile of audible/non-zero peaks; this keeps
    // quiet speech readable while retaining each recording's natural dynamics.
    const audible=peaks.filter(value=>value>0.000002).sort((a,b)=>a-b);
    const reference=audible.length?
      audible[Math.floor((audible.length-1)*.96)]:0;
    const maxHeight=height-1;
    return peaks.map((level,i)=>{
      const ratio=reference>0.000002?
        Math.min(1.5,Math.max(0,level)/reference):0;
      const envelope=Math.pow(Math.min(1,ratio),.66);
      const barHeight=ratio>0?
        Math.min(maxHeight,1.0+envelope*(maxHeight*.78)):0.9;
      const x=(i*pitch).toFixed(2);
      const top=((height-barHeight)/2).toFixed(2);
      return `M${x} ${top} h0.96 v${barHeight.toFixed(2)} h-0.96 Z`;
    }).join(' ');
  },[levels,width,height]);
  const playback=Math.max(0,Math.min(1,
    Number.isFinite(progress??0)?(progress??0):0));
  const unplayed=theme.dark?'#B9B7BA':'#777579';
  return <View accessibilityLabel="Forme d’onde détaillée de l’enregistrement"
    onLayout={event=>{
      const next=Math.round(event.nativeEvent.layout.width);
      if(next>0)setWidth(current=>current===next?current:next);
    }}
    style={{width:'100%',height,justifyContent:'center',overflow:'hidden'}}>
    {width>0&&geometry?
      <Svg width={width} height={height}
        viewBox={`0 0 ${width} ${height}`}>
        <Defs><ClipPath id={clipId}>
          <Rect x={0} y={0} width={width*playback} height={height}/>
        </ClipPath></Defs>
        <Line x1={0} y1={height/2} x2={width} y2={height/2}
          stroke={unplayed} strokeWidth={.55} opacity={.45}/>
        <Path d={geometry} fill={muted?theme.muted:unplayed}
          opacity={muted?.4:.95}/>
        {progress!==undefined?<Path d={geometry} clipPath={`url(#${clipId})`}
          fill={PINK} opacity={.95}/>:null}
      </Svg>:
      <View style={{height:1,backgroundColor:theme.border}}/>}
  </View>;
}
type Props={file?:MusicProjectFile;muted?:boolean;height?:number;
  trimStartSeconds?:number;trimEndSeconds?:number;barCount?:number;
  progress?:number;detailed?:boolean};
/** Actual decoded audio peaks, optionally limited to the selected (non-destructive) clip. */
export function MusicAudioPeaks({file,muted=false,height=25,
  trimStartSeconds=0,trimEndSeconds,barCount=48,progress,detailed=false}:Props){
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
    const count=Math.max(8,Math.min(detailed?2048:500,barCount));
    return Array.from({length:count},(_,i)=>{
      const lo=Math.floor((begin+(end-begin)*i/count)/data.duration*total);
      const hi=Math.min(total,Math.ceil((begin+(end-begin)*(i+1)/count)/data.duration*total));
      let peak=0;
      for(let j=lo;j<Math.max(lo+1,hi)&&j<total;j++)peak=Math.max(peak,data.peaks[j]||0);
      return peak;
    });
  },[data,trimStartSeconds,trimEndSeconds,barCount]);
  if(detailed)return <MusicDensePeakBars levels={levels}
    muted={muted} height={height} progress={progress}/>;
  return <MusicPeakBars levels={levels} muted={muted} height={height}
    progress={progress}/>;
}
