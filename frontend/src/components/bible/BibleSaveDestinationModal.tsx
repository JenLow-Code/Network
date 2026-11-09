import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import { useDreams } from '@/domain/dreamRepository';
import { BIBLE_EDITION, BIBLE_EDITION_CODE, bibleReference, type BiblePassage } from '@/domain/bibleLibrary';
import { api, ApiRequestError } from '@/lib/api/client';
import type { DreamBlock, DreamEntry } from '@/domain/dreamWorkspace';

type Destination = {kind:'fire'|'dream'|'publication';id?:string};
type ApiBook = {code:string;name:string};
const norm=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
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
  const [confirmPublish,setConfirmPublish]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [publishError,setPublishError]=useState('');
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
  const publish=async()=>{
    if(!passage||publishing)return;
    setPublishing(true);setPublishError('');
    try{
      // The author, visibility and content are verified and stored by JenLow's API.
      const response=await api<{items:ApiBook[]}>('/api/bible/books',{auth:'none'});
      const found=response.items.find(b=>norm(b.name)===norm(passage.bookName)) ??
        response.items.find(b=>passage.bookCode==='Ps'&&b.code==='PSA');
      if(!found){
        setPublishError('Ce livre ne peut pas encore être publié sur JenLow.');
        return;
      }
      const result=await api<{item?:{id?:string}}>('/api/bible/posts',{
        method:'POST',auth:'required',
        body:{editionCode:BIBLE_EDITION_CODE,bookCode:found.code,chapter:passage.chapter,
          startVerse:passage.verse,endVerse:passage.verse,visibility:'public'},
      });
      if(!result.item?.id){
        setPublishError('Le serveur n’a pas confirmé la publication.');
        return;
      }
      setConfirmPublish(false);
      onSaved('Verset publié sur JenLow. Retrouve-le dans Mes publications.',
        {kind:'publication',id:result.item.id});
    }catch(error){
      if(error instanceof ApiRequestError){
        if(error.status===401||error.code==='not_authenticated')
          setPublishError('Connecte-toi à ton compte JenLow pour publier.');
        else if(error.code==='verses_not_available'||error.code==='chapter_not_available')
          setPublishError('Ce passage ne peut pas encore être publié : le texte biblique n’est pas disponible sur le serveur.');
        else if(error.code==='network_unreachable')
          setPublishError('Connexion au serveur JenLow impossible. Aucune publication créée.');
        else setPublishError('La publication a échoué. Aucun verset n’a été publié.');
      }else setPublishError('La publication a échoué. Aucun verset n’a été publié.');
    }finally{setPublishing(false);}
  };
  const destination=(icon:keyof typeof Ionicons.glyphMap,title:string,subtitle:string,onPress:()=>void,key?:string)=>(
    <Pressable key={key||title} onPress={onPress} disabled={publishing}
      accessibilityRole="button"
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
  const close=()=>{if(publishing)return;setConfirmPublish(false);setPublishError('');onClose();};
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <View style={{flex:1,backgroundColor:'rgba(0,0,0,.54)',
      alignItems:'center',justifyContent:'center',padding:17}}>
      <Pressable onPress={close} accessibilityLabel="Fermer"
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
      <View style={{width:'100%',maxWidth:460,backgroundColor:theme.background,
        borderRadius:17,padding:19,gap:13}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{fontFamily:'serif',fontSize:25,color:theme.foreground}}>
            Ajouter à…
          </Text>
          <Pressable onPress={close} disabled={publishing} accessibilityRole="button" accessibilityLabel="Fermer"
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
            letterSpacing:1,marginTop:5}}>MES PUBLICATIONS</Text>
          {destination('globe-outline','Publier sur JenLow',
            'Rendre ce verset public sur JenLow',()=>{
              setConfirmPublish(true);setPublishError('');
            })}
          {confirmPublish?<View style={{borderWidth:1,borderColor:theme.border,
            backgroundColor:theme.surface,borderRadius:11,padding:13,gap:11}}>
            <Text style={{fontSize:12,color:theme.foreground,lineHeight:19}}>
              Ce verset sera visible publiquement et associé à ton profil.
            </Text>
            {publishError?<Text accessibilityRole="alert"
              style={{fontSize:12,color:'#BC3F56',lineHeight:18}}>
              {publishError}
            </Text>:null}
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:8}}>
              <Pressable onPress={()=>{setConfirmPublish(false);setPublishError('');}}
                disabled={publishing} accessibilityRole="button"
                style={{paddingHorizontal:12,paddingVertical:11}}>
                <Text style={{color:theme.muted,fontSize:12}}>Annuler</Text>
              </Pressable>
              <Pressable onPress={()=>{void publish();}} disabled={publishing}
                accessibilityRole="button"
                style={{backgroundColor:'#D71D77',paddingHorizontal:15,
                  paddingVertical:11,borderRadius:9,flexDirection:'row',alignItems:'center',gap:7}}>
                {publishing?<ActivityIndicator size="small" color="#fff"/>:null}
                <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>
                  {publishing?'Publication…':'Publier le verset'}
                </Text>
              </Pressable>
            </View>
          </View>:null}
          <Text style={{color:theme.muted,fontWeight:'700',fontSize:11,
            letterSpacing:1,marginTop:10}}>MES RÊVES</Text>
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
