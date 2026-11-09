import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import BiblePassagePicker from '@/components/bible/BiblePassagePicker';
import { api, ApiRequestError } from '@/lib/api/client';
import {
  BIBLE_EDITION, bibleDownloadState, bibleReference, downloadBible,
  type BiblePassage,
} from '@/domain/bibleLibrary';

function norm(v:string){
 return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
}
type ApiEdition={code:string;name:string};
type ApiBook={code:string;name:string};
export default function BibleLibraryScreen(){
 const theme=useAppTheme();
 const [complete,setComplete]=useState(false);
 const [progress,setProgress]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [checkingDownload,setCheckingDownload]=useState(true);
 const [languageOpen,setLanguageOpen]=useState(false);
 const [selected,setSelected]=useState<BiblePassage|null>(null);
 const [caption,setCaption]=useState('');
 const [publishing,setPublishing]=useState(false);
 const [notice,setNotice]=useState('');
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
  setBusy(true);setNotice('');
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
 const publish=async()=>{
  if(!selected||publishing)return;
  setPublishing(true);setNotice('');
  try{
   // Check the actual edition and canonical book identifiers in the server database.
   const editions=await api<{items:ApiEdition[]}>('/api/bible/editions',{auth:'none'});
   const books=await api<{items:ApiBook[]}>('/api/bible/books',{auth:'none'});
   const edition=editions.items.find(e=>norm(e.name)===norm(BIBLE_EDITION))
     ?? editions.items.find(e=>norm(e.code).includes('lsg'));
   const book=books.items.find(b=>norm(b.name)===norm(selected.bookName))
     ?? books.items.find(b=>selected.bookCode==='Ps'&&b.code.toUpperCase()==='PSA');
   if(!edition||!book){
    setNotice('Cette édition ou ce livre n’est pas encore disponible pour la publication sur JenLow.');
    return;
   }
   const created=await api<{item:{id:string}}>('/api/bible/posts',{
    method:'POST',auth:'required',
    body:{editionCode:edition.code,bookCode:book.code,chapter:selected.chapter,
      startVerse:selected.verse,endVerse:selected.verse,
      caption:caption.trim()||undefined,visibility:'public'},
   });
   if(created.item?.id){
     setNotice('Verset publié sur JenLow. ID : '+created.item.id);
     setCaption('');
   }else setNotice('Le serveur n’a pas confirmé la publication.');
  }catch(e){
   if(e instanceof ApiRequestError){
    setNotice(e.status===401||e.code==='not_authenticated'?
      'Connecte-toi à ton compte JenLow pour publier.':
      e.code==='verses_not_available'||e.code==='chapter_not_available'||e.status===404?
      'Ce passage est consultable, mais la base de publication du serveur ne contient pas encore ce chapitre.':
      e.status===403?'Ton compte ne possède pas encore l’autorisation de publier ce verset.':
      'La publication n’a pas pu être enregistrée. Aucun verset n’a été publié.');
   }else setNotice('Impossible de joindre le service de publication. Aucun verset n’a été publié.');
  }finally{setPublishing(false);}
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
   <BiblePassagePicker onSelect={verse=>{setSelected(verse);setNotice('');}}
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
     <TextInput value={caption} onChangeText={setCaption}
       placeholder="Un mot pour accompagner le verset (facultatif)"
       placeholderTextColor={theme.muted}
       style={{borderWidth:1,borderColor:theme.border,borderRadius:9,
         fontSize:13,color:theme.foreground,padding:12}}/>
     <Pressable disabled={publishing} onPress={publish}
       accessibilityRole="button" style={{padding:13,backgroundColor:'#D71D77',
         borderRadius:10,alignItems:'center'}}>
       <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>
         {publishing?'Publication en cours…':'Publier sur JenLow'}
       </Text>
     </Pressable>
   </View>:null}
   {notice?<Text accessibilityRole="alert"
     style={{fontSize:12,lineHeight:19,color:theme.muted}}>{notice}</Text>:null}
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}
