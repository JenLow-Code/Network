import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav} from '@/components';
export default function MusicSubmission(){
 const [title,setTitle]=useState(''),[creator,setCreator]=useState(''),[source,setSource]=useState(''),[rights,setRights]=useState(''),[credit,setCredit]=useState('');
 const [done,setDone]=useState(false);
 const valid=[title,creator,source,rights,credit].every(v=>v.trim().length>0);
 function field(label:string,value:string,set:(x:string)=>void,placeholder:string){
  return <View style={{marginBottom:15}}><Text style={{fontSize:12,fontWeight:'600',marginBottom:6}}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,fontSize:13}}/></View>;
 }
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:20,paddingBottom:30}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
  <Text style={{fontSize:34,fontFamily:'Caveat_700Bold',marginVertical:13}}>Partager une musique</Text>
  <Text style={{fontSize:13,color:'#666',lineHeight:20,marginBottom:24}}>Tu peux partager une musique venant d'une application externe si tu identifies la personne qui en détient les droits et disposes de l'autorisation nécessaire. Partager n'autorise pas son téléchargement.</Text>
  {field('Titre de la musique',title,setTitle,'Titre')}
  {field('Créateur / titulaire des droits',creator,setCreator,'Nom réel ou artiste')}
  {field('Lien vers la source officielle',source,setSource,'https://…')}
  {field('Autorisation / licence de partage',rights,setRights,'Licence ou accord précis')}
  {field('Crédits obligatoires',credit,setCredit,'Composition, instruments, voix…')}
  <Pressable disabled={!valid} onPress={()=>setDone(true)} style={{padding:15,backgroundColor:valid?'#111':'#bbb',borderRadius:9,alignItems:'center'}}><Text style={{color:'#fff'}}>Vérifier le brouillon</Text></Pressable>
  {done?<Text style={{marginTop:17,color:'#666'}}>Brouillon prêt pour vérification. Aucune publication ni autorisation juridique n'est créée par cette démo.</Text>:null}
  <Text style={{fontSize:11,color:'#999',marginTop:21}}>V1 : aucun bouton Télécharger pour les chansons. Les propositions d'adaptation ne permettent pas de republier sans crédit et contrôle du créateur original.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}