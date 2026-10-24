import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context';
import {publications} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
export default function FireList(){
 const {fireIds}=useApp();const items=publications.filter(p=>fireIds.includes(p.id));
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{paddingHorizontal:15,paddingBottom:35}}>
  <Pressable onPress={()=>router.back()} style={{marginTop:14,marginBottom:11}}><Ionicons name="chevron-back" size={26}/></Pressable>
  <View style={{flexDirection:'row',gap:8,alignItems:'center',marginBottom:14}}><Ionicons name="flame" size={26} color="#D71D77"/><Text style={{fontFamily:'Caveat_700Bold',fontSize:33}}>Ma liste Fire</Text></View>
  <Text style={{fontSize:12,color:'#777',marginBottom:18}}>Les publications qui t'inspirent, indépendamment de tes rêves.</Text>
  {items.length?<PublicationGallery items={items}/>:<View style={{marginTop:70,alignItems:'center',gap:10}}><Ionicons name="flame-outline" size={45} color="#aaa"/><Text style={{color:'#888'}}>Ta liste Fire est encore vide.</Text></View>}
 </ScrollView></SafeAreaView>;
}
