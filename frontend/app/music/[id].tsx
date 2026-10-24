import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {musics,publications} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {StoneDeck} from '@/StoneDeck';
import {Nav} from '@/components';
import {ActionRail} from '@/ActionRail';
export default function MusicDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=musics.find(m=>m.id===id);
 if(!item)return <SafeAreaView><Text>Music not found</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:17,paddingBottom:60,maxWidth:840,width:'100%',alignSelf:'center'}}>
  <Pressable onPress={()=>router.back()} style={{paddingBottom:14}}><Ionicons name="chevron-back" size={26}/></Pressable>
  <View style={{flexDirection:'row',alignItems:'flex-end',gap:6}}><ActionRail item={item}/><Image source={{uri:item.image}} style={{flex:1,height:245,borderRadius:12}}/></View>
  <Text style={{fontSize:11,color:'#555',marginTop:15}}>MUSIQUE</Text><Text style={{fontSize:24,fontWeight:'700',marginTop:6}}>{item.title}</Text><Text style={{color:'#888',marginTop:5}}>{item.author}</Text>
  <Text style={{color:'#444',marginTop:17,fontSize:14}}>{item.description}</Text>
  <View style={{marginTop:21}}><StoneDeck/></View>
  <Text style={{fontSize:22,fontFamily:'Caveat_700Bold',marginTop:28,marginBottom:12}}>Continuer l’inspiration</Text>
  <PublicationGallery items={publications.filter(p=>p.id!==item.id)}/>
 </ScrollView><Nav/></SafeAreaView>;
}