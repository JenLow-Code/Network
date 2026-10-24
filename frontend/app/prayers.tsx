import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav} from '@/components';
import {publications} from '@/discoveryData';
import {useApp} from '@/context';
import {publicationPath} from '@/PublicationGallery';
export default function Prayers(){
 const {prayerIds,togglePrayer}=useApp();
 const items=publications.filter(p=>prayerIds.includes(p.id));
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:17,paddingBottom:55}}>
   <Text style={{fontSize:36,fontFamily:'Caveat_700Bold',marginBottom:5}}>Mes prières du jour</Text>
   <Text style={{fontSize:12,color:'#888',marginBottom:19}}>Une seule liste pour aujourd’hui, sans catégories supplémentaires.</Text>
   {!items.length?<Text style={{color:'#888',textAlign:'center',marginTop:60}}>Aucun sujet de prière enregistré.</Text>:items.map(p=><View key={p.id} style={{flexDirection:'row',gap:11,alignItems:'center',padding:10,borderWidth:1,borderColor:'#ededed',borderRadius:12,marginBottom:11}}>
     <Pressable onPress={()=>router.push(publicationPath(p) as any)}><Image source={{uri:p.image}} style={{width:67,height:67,borderRadius:8}}/></Pressable>
     <View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:13}}>{p.title}</Text><Text style={{fontSize:10,color:'#888',marginTop:4}}>{p.type==='dream'?'Rêve':'Publication'}</Text></View>
     <Pressable onPress={()=>togglePrayer(p.id)} accessibilityLabel="Remove from today's prayers"><Ionicons name="checkmark-circle" color="#698b6d" size={26}/></Pressable>
   </View>)}
   <Text style={{fontSize:10,color:'#aaa',marginTop:20}}>Les rappels automatiques arriveront avec les notifications et le backend. Cette liste reste enregistrée localement pour le moment.</Text>
  </ScrollView><Nav/></SafeAreaView>;
}