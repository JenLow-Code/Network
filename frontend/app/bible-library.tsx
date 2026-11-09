import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import BiblePassagePicker from '@/components/bible/BiblePassagePicker';
import { api, ApiRequestError } from '@/lib/api/client';
import {
  BIBLE_EDITION, bibleDownloadState, bibleReference, downloadBible,
  removeDownloadedBible, type BiblePassage,
} from '@/domain/bibleLibrary';

function norm(v:string){
 return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
}
type ApiEdition={code:string;name:string};
type ApiBook={code:string;name:string};
export default function BibleLibraryScreen(){
 const theme=useAppTheme();
 const [complete,setComplete]=useState(false);
 const [cached,setCached]=useState(0);
 const [progress,setProgress]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<BiblePassage|null>(null);
 const [caption,setCaption]=useState('');
 const [publishing,setPublishing]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  let live=true;
  void bibleDownloadState().then(status=>{
   if(live){setComplete(status.complete);setCached(status.cached);}
  }).catch(()=>{});
  return ()=>{live=false;};
 },[]);
 const refresh=async()=>{
  const state=await bibleDownloadState();
  setComplete(state.complete);setCached(state.cached);
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
 const clear=async()=>{
  if(busy)return;
  setBusy(true);setNotice('');
  try{
   await removeDownloadedBible();await refresh();
   setNotice('La Bible hors ligne a été retirée de cet appareil.');
  }catch{setNotice('Impossible de retirer les fichiers hors ligne.');}
  finally{setBusy(false);}
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
   const book=books.items.find(b=>norm(b.name)===norm(selected.bookName));
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
    setNotice(e.code==='not_authenticated'?'Connecte-toi à ton compte JenLow pour publier.':
      e.code==='verses_not_available'||e.code==='chapter_not_available'?
      'Ce passage est consultable, mais la base de publication du serveur ne contient pas encore ce chapitre.':
      'Publication impossible : '+e.code+'. Aucun verset n’a été publié.');
   }else setNotice('Impossible de joindre le service de publication. Aucun verset n’a été publié.');
  }finally{setPublishing(false);}
 };
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView keyboardShouldPersistTaps="handled"
    contentContainerStyle={{width:'100%',maxWidth:760,alignSelf:'center',
      paddingHorizontal:19,paddingTop:10,paddingBottom:125,gap:16}}>
   <PageHeader/>
   <Text style={{fontFamily:'serif',fontSize:30,color:theme.foreground,
     marginTop:12}}>Ma Bible</Text>
   <View style={{borderWidth:1,borderColor:theme.border,borderRadius:13,
     padding:15,backgroundColor:theme.surface,gap:10}}>
     <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
       <Ionicons name="book-outline" size={24} color="#B88962"/>
       <View style={{flex:1,gap:3}}>
         <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>{BIBLE_EDITION}</Text>
         <Text style={{fontSize:11,color:theme.muted}}>
           Domaine public · {complete?'Téléchargée et disponible hors ligne':
             cached?'Partiellement enregistrée · '+cached+'/66 livres':'Disponible en téléchargement'}
         </Text>
       </View>
     </View>
     <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
       Télécharge les 66 livres pour consulter et rechercher les versets sans connexion sur cet appareil.
     </Text>
     {busy?<View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
       <ActivityIndicator color={theme.muted}/>
       <Text style={{fontSize:12,color:theme.muted}}>Téléchargement {progress??0}%</Text>
     </View>:null}
     <View style={{flexDirection:'row',gap:10}}>
       <Pressable onPress={download} disabled={busy||complete}
         accessibilityRole="button" style={{flex:1,padding:13,
           borderRadius:10,backgroundColor:complete?theme.background:theme.foreground,
           alignItems:'center'}}>
         <Text style={{fontSize:12,fontWeight:'700',color:complete?theme.muted:theme.background}}>
           {complete?'Bible disponible hors ligne':cached?'Reprendre le téléchargement':'Télécharger la Bible'}
         </Text>
       </Pressable>
       {cached>0&&!busy?<Pressable onPress={clear} accessibilityRole="button"
         accessibilityLabel="Supprimer les données bibliques hors ligne"
         style={{borderWidth:1,borderColor:theme.border,padding:13,borderRadius:10}}>
         <Ionicons name="trash-outline" size={18} color={theme.muted}/>
       </Pressable>:null}
     </View>
     <Text style={{fontSize:10,color:theme.muted,lineHeight:16}}>
       Texte biblique Louis Segond 1910 · domaine public. Source de données : midvash/bible-data.
     </Text>
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
