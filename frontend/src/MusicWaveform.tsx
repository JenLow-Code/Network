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
 return <View style={{marginTop:16,gap:10}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
   <Pressable accessibilityLabel={status.playing?'Pause':'Écouter'} accessibilityRole="button" onPress={play} style={{width:42,height:42,borderRadius:21,backgroundColor:'#222',alignItems:'center',justifyContent:'center'}}>
    <Ionicons name={status.playing?'pause':'play'} size={21} color="#fff"/>
   </Pressable>
   <View style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:80,overflow:'hidden'}}>
    {heights.map((h,i)=><View key={i} style={{width:'2%',height:h,borderRadius:3,backgroundColor:i/heights.length<=progress?'#CB245C':'#B9B9B9'}}/>)}
   </View>
  </View>
  <Text style={{fontSize:11,color:'#888'}}>{Math.floor(status.currentTime/60)}:{String(Math.floor(status.currentTime%60)).padStart(2,'0')} / {Math.floor(status.duration/60)}:{String(Math.floor(status.duration%60)).padStart(2,'0')}</Text>
 </View>;
}
