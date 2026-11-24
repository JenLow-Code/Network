import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, Share, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import { workspaceCanvas } from '@/theme/workspaceLayout';
import BiblePassagePicker from '@/components/bible/BiblePassagePicker';
import BibleSaveDestinationModal from '@/components/bible/BibleSaveDestinationModal';
import {
  BIBLE_BOOKS, BIBLE_EDITION, BIBLE_EDITION_CODE, bibleDownloadState, bibleReference, downloadBible,
  type BiblePassage,
} from '@/domain/bibleLibrary';

type SavedTarget = {kind:'fire'|'dream'|'publication';id?:string};

export function BibleLibraryScreen(){
  const theme=useAppTheme();
  const {width,height}=useWindowDimensions();
  const compact=width<720;
  const [complete,setComplete]=useState(false);
  const {fireBibleVerses,saveBibleVerseToFire}=useApp();
  const params=useLocalSearchParams<{book?:string;chapter?:string;verse?:string}>();
  const book=BIBLE_BOOKS.find(([code])=>code===params.book)?.[0];
  const chapter=Number(params.chapter),verse=Number(params.verse);
  const location=book&&Number.isInteger(chapter)&&chapter>0&&Number.isInteger(verse)&&verse>0?{bookCode:book,chapter,verse}:undefined;
  const [progress,setProgress]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [checkingDownload,setCheckingDownload]=useState(true);
  const [languageOpen,setLanguageOpen]=useState(false);
  const [selected,setSelected]=useState<BiblePassage|null>(null);
  const [notice,setNotice]=useState('');
  const [saveOpen,setSaveOpen]=useState(false);
  const [savedTarget,setSavedTarget]=useState<SavedTarget|null>(null);

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
  const selectedId=selected?'bible:'+BIBLE_EDITION_CODE+':'+selected.bookCode+':'+selected.chapter+':'+selected.verse:'';
  const marked=fireBibleVerses.some(item=>item.id===selectedId);
  const mark=()=>{
    if(!selected||marked)return;
    saveBibleVerseToFire({id:selectedId,reference:bibleReference(selected),edition:BIBLE_EDITION,text:selected.text,addedAt:new Date().toISOString()});
    setNotice('Verset marqué : retrouve-le dans Ma Bible sur ton profil et dans ta liste Fire.');setSavedTarget(null);
  };
  const share=()=>{
    if(!selected)return;
    void Share.share({message:selected.text+'\n\n'+bibleReference(selected)+' — '+BIBLE_EDITION});
  };
  const onSaved=(message:string,target:SavedTarget)=>{
    setSaveOpen(false);setNotice(message);setSavedTarget(target);
  };
  const openSaved=()=>{
    if(!savedTarget)return;
    if(savedTarget.kind==='fire')router.push('/fire');
    else if(savedTarget.kind==='publication')router.push({
      pathname:'/bible/[reference]',
      params:{reference:'publication',id:savedTarget.id||''},
    });
    else router.push({pathname:'/my-dream/[id]',params:{id:savedTarget.id||''}});
  };
  const downloadLabel=checkingDownload?'Vérification du téléchargement':
    busy?'Téléchargement '+(progress??0)+' %':
    complete?'Bible disponible hors ligne':'Télécharger la Bible pour une lecture hors ligne';

  const content=<>
      {/* One compact settings row instead of three stacked blocks of metadata. */}
      <View style={{gap:5}}>
        <View style={{minHeight:37,flexDirection:'row',alignItems:'center',gap:10}}>
          <Pressable onPress={()=>setLanguageOpen(open=>!open)}
            accessibilityRole="button" accessibilityLabel="Choisir la langue de la Bible"
            accessibilityState={{expanded:languageOpen}}
            style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:36,
              paddingVertical:5}}>
            <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>Français</Text>
            <Ionicons name={languageOpen?'chevron-up':'chevron-down'}
              size={15} color={theme.muted}/>
          </Pressable>
          <View style={{height:15,width:1,backgroundColor:theme.border}}/>
          <Text numberOfLines={1}
            style={{flex:1,minWidth:0,fontSize:12,color:theme.muted}}>
            {BIBLE_EDITION}{busy?' · '+(progress??0)+' %':''}
          </Text>
          <Pressable onPress={download} disabled={busy||complete||checkingDownload}
            accessibilityRole="button" accessibilityLabel={downloadLabel}
            accessibilityState={{disabled:busy||complete||checkingDownload}}
            style={{width:36,height:36,borderRadius:9,borderWidth:1,
              borderColor:theme.border,backgroundColor:theme.surface,
              alignItems:'center',justifyContent:'center'}}>
            {busy||checkingDownload?<ActivityIndicator size="small" color={theme.muted}/>:
              <Ionicons name={complete?'checkmark-circle-outline':'download-outline'}
                size={19} color={complete?theme.muted:theme.foreground}/>}
          </Pressable>
        </View>
        {languageOpen?<View style={{borderWidth:1,borderColor:theme.border,
          backgroundColor:theme.surface,borderRadius:10,paddingVertical:4,
          maxWidth:260}}>
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
            style={{paddingHorizontal:13,paddingVertical:9,flexDirection:'row',
              alignItems:'center',justifyContent:'space-between'}}>
            <Text style={{fontSize:13,color:language.available?theme.foreground:theme.muted,
              fontWeight:language.available?'700':'400'}}>{language.name}</Text>
            {language.available
              ?<Ionicons name="checkmark" size={16} color={theme.foreground}/>
              :<Text style={{fontSize:11,color:theme.muted}}>Bientôt</Text>}
          </Pressable>)}
        </View>:null}
      </View>

      {/* The search, book navigation and chapter occupy the first usable space. */}
      <BiblePassagePicker key={location?location.bookCode+':'+location.chapter+':'+location.verse:'default'}
        initialLocation={location}
        onSelect={verse=>{setSelected(verse);setNotice('');setSavedTarget(null);}}
        showHeading={false} showHint={false}
        selectedPassage={selected}
        readerMaxHeight={Math.min(660,Math.max(280,height-(compact?280:215)))}/>

      {notice&&!selected?<Text accessibilityRole="alert"
        style={{fontSize:12,lineHeight:19,color:theme.muted}}>{notice}</Text>:null}
    </>;
    const selection=<>
    {/* The selection remains visible while the chapter scrolls independently. */}
    {selected?<View style={{backgroundColor:theme.surface,borderTopWidth:1,
      borderTopColor:theme.border}}>
      <View style={{...workspaceCanvas(width),paddingTop:10,paddingBottom:11,
        flexDirection:compact?'column':'row',gap:compact?9:16,
        alignItems:compact?'stretch':'center'}}>
        <View style={{flex:1,minWidth:0,gap:3}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Text numberOfLines={1} style={{flex:1,fontSize:12,fontWeight:'700',
              color:theme.foreground}}>
              Verset sélectionné · {bibleReference(selected)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la sélection"
              onPress={()=>{setSelected(null);setNotice('');setSavedTarget(null);}}
              style={{width:24,height:24,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={18} color={theme.muted}/>
            </Pressable>
          </View>
          <Text numberOfLines={compact?3:2} selectable
            accessibilityLabel={selected.text}
            style={{fontFamily:'serif',fontSize:compact?14:15,
              lineHeight:compact?21:23,color:theme.foreground}}>
            {selected.text}
          </Text>
          {notice?<Text accessibilityRole="alert"
            style={{fontSize:11,color:theme.muted,lineHeight:17}}>{notice}</Text>:null}
          {savedTarget?<Pressable accessibilityRole="button" onPress={openSaved}
            style={{alignSelf:'flex-start',paddingVertical:4}}>
            <Text style={{fontSize:11,fontWeight:'700',color:'#D71D77'}}>
              {savedTarget.kind==='fire'?'Ouvrir ma liste Fire':
                savedTarget.kind==='publication'?'Voir ma publication':'Ouvrir cette aspiration'}
            </Text>
          </Pressable>:null}
        </View>
        <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Pressable onPress={mark} disabled={marked} accessibilityRole="button" accessibilityLabel={marked?'Verset déjà marqué':'Marquer le verset dans Ma Bible et Fire'} accessibilityState={{disabled:marked,selected:marked}} style={{minHeight:42,paddingHorizontal:12,borderWidth:1,borderColor:theme.border,borderRadius:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}}>
            <Ionicons name={marked?'bookmark':'bookmark-outline'} size={17} color={theme.accent}/><Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>{marked?'Marqué':'Marquer'}</Text>
          </Pressable>
          <Pressable onPress={share} accessibilityRole="button"
            accessibilityLabel="Partager le verset sélectionné"
            style={{minHeight:42,paddingHorizontal:14,borderWidth:1,
              borderColor:theme.border,borderRadius:9,flexDirection:'row',
              alignItems:'center',justifyContent:'center',gap:7}}>
            <Ionicons name="share-outline" size={17} color={theme.foreground}/>
            <Text style={{fontSize:12,fontWeight:'700',
              color:theme.foreground}}>Partager</Text>
          </Pressable>
          <Pressable onPress={()=>setSaveOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter le verset à une aspiration, à ma liste Fire ou le publier sur JenLow"
            style={{flex:compact?1:undefined,minHeight:42,paddingHorizontal:18,
              backgroundColor:'#D71D77',borderRadius:9,alignItems:'center',
              flexDirection:'row',justifyContent:'center',gap:7}}>
            <Ionicons name="add-outline" color="#fff" size={18}/>
            <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Ajouter à…</Text>
          </Pressable>
        </View>
      </View>
    </View>:null}
    <BibleSaveDestinationModal visible={saveOpen} passage={selected}
      onClose={()=>setSaveOpen(false)} onSaved={onSaved}/>
    </>;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView style={{flex:1,minHeight:0}} keyboardShouldPersistTaps="handled" contentContainerStyle={{...workspaceCanvas(width),paddingTop:8,paddingBottom:22,gap:12}}>
      <PageHeader title="Ma Bible"/>{content}
    </ScrollView>{selection}<Nav/>
  </SafeAreaView>;
}
