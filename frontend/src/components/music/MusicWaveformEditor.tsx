import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Rect,Line} from 'react-native-svg';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStamp} from '@/domain/musicEditing';

const PINK='#CB245C';
type Props={file:File;duration:number;cursor:number;onSeek:(seconds:number)=>void;
  zoom:number;onZoom:(zoom:number)=>void};
export function MusicWaveformEditor({file,duration,cursor,onSeek,zoom,onZoom}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const viewport=Math.min(650,Math.max(260,width-72));
  const px=Math.max(viewport,Math.ceil(duration*([22,75,175][zoom]||22)));
  const [data,setData]=useState<Float32Array|null>(null);
  const [decoding,setDecoding]=useState(false);
  useEffect(()=>{
    let live=true;
    setData(null);setDecoding(true);
    if(typeof AudioContext==='undefined')return;
    void (async()=>{
      const ctx=new AudioContext();
      try{
        const buf=await ctx.decodeAudioData(await file.arrayBuffer());
        if(live)setData(buf.getChannelData(0).slice());
      }finally{await ctx.close();}
    })().catch(()=>{}).finally(()=>{if(live)setDecoding(false);});
    return ()=>{live=false;};
  },[file]);
  const bars=useMemo(()=>{
    if(!data||!data.length)return [] as number[];
    const count=Math.min(3500,Math.max(48,Math.round(px/3.2)));
    const stride=Math.max(1,Math.floor(data.length/(count*28)));
    return Array.from({length:count},(_,i)=>{
      const start=Math.floor(i*data.length/count);
      const end=Math.floor((i+1)*data.length/count);
      let peak=0;
      for(let s=start;s<end;s+=stride)peak=Math.max(peak,Math.abs(data[s]||0));
      return Math.max(.025,peak);
    });
  },[data,px]);
  const ticks=Array.from({length:Math.min(400,Math.ceil(duration/5)+1)},(_,i)=>i*5)
    .filter(sec=>sec<=duration);
  const seek=(locationX:number)=>onSeek(Math.max(0,Math.min(duration,
    Math.round((locationX/px*duration)*100)/100)));
  const marker=Math.min(px-1,Math.max(0,cursor/Math.max(duration,.001)*px));
  return <View style={{gap:9}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
      <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
        Reprendre à {musicStamp(cursor)}
      </Text>
      <View style={{flexDirection:'row',gap:12}}>
        <Pressable onPress={()=>onZoom(Math.max(0,zoom-1))} accessibilityLabel="Réduire le zoom"
          disabled={zoom===0}><Text style={{color:zoom?PINK:theme.muted,fontSize:12}}>−</Text></Pressable>
        <Text style={{fontSize:11,color:theme.muted}}>Zoom ×{[1,4,9][zoom]}</Text>
        <Pressable onPress={()=>onZoom(Math.min(2,zoom+1))} accessibilityLabel="Agrandir le zoom"
          disabled={zoom===2}><Text style={{color:zoom<2?PINK:theme.muted,fontSize:12}}>+</Text></Pressable>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled"
      style={{maxWidth:'100%',backgroundColor:theme.dark?'#26232A':'#FCF7F5',
        borderRadius:13,borderWidth:1,borderColor:theme.border}}>
      <Pressable onPress={e=>seek(e.nativeEvent.locationX)}
        accessibilityRole="adjustable" accessibilityLabel="Position de reprise sur la forme d’onde"
        style={{width:px,height:100,justifyContent:'center'}}>
        <Svg width={px} height={100} viewBox={'0 0 '+px+' 100'}>
          <Line x1={0} y1={51} x2={px} y2={51} stroke={theme.border} strokeWidth={1}/>
          {bars.map((v,i)=>{
            const w=px/bars.length;
            return <Rect key={i} x={i*w+.5} y={51-v*34} width={Math.max(1,w-1)}
              height={Math.max(2,v*68)} rx={1} fill={PINK} opacity={.7}/>;
          })}
          {ticks.map(sec=>{
            const x=sec/Math.max(duration,.001)*px;
            return <Line key={sec} x1={x} y1={0} x2={x} y2={9}
              stroke={theme.muted} strokeWidth={1}/>;
          })}
          <Line x1={marker} y1={11} x2={marker} y2={99} stroke={theme.foreground}
            strokeWidth={2}/>
        </Svg>
      </Pressable>
    </ScrollView>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Pressable onPress={()=>onSeek(Math.max(0,Math.round((cursor-.01)*100)/100))}
        style={{paddingVertical:7,paddingHorizontal:10}}>
        <Text style={{color:PINK,fontSize:11}}>− 0,01 s</Text>
      </Pressable>
      <Text style={{color:theme.muted,fontSize:10}}>
        {decoding?'Analyse de la forme d’onde…':'Touchez ou parcourez pour choisir un point'}
      </Text>
      <Pressable onPress={()=>onSeek(Math.min(duration,Math.round((cursor+.01)*100)/100))}
        style={{paddingVertical:7,paddingHorizontal:10}}>
        <Text style={{color:PINK,fontSize:11}}>+ 0,01 s</Text>
      </Pressable>
    </View>
  </View>;
}
