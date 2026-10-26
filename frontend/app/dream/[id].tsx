import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {dreams} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
import {DreamStageAction} from '@/DreamStageAction';
export default function DreamDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const d=dreams.find(x=>x.id===id);
 if(!d)return <View style={{padding:24}}><Pressable onPress={()=>router.back()}><Text>← Retour</Text></Pressable><Text>Rêve introuvable</Text></View>;
 return <PublicationDetail item={d}>
  <Text style={{fontSize:14,lineHeight:22,color:'#343434'}}>{d.summary}</Text>
  {d.phase==='Rêve'?<View style={{marginTop:14}}><DreamStageAction dream={d}/></View>:null}
  <Text style={{fontSize:16,fontWeight:'700',marginTop:23,marginBottom:10}}>De ce que j’ai besoin</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{d.needs.map(n=><View key={n} style={{paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:'#e8e8e8',borderRadius:18,backgroundColor:'#fafafa'}}><Text style={{color:'#555',fontSize:12}}>{n}</Text></View>)}</View>
 </PublicationDetail>;
}
