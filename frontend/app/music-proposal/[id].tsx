import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {musics} from '@/discoveryData';
import {Nav} from '@/components';
export default function MusicProposal(){
 const {id}=useLocalSearchParams<{id:string}>();const music=musics.find(m=>m.id===id);
 const [note,setNote]=useState(''),[recording,setRecording]=useState(''),[submitted,setSubmitted]=useState(false);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1,padding:20}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={25}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:31,marginTop:13}}>Proposer une adaptation</Text>
  <Text style={{color:'#666',marginTop:9}}>{music?.title} · {music?.author}</Text>
  <Text style={{marginTop:27,fontSize:12}}>Lien vers ton enregistrement (démo)</Text>
  <TextInput value={recording} onChangeText={setRecording} placeholder="URL de l'enregistrement audio" style={{borderBottomWidth:1,borderColor:'#ccc',paddingVertical:12}}/>
  <TextInput value={note} onChangeText={setNote} placeholder="Décris les contributions et les artistes…" multiline style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:12,marginTop:22,minHeight:100}}/>
  <Pressable disabled={!recording.trim()||!note.trim()} onPress={()=>setSubmitted(true)} style={{backgroundColor:recording.trim()&&note.trim()?'#111':'#bbb',borderRadius:8,padding:15,marginTop:22,alignItems:'center'}}><Text style={{color:'#fff'}}>Préparer la proposition</Text></Pressable>
  {submitted?<Text style={{color:'#888',marginTop:18}}>Proposition préparée localement, non transmise. Seul l'auteur original pourra republier la collaboration avec crédit obligatoire.</Text>:null}
 </View><Nav/></SafeAreaView>;
}