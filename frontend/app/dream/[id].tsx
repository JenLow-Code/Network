import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {dreams,publications} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {colors as c} from '@/theme';
export default function DreamDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const d=dreams.find(x=>x.id===id);
 if(!d)return <SafeAreaView style={{padding:24}}><Pressable onPress={()=>router.back()}><Text>← Retour</Text></Pressable><Text>Rêve introuvable</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{padding:17,paddingBottom:60,maxWidth:840,width:'100%',alignSelf:'center'}}>
  <Pressable onPress={()=>router.back()} style={{paddingBottom:14}}><Ionicons name="chevron-back" size={27}/></Pressable>
  <Image source={{uri:d.image}} style={{width:'100%',height:285,borderRadius:12,backgroundColor:'#eee'}}/>
  <Text style={{fontSize:11,color:'#458559',fontWeight:'700',marginTop:13}}>{d.phase.toUpperCase()}</Text>
  <Text style={{fontSize:24,fontWeight:'700',marginTop:7,color:'#161616'}}>{d.title}</Text>
  <Text style={{color:'#888',fontSize:12,marginTop:5}}>{d.author}</Text>
  <Text style={{fontSize:14,lineHeight:22,marginTop:22,color:'#343434'}}>{d.summary}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginTop:24,marginBottom:10}}>De ce que j’ai besoin</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{d.needs.map(n=><View key={n} style={{borderWidth:1,borderColor:'#dedede',borderRadius:22,paddingHorizontal:13,paddingVertical:8}}><Text style={{color:'#444',fontSize:12}}>{n}</Text></View>)}</View>
  <Text style={{fontSize:22,fontFamily:'Caveat_700Bold',marginTop:33,marginBottom:13}}>Continuer l’inspiration</Text>
  <PublicationGallery items={publications.filter(p=>p.id!==d.id)}/>
 </ScrollView></SafeAreaView>;
}