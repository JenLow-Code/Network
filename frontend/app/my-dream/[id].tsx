import React,{useState} from 'react';
import {Image,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {Nav} from '@/components';
import {dreams} from '@/discoveryData';
export default function MyDreamWorkspace(){
 const {id}=useLocalSearchParams<{id:string}>();
 const dream=dreams.find(d=>d.id===id);
 const [notes,setNotes]=useState('');
 const [editing,setEditing]=useState(false);
 if(!dream)return <SafeAreaView><Text>Rêve introuvable</Text><Nav/></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1}}>
 <ScrollView contentContainerStyle={{padding:16,paddingBottom:38}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:27,textAlign:'center'}}>{dream.title}</Text>
  <Text style={{textAlign:'center',color:'#888',fontSize:12,marginBottom:18}}>Mon espace de travail · {dream.phase}</Text>
  <Image source={{uri:dream.image}} style={{width:'100%',height:195,borderRadius:12}}/>
  <Text style={{fontSize:15,fontWeight:'700',marginTop:24}}>Mon but</Text><Text style={{fontSize:14,color:'#444',marginTop:8,lineHeight:21}}>{dream.summary}</Text>
  <Text style={{fontSize:15,fontWeight:'700',marginTop:24}}>De ce que j’ai besoin</Text><View style={{flexDirection:'row',gap:9,marginTop:12,flexWrap:'wrap'}}>{dream.needs.map(n=><View key={n} style={{width:65,height:65,borderWidth:1,borderColor:'#eee',borderRadius:33,alignItems:'center',justifyContent:'center',padding:5}}><Text style={{fontSize:11,textAlign:'center'}}>{n}</Text></View>)}</View>
  <Text style={{fontSize:15,fontWeight:'700',marginTop:24}}>Mes notes</Text>
  <TextInput multiline placeholder="Écris tes idées pour ce rêve…" value={notes} onChangeText={setNotes} style={{borderWidth:1,borderColor:'#ddd',borderRadius:10,minHeight:100,padding:12,textAlignVertical:'top',marginTop:9}}/>
  <Text style={{fontSize:11,color:'#999',marginTop:14}}>Prototype : les notes restent temporaires. L’édition complète du rêve et les images arriveront avec le backend.</Text>
 </ScrollView></View><Nav/></SafeAreaView>;
}