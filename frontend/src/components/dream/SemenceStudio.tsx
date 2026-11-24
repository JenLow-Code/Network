import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { DreamPhaseHeader } from './DreamPhaseLayout';
import SemenceShare from './SemenceShare';
import DreamWorkspaceShortcuts from './DreamWorkspaceShortcuts';
import SemenceInspirations from './SemenceInspirations';
import DreamMilestoneActions from './DreamMilestoneActions';

/** Semence workspace: private notes are the only resource shortcut displayed. */
export default function SemenceStudio({dream,onBack,onNavigate}:{
 dream:DreamEntry;onBack:()=>void;onNavigate?:(phase:DreamPhase)=>void;
}){
 const theme=useAppTheme();
 const {width}=useWindowDimensions();
 const {patch,advance,remove}=useDreams();
 const [confirm,setConfirm]=useState(false);
 const [shareIds,setShareIds]=useState<string[]|null>(null);
 const [shareOpen,setShareOpen]=useState(false);
 const editable=dream.phase==='Rêve';
 const ws=workspaceLayout(width);
 const accent='#B88962';
 const uproot=()=>{
   const run=()=>{remove(dream.id);router.replace('/my-space');};
   const title='Arracher cette semence ?';
   const description='Cette action supprimera définitivement cette semence et son contenu sur cet appareil.';
   if(Platform.OS==='web'&&typeof window!=='undefined'){
     if(window.confirm(title+'\n'+description))run();
   }else Alert.alert(title,description,[
     {text:'Annuler',style:'cancel'},
     {text:'Arracher',style:'destructive',onPress:run},
   ]);
 };
 const footer = editable?<View style={{width:'100%',maxWidth:ws.maxWidth,
    alignSelf:'center',paddingLeft:ws.desktop?ws.contentGutter:0,paddingRight:ws.desktop?ws.gutter:0,
    paddingTop:10,paddingBottom:ws.desktop?17:10,
    backgroundColor:theme.background}}>
    {confirm?<View style={{backgroundColor:theme.surface,padding:16,marginTop:12,
       maxWidth:ws.desktop?630:undefined,
       borderRadius:12,borderWidth:1,borderColor:theme.border,gap:8}}>
       <Text style={{color:theme.foreground,fontWeight:'700',fontSize:16}}>
         Prêt à faire germer ce rêve ?
       </Text>
       <Text style={{fontSize:13,color:theme.muted,lineHeight:20}}>
         En Germination, ton rêve devient public. Tes carnets personnels restent privés.
       </Text>
       <Pressable accessibilityRole="button"
         onPress={()=>{patch(dream.id,{visibility:'public'});
           advance(dream.id);setConfirm(false);onBack();}}
         style={{minHeight:48,marginTop:12,paddingHorizontal:17,paddingVertical:12,
           borderRadius:12,alignItems:'center',justifyContent:'center',
           backgroundColor:'#A1BA44'}}>
         <Text style={{color:'#242322',fontSize:13,fontWeight:'700'}}>
           Confirmer la germination
         </Text>
       </Pressable>
       <Pressable accessibilityRole="button" onPress={()=>setConfirm(false)}
         style={{paddingVertical:11}}>
         <Text style={{color:theme.muted,textAlign:'center'}}>Pas encore</Text>
       </Pressable>
     </View>:null}
    <DreamMilestoneActions anchored={ws.desktop} equalUtilityButtons secondaryFirst
      nextStage="Germination"
      primaryLabel="Faire germer cette semence" primaryColor="#A1BA44"
      primaryTextColor="#242322" onPrimary={()=>setConfirm(true)}
      secondaryLabel="Publier cette semence" secondaryColor={accent}
      onSecondary={()=>{setShareIds(null);setShareOpen(true);}}
      destructiveLabel="Arracher" onDestructive={uproot}
    />
  </View>:null;
 return <View style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView showsVerticalScrollIndicator={false} style={{flex:1,backgroundColor:'transparent'}}
   keyboardShouldPersistTaps="handled"
   contentContainerStyle={{paddingLeft:ws.contentGutter,paddingRight:ws.gutter,paddingTop:12,
     paddingBottom:24,maxWidth:ws.maxWidth,width:'100%',alignSelf:'center'}}>
   <DreamPhaseHeader dream={dream} phase="Rêve"
     onBack={onBack} onNavigate={onNavigate} readOnly={!editable}/>
   <View style={{alignSelf:'flex-end',width:244,maxWidth:'65%',marginTop:-10,marginBottom:6}}>
     <DreamWorkspaceShortcuts dream={dream}/>
   </View>
   {/* The private Semence moodboard must always be part of this workspace.
       Keep persisted blocks and the existing add-document/link/photo/verse menu. */}
   <View style={{marginTop:18,marginBottom:5,gap:12}}>
     <Text accessibilityRole="header" style={{fontSize:width<700?20:22,fontWeight:'800',letterSpacing:-0.5,color:theme.foreground}}>Inspirations</Text>
     <SemenceInspirations dream={dream} editable={editable} showAddControl={editable}
       onShareInspiration={id=>{setShareIds([id]);setShareOpen(true);}}/>
   </View>
   {shareOpen?<SemenceShare key={(shareIds||[]).join('-')||'all'}
     dream={dream} initialIds={shareIds}
     onClose={()=>{setShareOpen(false);setShareIds(null);}}/>:null}
   {!ws.desktop?footer:null}
  </ScrollView>
  {ws.desktop?footer:null}


 </View>;
}
