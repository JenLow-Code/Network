import React from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {personPublications} from '@/discoveryData';
import {PublicationDetail,DetailPanel} from '@/PublicationDetail';
import {TalentArt} from '@/TalentArt';
export default function PublicPerson(){
 const {name}=useLocalSearchParams<{name:string}>();
 const person=personPublications.find(p=>p.author===name);
 if(!person)return <View style={{padding:24}}><Text>Profil introuvable</Text></View>;
 return <PublicationDetail item={person} media={<View style={{height:120,alignItems:'center',justifyContent:'center',paddingVertical:3}}><TalentArt kind={person.instrument} size={104}/></View>}>
  <DetailPanel title="Je recherche">
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{person.seeking.map(t=><View key={t} style={{paddingHorizontal:12,paddingVertical:8,backgroundColor:'#F1F1EF',borderRadius:18}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View>
  </DetailPanel>
  <DetailPanel title="Description" foldable defaultOpen={false}><Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{person.description}</Text></DetailPanel>
  <DetailPanel title="Autres talents" foldable defaultOpen={false}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{person.talents.map(t=><View key={t} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:19,backgroundColor:'#F1F1EF'}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View>
  </DetailPanel>
 </PublicationDetail>;
}
