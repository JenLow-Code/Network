import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {DREAM_PHASES,DreamPhase,PHASE_COLORS} from '@/discoveryData';
import {useDreams} from '@/domain/dreamRepository';
export default function Stage(){
 const {phase}=useLocalSearchParams<{phase:string}>();
 const current=DREAM_PHASES.find(x=>x===phase) as DreamPhase|undefined;
 const {items}=useDreams();
 const filtered=items.filter(x=>x.phase===current);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:18}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,marginVertical:10}}>{current||'Mes rêves'}</Text>
   <Pressable onPress={()=>router.push('/my-dream/new')} style={{padding:8}} accessibilityLabel="Créer un rêve"><Ionicons name="add-circle" size={29} color="#D71D77"/></Pressable>
  </View>
  {filtered.map(d=><Pressable key={d.id} onPress={()=>router.push({pathname:'/my-dream/[id]',params:{id:d.id}})} style={{borderWidth:1,borderColor:'#eee',borderRadius:13,marginBottom:12,padding:10,flexDirection:'row',alignItems:'center',gap:12}}>
   <Image source={{uri:d.image}} style={{width:90,height:88,borderRadius:9,backgroundColor:'#ddd'}}/>
   <View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:14}}>{d.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:7}}>{d.phase}</Text></View><Ionicons name="chevron-forward" size={20} color="#888"/>
  </Pressable>)}
  {!filtered.length?<Text style={{color:'#888',paddingTop:30,textAlign:'center'}}>Aucun rêve dans cette phase pour l’instant.</Text>:null}
 </ScrollView><Nav/></SafeAreaView>;
}