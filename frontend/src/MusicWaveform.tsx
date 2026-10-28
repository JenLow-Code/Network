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
export function MusicWaveform({index}:{index:0|1|2}){
 const player=useAudioPlayer(files[index]);
 const status=useAudioPlayerStatus(player);
 const play=()=>{
  if(status.playing){player.pause();return}
  if(status.didJustFinish)void player.seekTo(0);
  player.play();
 };
 const progress=status.duration>0?Math.min(1,status.currentTime/status.duration):0;
 const time=(n:number)=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 return <View style={{marginTop:4,marginBottom:8,gap:6}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
   <Pressable onPress={play} accessibilityLabel={status.playing?'Pause':'Écouter'} style={{width:32,height:32,borderRadius:16,backgroundColor:'#CB245C',alignItems:'center',justifyContent:'center'}}>
    <Ionicons name={status.playing?'pause':'play'} size={16} color="#fff"/>
   </Pressable>
   <View style={{flex:1}}>
    <View style={{height:34,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:2}}>
     {heights.map((h,i)=><Pressable key={i} onPress={()=>{if(status.duration>0)void player.seekTo(status.duration*i/heights.length)}} style={{flex:1,alignItems:'center',justifyContent:'center',height:34}}><View style={{width:'100%',maxWidth:3,height:Math.max(3,h*.4),borderRadius:5,backgroundColor:i/heights.length<=progress?'#CB245C':'#B8B3B5'}}/></Pressable>)}
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:1}}>
     <Text style={{fontSize:11,color:'#666'}}>{time(status.currentTime)}</Text>
     <Text style={{fontSize:11,color:'#666'}}>{time(status.duration)}</Text>
    </View>
   </View>
  </View>
 </View>;
}
