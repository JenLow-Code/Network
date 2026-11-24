import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { DreamPhaseHeader } from './DreamPhaseLayout';
import SemenceInspirations from './SemenceInspirations';
import SemenceShare from './SemenceShare';
import DreamWorkspaceShortcuts from './DreamWorkspaceShortcuts';
import DreamMilestoneActions from './DreamMilestoneActions';

/** Semence is an inspiration workspace; the personal notebook remains one tap away. */
export default function SemenceStudio({dream,onBack,onNavigate}:{
 dream:DreamEntry;onBack:()=>void;onNavigate?:(phase:DreamPhase)=>void;
}){
 const theme=useAppTheme();
 const {width}=useWindowDimensions();
 const {patch,advance,remove}=useDreams();
 const [confirm,setConfirm]=useState(false);
 const [shareIds,setShareIds]=useState<string[]|null>(null);
 const [shareOpen,setShareOpen]=useState(false);
 const [addRequestToken,setAddRequestToken]=useState(0);
 const editable=dream.phase==='Rêve';
 const ws=workspaceLayout(width);
 const accent='#B88962';
 const add=()=>setAddRequestToken(value=>value+1);
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
   contentContainerStyle={{paddingLeft:ws.contentGutter,paddingRight:ws.gutter,paddingTop:12,
     paddingBottom:100,maxWidth:ws.maxWidth,width:'100%',alignSelf:'center'}}>
   <DreamPhaseHeader dream={dream} phase="Rêve"
     onBack={onBack} onNavigate={onNavigate} readOnly={!editable}/>
   <View style={{alignSelf:'flex-end',width:244,maxWidth:'65%',marginTop:-10,marginBottom:6}}>
     <DreamWorkspaceShortcuts dream={dream}/>
   </View>
   {/* Restore the original cards, creation picker and document/link options. */}
   <View style={{flexDirection:'row',alignItems:'center',
     justifyContent:'space-between',gap:12,marginTop:9,marginBottom:13}}>
     <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>Inspirations</Text>
     {editable&&width>=700?<Pressable accessibilityRole="button"
       accessibilityLabel="Ajouter une inspiration" onPress={add}
       style={{flexDirection:'row',alignItems:'center',gap:6,
         borderRadius:9,paddingHorizontal:12,paddingVertical:8,
         borderWidth:1,borderColor:theme.border,
         backgroundColor:theme.dark?'rgba(25,26,27,.58)':'rgba(255,255,255,.78)'}}>
       <Ionicons name="add" size={16} color={theme.foreground}/>
       <Text style={{color:theme.foreground,fontSize:12,fontWeight:'600'}}>Ajouter</Text>
     </Pressable>:null}
   </View>
   <SemenceInspirations dream={dream} editable={editable}
     addRequestToken={addRequestToken}
     onShareInspiration={id=>{setShareIds([id]);setShareOpen(true);}}/>
   {editable?<View style={{width:'100%'}}>
     <DreamMilestoneActions
       nextStage="Germination"
       primaryLabel="Faire germer cette semence" primaryColor="#A1BA44"
       primaryTextColor="#242322" onPrimary={()=>setConfirm(true)}
       secondaryLabel="Publier cette semence" secondaryColor={accent}
       onSecondary={()=>{setShareIds(null);setShareOpen(true);}}
       destructiveLabel="Arracher" onDestructive={uproot}
     />
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
   </View>:null}
   {shareOpen?<SemenceShare key={(shareIds||[]).join('-')||'all'}
     dream={dream} initialIds={shareIds}
     onClose={()=>{setShareOpen(false);setShareIds(null);}}/>:null}
  </ScrollView>
  {editable&&width<700?<Pressable accessibilityRole="button"
    accessibilityLabel="Ajouter une inspiration" onPress={add}
    style={{position:'absolute',right:width<520?21:27,bottom:94,zIndex:55,
      width:48,height:48,borderRadius:14,borderWidth:1,
      borderColor:'#B88962',backgroundColor:theme.background,
      alignItems:'center',justifyContent:'center',
      elevation:5,shadowColor:'#382C21',
      shadowOffset:{width:0,height:2},shadowRadius:6,shadowOpacity:.13}}>
    <Ionicons name="add" color="#A5713D" size={26}/>
  </Pressable>:null}
 </View>;
}
