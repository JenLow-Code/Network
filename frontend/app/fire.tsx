import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context';
import {Nav,TopActions} from '@/components';
import {publications} from '@/discoveryData';
import {PublicationGallery} from '@/PublicationGallery';
import {useAppTheme} from '@/AppTheme';
export default function FireList(){const theme=useAppTheme();
 const {fireIds}=useApp();const [query,setQuery]=useState('');const items=publications.filter(p=>fireIds.includes(p.id)&&[p.title,p.author].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}><ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:15,paddingBottom:35}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:9,marginBottom:11}}><View/><TopActions/></View>
  <View style={{flexDirection:'row',gap:8,alignItems:'center',marginBottom:14}}><Ionicons name="flame" size={26} color="#D71D77"/><Text style={{fontSize:28,fontWeight:'700',color:theme.foreground}}>Ma liste Fire</Text></View>
  <Text style={{fontSize:12,color:'#777',marginBottom:14}}>Les publications qui t'inspirent, indépendamment de tes rêves.</Text><View style={{borderWidth:1,borderColor:'#eee',borderRadius:10,paddingHorizontal:12,height:42,flexDirection:'row',alignItems:'center',gap:8,marginBottom:18}}><Ionicons name="search" size={18} color="#777"/><TextInput placeholder="Rechercher dans Fire" value={query} onChangeText={setQuery} style={{flex:1,fontSize:13}}/></View>
  {items.length?<PublicationGallery items={items}/>:<View style={{marginTop:70,alignItems:'center',gap:10}}><Ionicons name="flame-outline" size={45} color="#aaa"/><Text style={{color:'#888'}}>Ta liste Fire est encore vide.</Text></View>}
 </ScrollView><Nav/></SafeAreaView>;
}
