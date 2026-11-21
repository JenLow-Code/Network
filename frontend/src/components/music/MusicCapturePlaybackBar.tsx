import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';

const PINK='#CB245C';
const displayTime=(seconds:number)=>{
  const value=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
  return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');
};

/** Shared compact player appearance for Capture, real collaboration tracks
 * and the explicitly labelled synthetic collaboration demo.
 * The waveform content is supplied by each real or synthetic source. */
export function MusicCapturePlaybackBar({
  playing,onToggle,position,duration,waveform,title,disabled=false,
}:{
  playing:boolean;
  onToggle:()=>void;
  position:number;
  duration:number;
  waveform:React.ReactNode;
  title:string;
  disabled?:boolean;
}){
  const theme=useAppTheme();
  return <View style={{flexDirection:'row',alignItems:'center',gap:10,
    minHeight:38,width:'100%'}}>
    <Pressable onPress={onToggle} accessibilityRole="button"
      accessibilityLabel={(playing?'Pause ':'Écouter ')+title}
      disabled={disabled}
      style={{width:34,height:38,alignItems:'center',
        justifyContent:'center',flexShrink:0,opacity:disabled?.45:1}}>
      <Ionicons name={playing?'pause-circle-outline':'play-circle-outline'}
        size={21} color={PINK}/>
    </Pressable>
    <View style={{flex:1,minWidth:0,justifyContent:'center'}}>
      {waveform}
    </View>
    <Text style={{fontSize:10,color:theme.muted,fontVariant:['tabular-nums'],
      minWidth:65,textAlign:'right'}}>
      {displayTime(position)} / {duration?displayTime(duration):'—'}
    </Text>
  </View>;
}
