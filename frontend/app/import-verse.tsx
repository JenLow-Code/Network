import React from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useIncomingShare} from 'expo-sharing';
import {Nav} from '@/components';
const parseRef=(raw:string)=>{
 const match=raw.match(/(?:psaumes?|psalms?|psalm|salmos?|salmo)\s*(\d{1,3})\s*(?:[:.,]\s*(\d{1,3}))?/i);
 return match?{chapter:Number(match[1]),verse:Number(match[2]||1)}:null;
};
export default function ImportVerse(){
 const {sharedPayloads,resolvedSharedPayloads,isResolving,clearSharedPayloads}=useIncomingShare();
 const raw=sharedPayloads.find(p=>p.shareType==='text'||p.shareType==='url')?.value||'';
 const photo=resolvedSharedPayloads.find(p=>p.contentType==='image');
 const imageUrl=photo?.contentUri??null;
 const ref=parseRef(raw);
 function close(){clearSharedPayloads();router.replace('/discover')}
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
  <Pressable onPress={close}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:33,marginTop:17}}>Recevoir un verset</Text>
  <Text style={{fontSize:12,color:'#888',marginVertical:13}}>Partagé depuis une autre application biblique</Text>
  {isResolving?<ActivityIndicator/>:null}
  {imageUrl?<Image source={{uri:imageUrl}} resizeMode="contain" style={{width:'100%',height:220,backgroundColor:'#fafafa',borderRadius:10}}/>:null}
  {raw?<Text selectable style={{fontSize:13,lineHeight:20,color:'#333',marginTop:15}}>{raw}</Text>:null}
  {ref?<Text style={{marginTop:17,fontSize:14,fontWeight:'700'}}>Psaume {ref.chapter}:{ref.verse}</Text>:<Text style={{marginTop:20,fontSize:12,color:'#888'}}>Référence non détectée. Une étape de confirmation manuelle sera ajoutée avec la Bible complète.</Text>}
  {ref?.chapter===150?<Pressable onPress={()=>{clearSharedPayloads();router.replace({pathname:'/bible/[reference]',params:{reference:'psalm-150',verse:String(ref.verse)}})}} style={{marginTop:21,padding:14,backgroundColor:'#111',borderRadius:9,alignItems:'center'}}><Text style={{color:'#fff'}}>Ouvrir le Psaume 150 dans JenLow</Text></Pressable>:null}
  {ref&&ref.chapter!==150?<Text style={{fontSize:12,color:'#888',marginTop:13}}>Cette référence nécessite l'importation du texte biblique complet. Elle n'est pas remplacée par un autre chapitre.</Text>:null}
  <Text style={{marginTop:28,color:'#aaa',fontSize:11}}>Le texte ou l'image partagés restent soumis aux droits de leur source. JenLow affichera une édition légalement réutilisable lorsque la bibliothèque complète sera connectée.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}
