import React,{useRef,useState} from 'react';
import {ScrollView,Text,Pressable,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {psalm150,publications,biblePosts} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {colors as c} from '@/theme';
import {ActionRail} from '@/ActionRail';
import {Nav} from '@/components';

const READER_HEIGHT=340;
export default function Bible(){
 const {verse}=useLocalSearchParams<{reference:string;verse?:string}>();
 const focus=Math.max(1,Math.min(psalm150.length,Number(verse||6)||6));
 const post=biblePosts.find(p=>p.highlightedVerse===focus)||biblePosts[0];
 const inner=useRef<any>(null);
 const positions=useRef<Record<number,{y:number,height:number}>>({});
 const [ready,setReady]=useState(false);
 const centre=()=>{
  const pos=positions.current[focus];
  if(pos)inner.current?.scrollTo({y:Math.max(0,pos.y+pos.height/2-READER_HEIGHT/2),animated:false});
 };
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,maxWidth:840,width:'100%',alignSelf:'center',paddingBottom:45}}>
   <View style={{flexDirection:'row',alignItems:'center',marginBottom:12}}>
    <Pressable onPress={()=>router.back()} style={{width:33}}><Ionicons name="chevron-back" size={26}/></Pressable>
    <View style={{flex:1,alignItems:'center'}}>
     <Text numberOfLines={1} style={{fontFamily:'Caveat_700Bold',fontSize:30,color:'#151515'}}>Psaume 150</Text>
     <Text style={{fontSize:11,color:'#888'}}>Louis Segond 1910 · Chapitre entier</Text>
    </View>
    <View style={{width:33}}/>
   </View>
   <View style={{flexDirection:'row',gap:8,alignItems:'flex-end'}}>
    <View style={{width:33,justifyContent:'flex-end'}}><ActionRail item={post}/></View>
    <ScrollView ref={inner} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar style={{flex:1,height:READER_HEIGHT,borderRadius:9}} contentContainerStyle={{gap:5,paddingBottom:14}} onContentSizeChange={()=>{if(!ready){centre();setReady(true);}}}>
     {psalm150.map((v,i)=><View key={i} onLayout={e=>{positions.current[i+1]=e.nativeEvent.layout;if(i===psalm150.length-1)requestAnimationFrame(centre);}} style={{flexDirection:'row',gap:9,borderRadius:7,padding:10,backgroundColor:'#FAEAF1'}}>
      <Text style={{fontSize:11,color:i+1===focus?c.pink:'#777'}}>{i+1}</Text>
      <Text style={{flex:1,fontSize:15,lineHeight:21,color:i+1===focus?c.pink:'#333',fontWeight:i+1===focus?'700':'400'}}>{v}</Text>
     </View>)}
    </ScrollView>
   </View>
   <Text style={{fontFamily:'Caveat_700Bold',fontSize:25,color:'#151515',marginTop:29,marginBottom:12}}>Continuer l’inspiration</Text>
   <PublicationGallery items={publications.filter(p=>p.type!=='bible'||p.highlightedVerse!==focus)}/>
   <Text style={{fontSize:10,color:'#888',marginTop:20}}>Lecteur de démonstration : l’ensemble de la Bible sera ajouté ultérieurement.</Text>
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}