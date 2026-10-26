import React from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {musics} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
import {StoneDeck} from '@/StoneDeck';
export default function MusicDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=musics.find(x=>x.id===id);
 if(!item)return <View style={{padding:24}}><Text>Music not found</Text></View>;
 return <PublicationDetail item={item}>
  <Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{item.description}</Text>
  <View style={{marginTop:18}}><StoneDeck/></View>
 </PublicationDetail>;
}
