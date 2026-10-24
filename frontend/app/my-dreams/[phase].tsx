import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {DREAM_PHASES,dreams,DreamPhase,PHASE_COLORS} from '@/discoveryData';
export default function Stage(){
 const {phase}=useLocalSearchParams<{phase:string}>(); const current=DREAM_PHASES.find(s=>s===phase) as DreamPhase|undefined;
 const items=dreams.filter(d=>d.phase===current);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1}}><ScrollView contentContainerStyle={{padding:18}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,marginVertical:12}}>{current||'Mes rêves'}</Text>
  {items.map(d=><Pressable key={d.id} onPress={()=>router.push({pathname:'/my-dream/[id]',params:{id:d.id}})} style={{borderWidth:1,borderColor:'#eee',borderRadius:13,marginBottom:12,padding:10,flexDirection:'row',alignItems:'center',gap:12}}>
   <Image source={{uri:d.image}} style={{width:90,height:88,borderRadius:9}}/>
   <View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:14}}>{d.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:7}}>{d.phase}</Text></View><Ionicons name="chevron-forward" size={20} color="#888"/>
  </Pressable>)}
  {items.length===0&&<Text style={{color:'#888'}}>Pas encore de rêve dans cette phase.</Text>}
  <Text style={{fontSize:11,color:'#999',marginTop:15}}>Exemples de démonstration : espace de travail personnel.</Text>
 </ScrollView></View><Nav/></SafeAreaView>;
}