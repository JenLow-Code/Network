import React,{useMemo} from 'react';
import {Pressable,Text,View} from 'react-native';

export type TimedLyric={time:number;text:string};

/** Copyable, all-at-once lyrics; independent of the synchronized preview. */
export function FullMusicLyrics({lines=[]}:{lines?:TimedLyric[]}){
 const ordered=[...lines].sort((a,b)=>a.time-b.time);
 return <View style={{paddingVertical:12,paddingHorizontal:7}}>
  <Text selectable style={{fontSize:15,lineHeight:25,color:'#333'}}>
   {ordered.length?ordered.map(x=>x.text).join('\n'):'Paroles non disponibles pour cet enregistrement.'}
  </Text>
 </View>;
}

/**
 * Exactly three lyric lines: previous / current / next.
 * The centre line changes with playback; only an active line is magenta.
 * Keep three fixed slots at the start and end of the recording to avoid jumping.
 */
export function MusicLyrics({lines=[],currentTime,onSeek}:{lines?:TimedLyric[];currentTime:number;onSeek:(seconds:number)=>void}){
 const sorted=useMemo(()=>[...lines].sort((a,b)=>a.time-b.time),[lines]);
 const active=sorted.reduce((index,line,i)=>currentTime>=line.time?i:index,-1);
 if(!sorted.length)return <View style={{paddingVertical:14,paddingHorizontal:7}}>
  <Text style={{fontSize:13,color:'#777'}}>Paroles non disponibles pour cet enregistrement.</Text>
 </View>;
 const centre=Math.max(0,active);
 return <View style={{paddingVertical:12,paddingHorizontal:7,gap:3}}>
  {[-1,0,1].map(offset=>{
   const index=centre+offset;
   const line=sorted[index];
   if(!line)return <View key={offset} style={{minHeight:44}}/>;
   const highlighted=index===active;
   return <Pressable key={offset} onPress={()=>onSeek(line.time)}
    accessibilityRole="button" accessibilityLabel={`Aller à : ${line.text}`}
    style={{minHeight:44,justifyContent:'center'}}>
    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}
     style={{fontSize:19,lineHeight:25,fontWeight:highlighted?'700':'500',color:highlighted?'#CB245C':'#999'}}>
     {line.text}
    </Text>
   </Pressable>;
  })}
 </View>;
}
