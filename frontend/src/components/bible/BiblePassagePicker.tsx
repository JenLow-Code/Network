import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import {
  BIBLE_BOOKS, BIBLE_EDITION, bibleBookName, getBibleBook, searchDownloadedBible,
  type BibleBookCode, type BiblePassage, type StoredBibleBook,
} from '@/domain/bibleLibrary';

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
type Props={
 onSelect:(verse:BiblePassage)=>void;
 title?:string;
 compact?:boolean;
};

/** Reusable book/chapter reader and reference search for Semence and the profile library. */
export default function BiblePassagePicker({onSelect,title='Choisir un verset',compact=false}:Props){
 const theme=useAppTheme();
 const [bookCode,setBookCode]=useState<BibleBookCode>('John');
 const [chapter,setChapter]=useState(3);
 const [data,setData]=useState<StoredBibleBook|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [search,setSearch]=useState('');
 const [matches,setMatches]=useState<BiblePassage[]>([]);
 const [searching,setSearching]=useState(false);
 const [booksOpen,setBooksOpen]=useState(false);
 const [versePreview,setVersePreview]=useState<number|null>(null);

 useEffect(()=>{
  let active=true;
  setLoading(true);setError('');setData(null);
  void getBibleBook(bookCode).then(result=>{
   if(!active)return;
   setData(result);
   const available=Object.keys(result.chapters).map(Number);
   if(!result.chapters[String(chapter)]&&available.length)setChapter(available[0]);
  }).catch(()=>{
   if(active)setError('Livre indisponible. Vérifie la connexion ou télécharge la Bible depuis ton profil.');
  }).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[bookCode]);
 useEffect(()=>{
  let active=true;
  const q=search.trim();
  if(q.length<3){setMatches([]);setSearching(false);return;}
  setSearching(true);
  void searchDownloadedBible(q,24).then(found=>{
   if(active)setMatches(found);
  }).catch(()=>{if(active)setMatches([]);}).finally(()=>{if(active)setSearching(false);});
  return ()=>{active=false;};
 },[search]);
 const chapters=data?Object.keys(data.chapters).map(Number).sort((a,b)=>a-b):[];
 const verses=data?.chapters[String(chapter)]||[];
 const bookNames=BIBLE_BOOKS.filter(([code,name])=>(
   normalize(code).includes(normalize(search))||normalize(name).includes(normalize(search))
 ));
 const select=(p:BiblePassage)=>{onSelect(p);setVersePreview(null);};
 const verseByNumber=(number:number)=>({
   bookCode,bookName:bibleBookName(bookCode),chapter,verse:number,text:verses[number-1],
 });
 const color=theme.foreground;
 return <View style={{gap:11}}>
   <View style={{gap:4}}>
     <Text style={{fontSize:19,fontFamily:'serif',color,fontWeight:'600'}}>{title}</Text>
     <Text style={{fontSize:11,color:theme.muted}}>
       {BIBLE_EDITION} · domaine public
     </Text>
   </View>
   <View style={{flexDirection:'row',alignItems:'center',gap:8,
     borderWidth:1,borderRadius:10,borderColor:theme.border,
     backgroundColor:theme.background,paddingHorizontal:10}}>
     <Ionicons name="search-outline" size={19} color={theme.muted}/>
     <TextInput value={search} onChangeText={setSearch}
       accessibilityLabel="Chercher un livre ou des mots de la Bible"
       placeholder="Livre ou mots d’un verset…"
       placeholderTextColor={theme.muted}
       style={{fontSize:13,color,flex:1,minHeight:45,paddingVertical:10}}/>
     {search?<Pressable accessibilityLabel="Effacer la recherche"
       accessibilityRole="button" onPress={()=>setSearch('')}>
       <Ionicons name="close-circle" color={theme.muted} size={17}/>
     </Pressable>:null}
   </View>
   {search.trim()?<View style={{maxHeight:210,backgroundColor:theme.surface,
     borderRadius:10,overflow:'hidden',borderWidth:1,borderColor:theme.border}}>
     <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:7,gap:5}}>
       {bookNames.map(([code,name])=><Pressable key={code} accessibilityRole="button"
         onPress={()=>{setBookCode(code);setChapter(1);setSearch('');setBooksOpen(false);}}
         style={{padding:10,flexDirection:'row',alignItems:'center',gap:8}}>
         <Ionicons name="book-outline" color={theme.muted} size={16}/>
         <Text style={{fontSize:13,color}}>{name}</Text>
       </Pressable>)}
       {searching?<ActivityIndicator color={theme.muted}/>:null}
       {matches.length?<Text style={{color:theme.muted,fontSize:11,padding:8}}>
         Versets trouvés dans les livres enregistrés
       </Text>:null}
       {matches.map(p=><Pressable key={p.bookCode+':'+p.chapter+':'+p.verse}
         accessibilityRole="button" onPress={()=>select(p)}
         style={{padding:9,borderTopWidth:1,borderTopColor:theme.border,gap:3}}>
         <Text style={{fontSize:12,fontWeight:'700',color}}>{p.bookName} {p.chapter}:{p.verse}</Text>
         <Text numberOfLines={3} style={{fontSize:12,lineHeight:18,color:theme.muted}}>{p.text}</Text>
       </Pressable>)}
       {!searching&&!matches.length&&!bookNames.length?<Text style={{fontSize:12,
         lineHeight:19,padding:12,color:theme.muted}}>
         Pas de résultat enregistré. Le téléchargement de la Bible depuis ton profil rend la recherche de mots disponible hors ligne.
       </Text>:null}
     </ScrollView>
   </View>:null}
   <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Choisir un livre"
       onPress={()=>setBooksOpen(!booksOpen)}
       style={{flex:1,minHeight:43,flexDirection:'row',alignItems:'center',
         justifyContent:'space-between',gap:6,paddingHorizontal:11,
         backgroundColor:theme.surface,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
       <Text numberOfLines={1} style={{fontSize:13,color,fontWeight:'600'}}>
         {bibleBookName(bookCode)}
       </Text>
       <Ionicons name={booksOpen?'chevron-up':'chevron-down'} color={theme.muted} size={17}/>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Chapitre précédent"
       disabled={chapter<=1}
       onPress={()=>{setChapter(v=>Math.max(1,v-1));setVersePreview(null);}}
       style={{width:34,minHeight:43,alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="chevron-back" color={theme.muted} size={18}/>
     </Pressable>
     <Text style={{fontSize:13,fontWeight:'700',color}}>{chapter}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Chapitre suivant"
       disabled={!chapters.length||chapter>=Math.max(...chapters)}
       onPress={()=>{setChapter(v=>Math.min(Math.max(...chapters),v+1));setVersePreview(null);}}
       style={{width:34,minHeight:43,alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="chevron-forward" color={theme.muted} size={18}/>
     </Pressable>
   </View>
   {booksOpen?<ScrollView style={{maxHeight:170}}
      nestedScrollEnabled keyboardShouldPersistTaps="handled"
      contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:5,padding:5}}>
     {BIBLE_BOOKS.map(([code,name])=><Pressable key={code} onPress={()=>{
       setBookCode(code);setChapter(1);setBooksOpen(false);setVersePreview(null);
     }} accessibilityRole="button" style={{padding:9,borderRadius:8,
       backgroundColor:bookCode===code?theme.foreground:theme.surface}}>
       <Text style={{fontSize:12,color:bookCode===code?theme.background:color}}>{name}</Text>
     </Pressable>)}
   </ScrollView>:null}
   {loading?<ActivityIndicator color={theme.muted} style={{marginTop:18}}/>:null}
   {error?<Text style={{fontSize:12,color:'#B74A5F',lineHeight:19}}>{error}</Text>:null}
   {!loading&&verses.length?<ScrollView nestedScrollEnabled
      style={{maxHeight:compact?235:330}}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{gap:2,paddingBottom:7}}>
     {verses.map((text,i)=>text?<Pressable key={i}
       onPress={()=>select(verseByNumber(i+1))}
       accessibilityRole="button"
       accessibilityLabel={'Choisir '+bibleBookName(bookCode)+' '+chapter+':'+(i+1)}
       style={{flexDirection:'row',gap:9,paddingHorizontal:7,
         paddingVertical:9,borderBottomWidth:.5,borderColor:theme.border}}>
       <Text style={{fontSize:11,color:'#B88962',fontWeight:'700',minWidth:21,marginTop:3}}>{i+1}</Text>
       <Text style={{fontSize:compact?14:15,color,lineHeight:compact?21:24,flex:1,
         fontFamily:'serif'}}>{text}</Text>
     </Pressable>:null)}
   </ScrollView>:null}
   <Text style={{fontSize:10,color:theme.muted,lineHeight:16}}>
     Appuie sur un verset pour le sélectionner. Les textes déjà lus restent disponibles hors ligne.
   </Text>
 </View>;
}
