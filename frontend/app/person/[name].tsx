import React from 'react';
import {Image,Text,View,Pressable} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {personPublications} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
export default function PublicPerson(){
 const {name}=useLocalSearchParams<{name:string}>();
 const person=personPublications.find(p=>p.author===name);
 if(!person)return <View style={{padding:24}}><Text>Profil introuvable</Text></View>;
 return <PublicationDetail item={person} media={<View style={{height:220,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Image source={{uri:person.image}} style={{width:136,height:136,borderRadius:68}}/></View>}>
  <Text style={{fontSize:14,lineHeight:22,color:'#444',marginBottom:18}}>{person.description}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginBottom:10}}>Talents</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{person.talents.map(t=><View key={t} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:19,backgroundColor:'#f3f3f3'}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View>
  <Pressable onPress={()=>router.push({pathname:'/chat/[id]',params:{id:'helena',recipient:person.name}})} style={{flexDirection:'row',justifyContent:'center',padding:12,borderRadius:12,borderWidth:1,borderColor:'#ddd',marginTop:18}}><Text style={{fontWeight:'600',color:'#222'}}>Contacter</Text></Pressable>
  <Text style={{fontSize:11,color:'#888',marginTop:18}}>Exemple de profil public — données de démonstration</Text>
 </PublicationDetail>;
}
