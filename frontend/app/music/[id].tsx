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
 return <MusicWaveform index={item.audioIndex} renderLayout={(button,wave)=><PublicationDetail item={item} headerIcon={button}>
  <View style={{paddingTop:80,paddingBottom:18}}>{wave}</View>
  <DetailPanel title="Paroles" foldable defaultOpen={false}><Text style={{fontSize:13,color:"#666"}}>Paroles non renseignées.</Text></DetailPanel>
  <DetailPanel title="Partitions" foldable defaultOpen={false}><Text style={{fontSize:13,color:"#666"}}>Aucune partition jointe.</Text></DetailPanel>
  <DetailPanel title="Description" foldable defaultOpen={false}><Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{item.description}</Text></DetailPanel>
 </PublicationDetail>}/>;
}
