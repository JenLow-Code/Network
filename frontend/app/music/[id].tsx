import React from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {musics} from '@/discoveryData';
import {PublicationDetail,DetailPanel} from '@/PublicationDetail';
import {DetailIntro} from '@/DetailIntro';
import {MusicWaveform} from '@/MusicWaveform';
import {MusicLyrics,FullMusicLyrics} from '@/MusicLyrics';
export default function MusicDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=musics.find(x=>x.id===id);
 if(!item)return <View style={{padding:24}}><Text>Music not found</Text></View>;
 return <MusicWaveform index={item.audioIndex} renderLayout={(button,wave,time,seek)=><PublicationDetail item={item}>
  <DetailIntro artwork={button} rightContent={wave}>
   <MusicLyrics lines={item.lyrics||[]} currentTime={time} onSeek={seek}/>
  </DetailIntro>
  <DetailPanel title="Paroles complètes" foldable defaultOpen={false}><FullMusicLyrics lines={item.lyrics||[]}/></DetailPanel>
  <DetailPanel title="Partitions" foldable defaultOpen={false}><Text style={{fontSize:13,color:'#666'}}>Aucune partition jointe.</Text></DetailPanel>
  <DetailPanel title="Description" foldable defaultOpen={false}><Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{item.description}</Text></DetailPanel>
 </PublicationDetail>}/>;
}
