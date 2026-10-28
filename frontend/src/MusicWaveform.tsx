import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';

const files=[
 require('../assets/audio/pierre-01-douceur.wav'),
 require('../assets/audio/pierre-02-esperance.wav'),
 require('../assets/audio/pierre-03-lumiere.wav')
] as const;
const heights=[12,26,42,20,55,70,35,19,48,28,61,43,17,31,57,24,15,44,34,21,48,64,27,19,47,34,58,25,18,39,30,13];
export function MusicWaveform({index,renderLayout}:{index:0|1|2;renderLayout?:(button:React.ReactNode,wave:React.ReactNode,time:number,seek:(seconds:number)=>void)=>React.ReactNode}){
 const player=useAudioPlayer(files[index]);
 const status=useAudioPlayerStatus(player);
 const play=()=>{
  if(status.playing){player.pause();return}
  if(status.didJustFinish)void player.seekTo(0);
  player.play();
 };
 const progress=status.duration>0?Math.min(1,status.currentTime/status.duration):0;
 const time=(n:number)=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const button=<Pressable onPress={play} accessibilityLabel={status.playing?'Pause':'Écouter'} style={{width:56,height:56,borderRadius:28,backgroundColor:'#CB245C',alignItems:'center',justifyContent:'center'}}><Ionicons name={status.playing?'pause':'play'} size={26} color="#fff"/></Pressable>;
 const waveform=
  <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
   {!renderLayout?button:null}
   <View style={{flex:1}}>
    <View style={{height:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:2}}>
     {heights.map((h,i)=><Pressable key={i} onPress={()=>{if(status.duration>0)void player.seekTo(status.duration*i/heights.length)}} style={{flex:1,alignItems:'center',justifyContent:'center',height:34}}><View style={{width:'100%',maxWidth:3,height:Math.max(4,h*.46),borderRadius:5,backgroundColor:i/heights.length<=progress?'#CB245C':'#B8B3B5'}}/></Pressable>)}
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:1}}>
     <Text style={{fontSize:11,color:'#666'}}>{time(status.currentTime)}</Text>
     <Text style={{fontSize:11,color:'#666'}}>{time(status.duration)}</Text>
    </View>
   </View>
  </View>;
 return renderLayout? <>{renderLayout(button,waveform,status.currentTime,(seconds:number)=>{void player.seekTo(seconds)})}</>:waveform;
}
