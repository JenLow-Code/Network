import React from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {musics} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
import {Ionicons} from '@expo/vector-icons';
export default function MusicDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=musics.find(x=>x.id===id);
 if(!item)return <View style={{padding:24}}><Text>Music not found</Text></View>;
 return <PublicationDetail item={item}>
  <Text style={{fontSize:16,fontWeight:'700',marginBottom:8}}>Description</Text>
  <Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{item.description}</Text>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,marginTop:18,height:82}}>{[13,27,40,23,53,68,36,21,51,31,63,41,18,33,57,28,14,42,24].map((h,i)=><View key={i} style={{width:4,height:h,borderRadius:3,backgroundColor:'#CB245C'}}/>)}</View>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}}><Ionicons name="musical-note-outline" color="#555" size={17}/><Text style={{fontSize:11,color:'#888'}}>Aperçu de forme d'onde · lecture à connecter</Text></View>
 </PublicationDetail>;
}
