import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp, type FireBibleVerse} from '@/context/AppContext';
import {useAppTheme} from '@/theme/AppTheme';
import {BIBLE_BOOKS} from '@/domain/bibleLibrary';

export function markedVerseLocation(verse:FireBibleVerse){
  const parts=verse.id.split(':');
  const book=BIBLE_BOOKS.find(([code])=>code===parts[2])?.[0];
  const chapter=Number(parts[3]),number=Number(parts[4]);
  if(book&&Number.isInteger(chapter)&&chapter>0&&Number.isInteger(number)&&number>0)
    return {book,chapter:String(chapter),verse:String(number)};
  const match=verse.reference.match(/^(.+?)\s+(\d+)\s*[:.,]\s*(\d+)/);
  const fallback=match&&BIBLE_BOOKS.find(([code,name])=>name.toLowerCase()===match[1].toLowerCase()||code.toLowerCase()===match[1].toLowerCase())?.[0];
  return fallback&&match?{book:fallback,chapter:match[2],verse:match[3]}:{};
}

export function ProfileMarkedVerses(){
  const theme=useAppTheme();
  const {fireBibleVerses}=useApp();
  const [all,setAll]=useState(false);
  const verses=[...fireBibleVerses].sort((a,b)=>b.addedAt.localeCompare(a.addedAt));
  const open=(verse:FireBibleVerse)=>router.push({pathname:'/bible-library',params:markedVerseLocation(verse)});
  return <View style={{gap:12}}>
    {!verses.length?<Pressable onPress={()=>router.push('/bible-library')} accessibilityRole="button" style={{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:12}}>
      <View style={{width:42,height:50,borderWidth:1,borderColor:theme.border,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:theme.surface}}><Ionicons name="bookmark-outline" size={23} color={theme.dark?theme.muted:'#A47B54'}/></View>
      <View style={{flex:1,gap:4}}><Text style={{fontFamily:'serif',fontSize:17,color:theme.foreground}}>Les paroles que je garde</Text><Text style={{fontSize:12,lineHeight:18,color:theme.muted}}>Marque un verset pendant ta lecture pour le retrouver ici et dans ta liste Fire.</Text></View>
      <Ionicons name="arrow-forward-outline" size={17} color={theme.muted}/>
    </Pressable>:null}
    {(all?verses:verses.slice(0,3)).map(verse=><Pressable key={verse.id} onPress={()=>open(verse)} accessibilityRole="button" accessibilityLabel={'Lire '+verse.reference} style={{flexDirection:'row',alignItems:'flex-start',gap:12,borderWidth:1,borderColor:theme.border,borderRadius:10,backgroundColor:theme.surface,padding:15}}>
      <Ionicons name="bookmark" size={20} color={theme.dark?'#D8B18A':'#A47B54'}/>
      <View style={{flex:1,gap:8}}>
        <Text numberOfLines={4} style={{fontFamily:'serif',fontSize:17,lineHeight:25,color:theme.foreground}}>{verse.text}</Text>
        <Text style={{fontSize:11,letterSpacing:.8,fontWeight:'700',color:theme.muted}}>{verse.reference.toUpperCase()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
    </Pressable>)}
    {verses.length>3?<Pressable onPress={()=>setAll(v=>!v)} accessibilityRole="button" accessibilityState={{expanded:all}} style={{alignSelf:'flex-start',paddingVertical:9}}><Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>{all?'Voir moins':'Voir mes '+verses.length+' versets marqués'}</Text></Pressable>:null}
  </View>;
}
