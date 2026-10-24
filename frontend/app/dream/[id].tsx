import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {dreams} from '@/discoveryData';
import {colors as c} from '@/theme';
export default function DreamDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const d=dreams.find(x=>x.id===id);
 if(!d)return <SafeAreaView><Pressable onPress={()=>router.back()}><Text>← Back</Text></Pressable><Text>Dream not found</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{padding:17,maxWidth:720,width:'100%',alignSelf:'center',paddingBottom:50}}>
  <Pressable onPress={()=>router.back()} style={{paddingBottom:13}}><Ionicons name="chevron-back" size={27}/></Pressable>
  <Image source={{uri:d.image}} style={{width:'100%',height:295,borderRadius:12,backgroundColor:'#eee'}}/>
  <Text style={{fontSize:11,color:'#399459',fontWeight:'700',marginTop:15}}>🌱 {d.phase.toUpperCase()}</Text>
  <Text style={{fontSize:25,fontWeight:'700',marginTop:8}}>{d.title}</Text>
  <Text style={{fontSize:12,color:'#888',marginTop:6}}>{d.author}</Text>
  <Text style={{fontSize:15,lineHeight:23,marginTop:24,color:'#333'}}>{d.summary}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginTop:29,marginBottom:9}}>Talents recherchés</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{d.needs.map(n=><View key={n} style={{paddingHorizontal:13,paddingVertical:9,borderRadius:30,backgroundColor:'#fcebf3'}}><Text style={{color:c.pink,fontSize:12}}>{n}</Text></View>)}</View>
  <Text style={{fontSize:16,fontWeight:'700',marginTop:32,marginBottom:10}}>Continuer l’inspiration</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:153}}>{dreams.filter(x=>x.id!==d.id).slice(0,4).map(x=><Pressable key={x.id} onPress={()=>router.replace({pathname:'/dream/[id]',params:{id:x.id}})} style={{width:125,marginRight:10}}><Image source={{uri:x.image}} style={{height:90,width:125,borderRadius:9}}/><Text numberOfLines={2} style={{fontSize:11,marginTop:5}}>{x.title}</Text></Pressable>)}</ScrollView>
 </ScrollView></SafeAreaView>;
}
