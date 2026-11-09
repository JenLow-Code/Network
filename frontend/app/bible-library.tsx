import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import BiblePassagePicker from '@/components/bible/BiblePassagePicker';
import BibleSaveDestinationModal from '@/components/bible/BibleSaveDestinationModal';
import {
  BIBLE_EDITION, bibleDownloadState, bibleReference, downloadBible,
  type BiblePassage,
} from '@/domain/bibleLibrary';

export default function BibleLibraryScreen(){
 const theme=useAppTheme();
 const [complete,setComplete]=useState(false);
 const [progress,setProgress]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [checkingDownload,setCheckingDownload]=useState(true);
 const [languageOpen,setLanguageOpen]=useState(false);
 const [selected,setSelected]=useState<BiblePassage|null>(null);
 const [notice,setNotice]=useState('');
 const [saveOpen,setSaveOpen]=useState(false);
 const [savedTarget,setSavedTarget]=useState<{kind:'fire'|'dream';id?:string}|null>(null);
 useEffect(()=>{
  let live=true;
  void bibleDownloadState().then(status=>{
   if(live)setComplete(status.complete);
  }).catch(()=>{}).finally(()=>{if(live)setCheckingDownload(false);});
  return ()=>{live=false;};
 },[]);
 const refresh=async()=>{
  const state=await bibleDownloadState();
  setComplete(state.complete);
 };
 const download=async()=>{
  if(busy)return;
  setBusy(true);setNotice('');setSavedTarget(null);
  try{
   await downloadBible((current,total)=>setProgress(Math.round(current*100/total)));
   await refresh();
   setNotice('La Bible est enregistrée sur cet appareil. Lecture et recherche possibles hors ligne.');
  }catch{
   await refresh();
   setNotice('Le téléchargement a été interrompu. Tu peux le reprendre sans recommencer les livres déjà enregistrés.');
  }finally{setBusy(false);setProgress(null);}
 };
 const share=()=>{
  if(!selected)return;
  void Share.share({message:selected.text+'\n\n'+bibleReference(selected)+' — '+BIBLE_EDITION});
 };
 const onSaved=(message:string,target:{kind:'fire'|'dream';id?:string})=>{
  setSaveOpen(false);setNotice(message);setSavedTarget(target);
 };
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView keyboardShouldPersistTaps="handled"
    contentContainerStyle={{width:'100%',maxWidth:760,alignSelf:'center',
      paddingHorizontal:19,paddingTop:10,paddingBottom:125,gap:16}}>
   <PageHeader/>
   <View style={{gap:8,marginTop:10}}>
     <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:5}}>
       <Text style={{fontFamily:'serif',fontSize:29,color:theme.foreground}}>Ma Bible en</Text>
       <Pressable onPress={()=>setLanguageOpen(open=>!open)}
         accessibilityRole="button" accessibilityLabel="Choisir la langue de la Bible"
         accessibilityState={{expanded:languageOpen}}
         style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:3,paddingVertical:3}}>
         <Text style={{fontFamily:'serif',fontSize:29,color:theme.foreground}}>français</Text>
         <Ionicons name={languageOpen?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
       </Pressable>
     </View>
     {languageOpen?<View style={{borderWidth:1,borderColor:theme.border,
       backgroundColor:theme.surface,borderRadius:10,paddingVertical:4,maxWidth:290}}>
       {([
         {name:'Français',available:true},
         {name:'English',available:false},
         {name:'Deutsch',available:false},
         {name:'Português',available:false},
       ] as const).map(language=><Pressable key={language.name}
         disabled={!language.available}
         accessibilityRole="button"
         accessibilityState={{disabled:!language.available,selected:language.available}}
         onPress={()=>setLanguageOpen(false)}
         style={{paddingHorizontal:13,paddingVertical:10,flexDirection:'row',
           alignItems:'center',justifyContent:'space-between'}}>
         <Text style={{fontSize:13,color:language.available?theme.foreground:theme.muted,
           fontWeight:language.available?'700':'400'}}>{language.name}</Text>
         {language.available
           ?<Ionicons name="checkmark" size={16} color={theme.foreground}/>
           :<Text style={{fontSize:11,color:theme.muted}}>Bientôt</Text>}
       </Pressable>)}
     </View>:null}
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
       <View style={{flex:1,gap:4}}>
         <Text style={{fontSize:14,fontWeight:'600',color:theme.foreground}}>{BIBLE_EDITION}</Text>
         <Text style={{fontSize:11,color:theme.muted}}>
           Domaine public · {checkingDownload?'Vérification…':
             busy?'Téléchargement '+(progress??0)+' %':
             complete?'Téléchargée':'Pas téléchargée'}
         </Text>
       </View>
       <Pressable onPress={download} disabled={busy||complete||checkingDownload}
         accessibilityRole="button"
         accessibilityLabel={complete?'Bible disponible hors ligne':'Télécharger la Bible pour une lecture hors ligne'}
         accessibilityState={{disabled:busy||complete||checkingDownload}}
         style={{width:42,height:42,alignItems:'center',justifyContent:'center',
           borderRadius:11,borderWidth:1,borderColor:theme.border,
           backgroundColor:theme.surface}}>
         {busy||checkingDownload?<ActivityIndicator size="small" color={theme.muted}/>
           :<Ionicons name={complete?'checkmark-circle-outline':'download-outline'}
             size={22} color={complete?theme.muted:theme.foreground}/>}
       </Pressable>
     </View>
   </View>
   <BiblePassagePicker onSelect={verse=>{setSelected(verse);setNotice('');setSavedTarget(null);}}
     title="Chercher dans ma Bible"/>
   {selected?<View style={{gap:12,borderRadius:12,
     backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,padding:15}}>
     <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
       {bibleReference(selected)}
     </Text>
     <Text style={{fontSize:17,fontFamily:'serif',lineHeight:28,color:theme.foreground}}>
       {selected.text}
     </Text>
     <Pressable onPress={share} accessibilityRole="button"
       style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
         borderWidth:1,borderColor:theme.border,padding:11,borderRadius:9,gap:8}}>
       <Ionicons name="share-outline" size={17} color={theme.foreground}/>
       <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Partager le verset</Text>
     </Pressable>
     <Pressable onPress={()=>setSaveOpen(true)}
       accessibilityRole="button"
       accessibilityLabel="Ajouter le verset à un rêve ou à ma liste Fire"
       style={{padding:13,backgroundColor:'#D71D77',
         borderRadius:10,alignItems:'center',flexDirection:'row',
         justifyContent:'center',gap:8}}>
       <Ionicons name="add-outline" color="#fff" size={19}/>
       <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Ajouter à…</Text>
     </Pressable>
   </View>:null}
   {notice?<View style={{gap:8}}>
     <Text accessibilityRole="alert" style={{fontSize:12,lineHeight:19,color:theme.muted}}>
       {notice}
     </Text>
     {savedTarget?<Pressable accessibilityRole="button"
       onPress={()=>savedTarget.kind==='fire'?router.push('/fire'):
         router.push({pathname:'/my-dream/[id]',params:{id:savedTarget.id||''}})}
       style={{alignSelf:'flex-start',paddingVertical:8,paddingHorizontal:12,
         borderRadius:9,borderWidth:1,borderColor:theme.border}}>
       <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
         {savedTarget.kind==='fire'?'Ouvrir ma liste Fire':'Ouvrir ce rêve'}
       </Text>
     </Pressable>:null}
   </View>:null}
  </ScrollView>
  <BibleSaveDestinationModal visible={saveOpen} passage={selected}
    onClose={()=>setSaveOpen(false)} onSaved={onSaved}/>
  <Nav/>
 </SafeAreaView>;
}
