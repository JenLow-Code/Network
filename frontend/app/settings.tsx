import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Nav} from '@/components';
import {useApp} from '@/context';
import {useLocale,Language,LANGUAGE_KEY} from '@/locale';
const choices:{id:Language;label:string}[]=[{id:'fr',label:'Français'},{id:'en',label:'English'},{id:'de',label:'Deutsch'},{id:'pt',label:'Português'}];
export default function Settings(){
 const {language,setLanguage,t,tr}=useLocale();
 const {logout,email}=useApp();const [busy,setBusy]=useState(false);
 const keys=['jenlow.network.demo.dream.workspace.v1','jenlow.network.fire.v1.'+email.toLowerCase(),'jenlow.network.inspirations.v1.'+email.toLowerCase(),...['jenlow.mine.','jenlow.prayer.','jenlow.encouragement.','jenlow.proposals.'].map(s=>s+email)];
 const clearDemo=async()=>{setBusy(true);try{await Promise.all(keys.map(k=>AsyncStorage.removeItem(k)));logout();router.replace('/login')}finally{setBusy(false)}};
 function confirmDemo(){
  Alert.alert('Clear demo data?','This clears saved prototype Dreams and lists on this device. It does not delete a server account, since no real account exists yet.',[{text:'Cancel',style:'cancel'},{text:'Clear demo data',style:'destructive',onPress:()=>{void clearDemo()}}]);
 }
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:20,paddingBottom:42}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={25}/></Pressable>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:37,marginTop:14,marginBottom:23}}>{t('settings')}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginBottom:12}}>{t('language')}</Text>
  <View style={{borderWidth:1,borderColor:'#e8e8e8',borderRadius:12,overflow:'hidden'}}>
   {choices.map((option,i)=><Pressable key={option.id} onPress={()=>setLanguage(option.id)} accessibilityRole="button" style={{padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:i===choices.length-1?0:1,borderColor:'#eee'}}>
     <Text style={{fontSize:14,color:'#222'}}>{option.label}</Text><Ionicons name={language===option.id?'radio-button-on':'radio-button-off'} size={20} color={language===option.id?'#D71D77':'#aaa'}/>
    </Pressable>)}
  </View>
  <Text style={{fontSize:11,lineHeight:17,color:'#888',marginTop:11}}>{tr('settingsHelp')}</Text>
  <Text style={{fontSize:16,fontWeight:'700',marginTop:34,marginBottom:12}}>{t('account')}</Text>
  <Pressable accessibilityRole="button" disabled={busy} onPress={confirmDemo} style={{borderWidth:1,borderColor:'#ddd',padding:13,borderRadius:9,flexDirection:'row',gap:8,alignItems:'center'}}>
   <Ionicons name="trash-outline" color="#9e5163" size={20}/><Text style={{color:'#733e4b',fontSize:13}}>{t('demoData')}</Text>
  </Pressable>
  <View style={{padding:14,backgroundColor:'#f7f7f7',borderRadius:10,marginTop:12}}>
   <Text style={{fontSize:14,fontWeight:'600'}}>{t('deleteAccount')}</Text>
   <Text style={{fontSize:12,color:'#777',lineHeight:19,marginTop:7}}>Real account deletion will be available here when secure authentication and server-side deletion are implemented. This prototype currently has no real account to delete.</Text>
  </View>
 </ScrollView><Nav/></SafeAreaView>;
}
