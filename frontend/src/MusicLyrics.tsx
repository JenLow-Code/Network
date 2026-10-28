import React,{useEffect,useMemo,useRef} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
export type TimedLyric={time:number;text:string};
/** Copyable, all-at-once lyrics; independent of the synchronized preview. */
export function FullMusicLyrics({lines=[]}:{lines?:TimedLyric[]}){
 const ordered=[...lines].sort((a,b)=>a.time-b.time);
 return <View style={{paddingVertical:12,paddingHorizontal:7}}><Text selectable style={{fontSize:15,lineHeight:25,color:'#333'}}>{ordered.length?ordered.map(x=>x.text).join('\n'):'Paroles non disponibles pour cet enregistrement.'}</Text></View>;
}
export function MusicLyrics({lines=[],currentTime,onSeek}:{lines?:TimedLyric[];currentTime:number;onSeek:(seconds:number)=>void}){
 const scroll=useRef<ScrollView>(null);
 const positions=useRef<Record<number,number>>({});
 const sorted=useMemo(()=>[...lines].sort((a,b)=>a.time-b.time),[lines]);
 const active=sorted.reduce((index,line,i)=>currentTime>=line.time?i:index,-1);
 useEffect(()=>{if(active>=0&&positions.current[active]!==undefined)scroll.current?.scrollTo({y:Math.max(0,positions.current[active]-75),animated:true})},[active]);
 if(!sorted.length)return <View style={{paddingVertical:14,paddingHorizontal:7}}><Text style={{fontSize:13,color:'#777'}}>Paroles non disponibles pour cet enregistrement.</Text></View>;
 return <ScrollView ref={scroll} nestedScrollEnabled style={{maxHeight:220}} contentContainerStyle={{paddingVertical:20,paddingBottom:60,gap:15}} showsVerticalScrollIndicator={false}>
  {sorted.map((line,i)=><Pressable key={i} onLayout={e=>{positions.current[i]=e.nativeEvent.layout.y}} onPress={()=>onSeek(line.time)} accessibilityLabel={`Aller à ${line.text}`}>
   <Text style={{fontSize:20,lineHeight:27,fontWeight:i===active?'700':'500',color:i===active?'#CB245C':'#999',opacity:i===active?1:0.72}}>{line.text}</Text>
  </Pressable>)}
 </ScrollView>;
}
