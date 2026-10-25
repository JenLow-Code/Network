import {Text} from '@/i18n/LocalizedText';
import React from 'react';
import {Pressable,Share,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {biblePosts,psalm150} from '@/discoveryData';
import {Nav} from '@/components';
export default function VerseExport(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=biblePosts.find(p=>p.id===id);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1,padding:23}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:32,marginTop:18}}>Exporter un verset</Text>
  <Text style={{fontSize:16,lineHeight:26,marginTop:25}}>{item?psalm150[item.highlightedVerse-1]:'Verset introuvable'}</Text>
  <Text style={{fontSize:12,color:'#888',marginTop:14}}>{item?.reference} · Louis Segond 1910</Text>
  <Pressable disabled={!item} onPress={()=>{if(item)void Share.share({message:psalm150[item.highlightedVerse-1]+'\n'+item.reference+' — Louis Segond 1910'})}} style={{marginTop:33,backgroundColor:'#111',padding:15,borderRadius:9,alignItems:'center'}}><Text style={{color:'#fff'}}>Partager / enregistrer le texte du verset</Text></Pressable>
  <Text style={{fontSize:12,color:'#999',marginTop:18}}>V1 : export du texte des versets uniquement. Aucun téléchargement de musique.</Text>
 </View><Nav/></SafeAreaView>;
}