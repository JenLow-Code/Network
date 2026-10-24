import React from 'react';
import {ScrollView,Text,Pressable,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {psalm150,publications,biblePosts} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {colors as c} from '@/theme';
import {ActionRail} from '@/ActionRail';
export default function Bible(){
 const {verse}=useLocalSearchParams<{reference:string;verse?:string}>();
 const focus=Number(verse||6);
 const post=biblePosts.find(p=>p.highlightedVerse===focus)||biblePosts[0];
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{padding:20,maxWidth:840,width:'100%',alignSelf:'center',paddingBottom:65}}>
  <Pressable onPress={()=>router.back()} style={{paddingBottom:14}}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:34,color:'#151515',textAlign:'center'}}>Psaume 150</Text>
  <Text style={{fontSize:12,color:'#888',textAlign:'center',marginBottom:18}}>Louis Segond 1910 · Chapitre entier</Text>
  <View style={{flexDirection:'row',gap:10}}><View style={{width:37,justifyContent:'center'}}><ActionRail item={post}/></View><View style={{flex:1,gap:5}}>{psalm150.map((v,i)=><View key={i} style={{flexDirection:'row',gap:9,borderRadius:7,padding:10,backgroundColor:'#faeaf1'}}>
   <Text style={{fontSize:12,color:i+1===focus?c.pink:'#999'}}>{i+1}</Text>
   <Text style={{flex:1,fontSize:16,lineHeight:24,color:i+1===focus?c.pink:'#222'}}>{v}</Text>
  </View>)}</View></View>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:24,color:'#151515',marginTop:35,marginBottom:13}}>Continuer l’inspiration</Text>
  <PublicationGallery items={publications.filter(p=>p.type!=='bible'||p.highlightedVerse!==focus)}/>
  <Text style={{fontSize:10,color:'#888',marginTop:22}}>Demo chapter reader; full library and native sharing are not yet connected.</Text>
 </ScrollView></SafeAreaView>;
}