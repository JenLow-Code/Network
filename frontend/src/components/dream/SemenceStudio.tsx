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
 return <View style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView showsVerticalScrollIndicator={false} style={{flex:1,backgroundColor:'transparent'}}
   keyboardShouldPersistTaps="handled"
   contentContainerStyle={{paddingHorizontal:ws.gutter,paddingTop:10,
     paddingBottom:100,maxWidth:ws.maxWidth,width:'100%',alignSelf:'center'}}>
   <DreamPhaseHeader dream={dream} phase="Rêve"
     onBack={onBack} onNavigate={onNavigate} readOnly={!editable}
     onPrimaryAction={()=>router.push({pathname:'/my-dream/notes/[id]',
       params:{id:dream.id}})}/>
   <View style={{alignSelf:'flex-end',width:244,maxWidth:'65%',marginTop:-10,marginBottom:6}}>
     <DreamWorkspaceShortcuts dream={dream}/>
   </View>
   {editable?<View style={{marginTop:6,
     maxWidth:ws.desktop?700:undefined,width:'100%',alignSelf:'center'}}>
     <View style={{flexDirection:(ws.tablet||ws.desktop)?'row':'column',gap:(ws.tablet||ws.desktop)?8:0}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Faire germer cette semence"
       onPress={()=>setConfirm(true)}
       style={{minHeight:(ws.tablet||ws.desktop)?43:48,flex:(ws.tablet||ws.desktop)?1.2:undefined,
         paddingHorizontal:(ws.tablet||ws.desktop)?8:17,paddingVertical:(ws.tablet||ws.desktop)?9:12,
         borderRadius:12,alignItems:'center',justifyContent:'center',
         backgroundColor:'#A1BA44'}}>
       <Text style={{color:'#242322',fontSize:13,fontWeight:'700',textAlign:'center'}}>
         Faire germer cette semence
       </Text>
     </Pressable>
     <Pressable onPress={()=>{setShareIds(null);setShareOpen(true);}}
       accessibilityRole="button" accessibilityLabel="Publier cette semence"
       style={{minHeight:(ws.tablet||ws.desktop)?43:48,flex:(ws.tablet||ws.desktop)?1:undefined,
         marginTop:(ws.tablet||ws.desktop)?0:13,paddingVertical:(ws.tablet||ws.desktop)?9:12,
         paddingHorizontal:(ws.tablet||ws.desktop)?7:17,alignItems:'center',justifyContent:'center',borderRadius:12,
         borderWidth:1.5,borderColor:accent,backgroundColor:'transparent'}}>
       <Text style={{fontSize:13,fontWeight:'700',color:accent,textAlign:'center'}}>
         Publier cette semence
       </Text>
     </Pressable>
     <Pressable onPress={uproot} accessibilityRole="button"
       accessibilityLabel="Arracher cette semence"
       style={{alignItems:'center',justifyContent:'center',
         minHeight:(ws.tablet||ws.desktop)?43:44,flex:(ws.tablet||ws.desktop)?1:undefined,
         borderRadius:12,marginTop:(ws.tablet||ws.desktop)?0:13,
         paddingHorizontal:(ws.tablet||ws.desktop)?7:17,paddingVertical:(ws.tablet||ws.desktop)?9:11,
         backgroundColor:(ws.tablet||ws.desktop)?'transparent':
           theme.dark?'#18191B':'#242322',
         borderWidth:(ws.tablet||ws.desktop)?1:0,borderColor:theme.border}}>
       <Text style={{color:(ws.tablet||ws.desktop)?theme.muted:'#FFFFFF',fontSize:(ws.tablet||ws.desktop)?11:12,fontWeight:'700'}}>
         Arracher cette semence
       </Text>
     </Pressable>
     </View>
     {confirm?<View style={{backgroundColor:theme.surface,padding:16,marginTop:12,
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
   </View>:null}
   {shareOpen?<SemenceShare key={(shareIds||[]).join('-')||'all'}
     dream={dream} initialIds={shareIds}
     onClose={()=>{setShareOpen(false);setShareIds(null);}}/>:null}
  </ScrollView>

 </View>;
}
