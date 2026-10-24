import React,{useState} from 'react';
import {ImageBackground,Pressable,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {router} from 'expo-router';
import {Publication,PHASE_COLORS,verseExcerpt} from './discoveryData';
const audio=[require('../assets/audio/pierre-01-douceur.wav'),require('../assets/audio/pierre-02-esperance.wav'),require('../assets/audio/pierre-03-lumiere.wav')];
export const publicationPath=(p:Publication)=>p.type==='dream'?({pathname:'/dream/[id]',params:{id:p.id}} as const):p.type==='music'?({pathname:'/music/[id]',params:{id:p.id}} as const):({pathname:'/bible/[reference]',params:{reference:p.referenceId,verse:String(p.highlightedVerse)}} as const);
function MusicCard({index}:{index:0|1|2}){const player=useAudioPlayer(audio[index]);const status=useAudioPlayerStatus(player);const toggle=()=>{if(status.playing)player.pause();else{if(status.didJustFinish)void player.seekTo(0);player.play()}};return <Pressable onPress={toggle} accessibilityLabel={status.playing?'Pause sample':'Play 8 second sample'} style={s.play}><Ionicons name={status.playing?'pause':'play'} size={23} color="#fff"/></Pressable>}
export function PublicationTile({item}:{item:Publication}){
 const [loaded,setLoaded]=useState(false);
 const open=()=>router.push(publicationPath(item) as any);
 return <Pressable onPress={open} accessibilityLabel={'Open '+item.title} style={[s.outer,{height:item.type==='bible'?230:item.type==='music'?250:285}]}>
  <ImageBackground source={{uri:item.image}} onLoad={()=>setLoaded(true)} resizeMode="cover" style={s.image} imageStyle={{borderRadius:12}}>
   <View style={s.shade}/>
   <View style={s.top}><Text style={s.type}>{item.type==='dream'?'RÊVE':item.type==='music'?'MUSIQUE':'BIBLE'}</Text></View>
   <View style={s.bottom}>
    {item.type==='dream'?<View style={[s.phase,{backgroundColor:PHASE_COLORS[item.phase].background}]}><Text style={{color:PHASE_COLORS[item.phase].foreground,fontSize:9,fontWeight:'700'}}>{item.phase.toUpperCase()}</Text></View>:null}
    {item.type==='bible'?<Text numberOfLines={4} style={s.verse}>{verseExcerpt(item)}</Text>:null}
    <Text style={s.title} numberOfLines={3}>{item.title}</Text>
    <Text style={s.author}>{item.author}</Text>
   </View>
  </ImageBackground>
  {item.type==='music'?<MusicCard index={item.audioIndex}/>:null}
 </Pressable>;
}
export function PublicationGallery({items}:{items:Publication[]}){return <View style={s.gallery}>{[0,1].map(col=><View key={col} style={{flex:1,gap:11}}>{items.filter((_,i)=>i%2===col).map(item=><PublicationTile key={item.id} item={item}/>)}</View>)}</View>}
const s=StyleSheet.create({gallery:{flexDirection:'row',gap:11,alignItems:'flex-start'},outer:{borderRadius:12,overflow:'hidden',backgroundColor:'#e9e9e9',position:'relative'},image:{width:'100%',height:'100%',justifyContent:'space-between'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.44)',borderRadius:12},top:{padding:10},type:{fontSize:10,color:'#fff',fontWeight:'700',letterSpacing:.6},bottom:{padding:10,gap:6},phase:{alignSelf:'flex-start',paddingHorizontal:7,paddingVertical:4,borderRadius:5},title:{color:'#fff',fontSize:15,fontWeight:'700',lineHeight:19},author:{color:'#eee',fontSize:11},verse:{fontSize:12,color:'#fff',lineHeight:18,fontWeight:'500'},play:{position:'absolute',top:10,right:9,borderRadius:27,width:36,height:36,backgroundColor:'rgba(0,0,0,.52)',alignItems:'center',justifyContent:'center'}});
