import React from 'react';
import {Image,Text,View,Pressable} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {personPublications} from '@/discoveryData';
import {PublicationDetail,DetailPanel} from '@/PublicationDetail';
import {TalentArt} from '@/TalentArt';
export default function PublicPerson(){
 const {name}=useLocalSearchParams<{name:string}>();
 const person=personPublications.find(p=>p.author===name);
 if(!person)return <View style={{padding:24}}><Text>Profil introuvable</Text></View>;
 return <PublicationDetail item={person} media={<View style={{height:220,borderRadius:12,alignItems:'center',justifyContent:'center'}}><TalentArt kind={person.instrument} size={160}/></View>}>
  <DetailPanel title="Description"><Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{person.description}</Text></DetailPanel>
  <DetailPanel title={'Mon talent · '+person.level}><Text style={{fontSize:12,color:'#666',marginBottom:7}}>Proposé par {person.author}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{person.talents.map(t=><View key={t} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:19,backgroundColor:'#f3f3f3'}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View></DetailPanel>
  <DetailPanel title="Je recherche"><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{person.seeking.map(t=><View key={t} style={{paddingHorizontal:12,paddingVertical:8,backgroundColor:'#FFF2F5',borderRadius:18}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View></DetailPanel>
  <Text style={{fontSize:11,color:'#888',marginTop:18}}>Exemple de profil public — données de démonstration</Text>
 </PublicationDetail>;
}
