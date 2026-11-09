import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import { useDreams } from '@/domain/dreamRepository';
import { BIBLE_EDITION, BIBLE_EDITION_CODE, bibleReference, type BiblePassage } from '@/domain/bibleLibrary';
import type { DreamBlock, DreamEntry } from '@/domain/dreamWorkspace';

type Destination = {kind:'fire'|'dream';id?:string};
type Props = {
  visible:boolean;
  passage:BiblePassage|null;
  onClose:()=>void;
  onSaved:(message:string,target:Destination)=>void;
};

/** Store the verse as a real dream inspiration or a real, locally saved Fire item. */
export default function BibleSaveDestinationModal({visible,passage,onClose,onSaved}:Props){
  const theme=useAppTheme();
  const {fireFolders,saveBibleVerseToFire}=useApp();
  const {items,patch}=useDreams();
  const dreams=items.filter(d=>d.ownerIds?.includes('demo-user')&&d.phase!=='Témoignage');
  const reference=passage?bibleReference(passage):'';
  const saveFire=(folderId?:string,folderName?:string)=>{
    if(!passage)return;
    saveBibleVerseToFire({
      id:'bible:'+BIBLE_EDITION_CODE+':'+passage.bookCode+':'+passage.chapter+':'+passage.verse,
      reference,edition:BIBLE_EDITION,text:passage.text,
      addedAt:new Date().toISOString(),
    },folderId);
    onSaved(folderName?'Verset ajouté dans Ma liste Fire → '+folderName+'.':
      'Verset ajouté à Ma liste Fire.',{kind:'fire'});
  };
  const saveDream=(dream:DreamEntry)=>{
    if(!passage)return;
    const id='bible:'+BIBLE_EDITION_CODE+':'+passage.bookCode+':'+passage.chapter+':'+passage.verse;
    const block:DreamBlock={
      id,kind:'bible-verse',title:reference,content:passage.text,size:'small',
      tone:'clear',font:'serif',align:'left',frame:'none',
    };
    if(!(dream.blocks||[]).some(existing=>existing.id===id))
      patch(dream.id,{blocks:[...(dream.blocks||[]),block]});
    onSaved('Verset enregistré dans « '+dream.title+' » (Inspirations).',
      {kind:'dream',id:dream.id});
  };
  const destination=(icon:keyof typeof Ionicons.glyphMap,title:string,subtitle:string,onPress:()=>void,key?:string)=>(
    <Pressable key={key||title} onPress={onPress} accessibilityRole="button"
      style={{flexDirection:'row',alignItems:'center',gap:12,
        borderWidth:1,borderColor:theme.border,borderRadius:11,
        paddingHorizontal:12,paddingVertical:12,backgroundColor:theme.surface}}>
      <Ionicons name={icon} color={theme.muted} size={20}/>
      <View style={{flex:1,gap:3}}>
        <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>{title}</Text>
        <Text style={{fontSize:11,color:theme.muted}}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" color={theme.muted} size={16}/>
    </Pressable>
  );
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:'rgba(0,0,0,.54)',
      alignItems:'center',justifyContent:'center',padding:17}}>
      <Pressable onPress={onClose} accessibilityLabel="Fermer"
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
      <View style={{width:'100%',maxWidth:460,backgroundColor:theme.background,
        borderRadius:17,padding:19,gap:13}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{fontFamily:'serif',fontSize:25,color:theme.foreground}}>
            Ajouter à…
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer"
            style={{padding:6}}>
            <Ionicons name="close" color={theme.foreground} size={23}/>
          </Pressable>
        </View>
        {passage?<View style={{gap:4,paddingVertical:6}}>
          <Text style={{fontWeight:'700',fontSize:12,color:theme.foreground}}>
            {reference}
          </Text>
          <Text numberOfLines={2}
            style={{fontFamily:'serif',fontSize:15,lineHeight:23,color:theme.muted}}>
            {passage.text}
          </Text>
        </View>:null}
        <ScrollView keyboardShouldPersistTaps="handled"
          style={{maxHeight:430}} contentContainerStyle={{gap:9,paddingBottom:4}}>
          <Text style={{color:theme.muted,fontWeight:'700',fontSize:11,
            letterSpacing:1,marginTop:5}}>MES RÊVES</Text>
          {dreams.length?dreams.map(dream=>destination('book-outline',dream.title,
            dream.phase==='Rêve'?'Semence':dream.phase==='Initiation'?'Germination':
            dream.phase==='Croissance'?'Croissance':dream.phase,
            ()=>saveDream(dream),dream.id)):
            <Text style={{color:theme.muted,fontSize:12}}>
              Aucun rêve disponible pour enregistrer un verset.
            </Text>}
          <Text style={{color:theme.muted,fontWeight:'700',fontSize:11,
            letterSpacing:1,marginTop:10}}>MA LISTE FIRE</Text>
          {destination('flame-outline','Ma liste Fire',
            'Enregistrer le verset sans dossier',()=>saveFire())}
          {fireFolders.length?<Text style={{color:theme.muted,fontSize:11,
            marginTop:6}}>OU DANS UN DOSSIER FIRE</Text>:null}
          {fireFolders.map(folder=>destination('folder-outline',folder.name,
            'Enregistrer dans ce dossier',()=>saveFire(folder.id,folder.name),folder.id))}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
