import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {DREAM_PHASES,PHASE_COLORS,dreams,DreamPhase} from '@/discoveryData';
const descriptions:Record<DreamPhase,string>={
 'Rêve':'Des idées à faire naître','Initiation':'Rassembler les talents',
 'Croissance':'Les rêves prennent forme','Témoignage':'Partager les fruits'
};
export default function MyDreams(){
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1}}>
 <ScrollView contentContainerStyle={{padding:18,paddingBottom:48}}>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:38,color:'#181818',marginBottom:8}}>Mes rêves</Text>
  <Text style={{fontSize:12,color:'#888',marginBottom:21}}>Un espace pour faire grandir tes rêves.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
  {DREAM_PHASES.map((phase,index)=><Pressable key={phase} onPress={()=>router.push({pathname:'/my-dreams/[phase]',params:{phase}})} style={{width:'48%',minHeight:154,backgroundColor:PHASE_COLORS[phase].background,borderRadius:12,padding:15,justifyContent:'space-between'}}>
   <Ionicons name={index===0?'ellipse-outline':index===1?'leaf-outline':index===2?'trending-up-outline':'sunny-outline'} size={25} color={PHASE_COLORS[phase].foreground}/>
   <View><Text style={{fontSize:17,fontWeight:'700',color:'#222'}}>{phase}</Text><Text style={{fontSize:11,color:'#555',marginTop:5}}>{descriptions[phase]}</Text></View>
  </Pressable>)}</View>
 </ScrollView></View><Nav/></SafeAreaView>;
}