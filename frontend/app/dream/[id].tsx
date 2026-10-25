import {Text} from '@/i18n/LocalizedText';
import React from 'react';
import {Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {dreams,publications} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {colors as c} from '@/theme';
import {ActionRail} from '@/ActionRail';
import {DreamStageAction} from '@/DreamStageAction';
import {PHASE_COLORS} from '@/discoveryData';
import {Nav,Avatar} from '@/components';
export default function DreamDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const d=dreams.find(x=>x.id===id);
 if(!d)return <SafeAreaView style={{padding:24}}><Pressable onPress={()=>router.back()}><Text>← Retour</Text></Pressable><Text>Rêve introuvable</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:17,paddingBottom:60,maxWidth:840,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',marginBottom:10}}> <Pressable onPress={()=>router.back()} style={{width:34}}><Ionicons name="chevron-back" size={27}/></Pressable><Avatar size={29}/><View style={{flex:1,alignItems:"center",marginLeft:5,minWidth:0}}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={{fontSize:25,fontFamily:"Caveat_700Bold",textAlign:"center",width:"100%"}}>{d.title}</Text><Text numberOfLines={1} style={{fontSize:11,color:"#888",textAlign:"center"}}>{d.author} · {d.phase}</Text></View></View>
  <View style={{flexDirection:'row',gap:6,alignItems:'flex-end'}}><View style={{width:36,justifyContent:'flex-end'}}><ActionRail item={d}/></View><View style={{flex:1,height:205}}><Image source={{uri:d.image}} style={{width:"100%",height:"100%",borderRadius:11,backgroundColor:"#eee"}}/><View style={{position:"absolute",top:12,left:12,borderRadius:5,backgroundColor:PHASE_COLORS[d.phase].background,paddingHorizontal:9,paddingVertical:5}}><Text style={{fontSize:10,fontWeight:"700",color:PHASE_COLORS[d.phase].foreground}}>{d.phase.toUpperCase()}</Text></View>{d.phase==='Rêve'?<View style={{position:'absolute',left:10,right:10,bottom:9}}><DreamStageAction dream={d}/></View>:null}</View></View>


  <Text style={{fontSize:14,lineHeight:22,marginTop:22,color:'#343434'}}>{d.summary}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginTop:24,marginBottom:10}}>De ce que j’ai besoin</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{d.needs.map(n=><View key={n} style={{width:64,height:64,borderWidth:1,borderColor:'#ededed',borderRadius:32,backgroundColor:'#fafafa',justifyContent:'center',alignItems:'center',padding:4}}><Text numberOfLines={2} style={{color:'#555',fontSize:10,textAlign:'center'}}>{n}</Text></View>)}</View>
  <Text style={{fontSize:22,fontFamily:'Caveat_700Bold',marginTop:33,marginBottom:13}}>Continuer l’inspiration</Text>
  <PublicationGallery items={publications.filter(p=>p.id!==d.id)}/>
 </ScrollView><Nav/></SafeAreaView>;
}