import React from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {musics} from '@/discoveryData';
import {PublicationDetail,DetailPanel} from '@/PublicationDetail';
import {MusicWaveform} from '@/MusicWaveform';
export default function MusicDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=musics.find(x=>x.id===id);
 if(!item)return <View style={{padding:24}}><Text>Music not found</Text></View>;
 return <PublicationDetail item={item}>
  <View style={{paddingTop:30,paddingBottom:10}}><MusicWaveform index={item.audioIndex}/></View>
  <DetailPanel title="Description" foldable defaultOpen={false}><Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{item.description}</Text></DetailPanel>
 </PublicationDetail>;
}
