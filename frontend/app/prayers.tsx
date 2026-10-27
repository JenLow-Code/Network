import {Text} from '@/i18n/LocalizedText';
import React from 'react';
import {Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav,TopActions} from '@/components';
import {publications} from '@/discoveryData';
import {useApp} from '@/context';
import {publicationPath} from '@/PublicationGallery';
export default function Prayers(){
 const {prayerIds,togglePrayer,prayerRepetitions,setPrayerRepetition}=useApp();
 const items=publications.filter(p=>prayerIds.includes(p.id));
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:17,paddingBottom:55}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:5}}><Text style={{fontSize:26,fontWeight:'700'}}>Mes prières</Text><TopActions/></View>
   <Text style={{fontSize:12,color:'#888',marginBottom:19}}>Toutes mes prières, avec leur rythme de répétition.</Text>
   {!items.length?<Text style={{color:'#888',textAlign:'center',marginTop:60}}>Aucun sujet de prière enregistré.</Text>:items.map(p=><View key={p.id} style={{flexDirection:'row',gap:11,alignItems:'center',padding:10,borderWidth:1,borderColor:'#ededed',borderRadius:12,marginBottom:11}}>
     <Pressable onPress={()=>router.push(publicationPath(p) as any)}><Image source={{uri:p.image}} style={{width:67,height:67,borderRadius:8}}/></Pressable>
     <View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:13}}>{p.title}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:8}}>{([{id:'once' as const,label:'Une fois'},{id:'daily' as const,label:'Chaque jour'},{id:'weekly' as const,label:'Chaque semaine'}]).map(o=><Pressable key={o.id} onPress={()=>setPrayerRepetition(p.id,o.id)} style={{borderWidth:1,borderColor:(prayerRepetitions[p.id]||'daily')===o.id?'#CB245C':'#ddd',paddingHorizontal:6,paddingVertical:5,borderRadius:8}}><Text style={{fontSize:9,color:'#444'}}>{o.label}</Text></Pressable>)}</View></View>
     <Pressable onPress={()=>togglePrayer(p.id)} accessibilityLabel="Remove from today's prayers"><Ionicons name="checkmark-circle" color="#698b6d" size={26}/></Pressable>
   </View>)}
   <Text style={{fontSize:10,color:'#aaa',marginTop:20}}>Les rythmes sont enregistrés localement et utilisés dans Agenda. Les notifications automatiques nécessitent leur propre configuration.</Text>
  </ScrollView><Nav/></SafeAreaView>;
}