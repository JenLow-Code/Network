import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { DreamPhaseHeader } from './DreamPhaseLayout';
import SemenceInspirations from './SemenceInspirations';
import SemenceShare from './SemenceShare';
import DreamWorkspaceShortcuts from './DreamWorkspaceShortcuts';

/** Semence is one collection of inspirations, with the owner-only notebook one tap away. */
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
 const add=()=>setAddRequestToken(token=>token+1);
 return <View style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView style={{flex:1,backgroundColor:'transparent'}}
   keyboardShouldPersistTaps="handled"
   contentContainerStyle={{paddingHorizontal:width<520?16:19,paddingTop:10,
     paddingBottom:100,maxWidth:760,width:'100%',alignSelf:'center'}}>
   {!!dream.image?<View pointerEvents="none"
     style={{position:'absolute',top:0,left:0,right:0,height:510,overflow:'hidden'}}>
     <Image source={{uri:dream.image}}
       resizeMode="cover" blurRadius={5}
       style={{position:'absolute',top:0,left:0,right:0,height:510,opacity:theme.dark?.34:.48}}/>
     <Svg width="100%" height="100%" style={{position:'absolute',top:0,left:0}}>
       <Defs><LinearGradient id="semence-background-fade"
         x1="0%" y1="0%" x2="0%" y2="100%">
         <Stop offset="0%" stopColor={theme.background} stopOpacity={theme.dark?0.48:0.43}/>
         <Stop offset="35%" stopColor={theme.background} stopOpacity={theme.dark?0.40:0.34}/>
         <Stop offset="75%" stopColor={theme.background} stopOpacity="0.87"/>
         <Stop offset="100%" stopColor={theme.background} stopOpacity="1"/>
       </LinearGradient></Defs>
       <Rect width="100%" height="100%" fill="url(#semence-background-fade)"/>
     </Svg>
   </View>:null}
   <DreamPhaseHeader dream={dream} phase="Rêve"
     onBack={onBack} onNavigate={onNavigate} readOnly={!editable}/>
   <View style={{alignItems:'flex-end',marginTop:-10,marginBottom:6}}>
     <DreamWorkspaceShortcuts dream={dream}/>
   </View>
   <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground,
     marginTop:3,marginBottom:13}}>Inspirations</Text>
   <SemenceInspirations dream={dream} editable={editable}
     addRequestToken={addRequestToken}
     onShareInspiration={id=>{setShareIds([id]);setShareOpen(true);}}/>
   {editable?<View style={{marginTop:6}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Faire germer cette semence"
       onPress={()=>setConfirm(true)}
       style={{minHeight:48,paddingHorizontal:17,paddingVertical:12,
         borderRadius:12,alignItems:'center',justifyContent:'center',
         backgroundColor:'#A1BA44'}}>
       <Text style={{color:'#242322',fontSize:13,fontWeight:'700',textAlign:'center'}}>
         Faire germer cette semence
       </Text>
     </Pressable>
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
     <Pressable onPress={()=>{setShareIds(null);setShareOpen(true);}}
       accessibilityRole="button" accessibilityLabel="Publier cette semence"
       style={{minHeight:48,marginTop:13,paddingVertical:12,paddingHorizontal:17,
         alignItems:'center',justifyContent:'center',borderRadius:12,
         borderWidth:1.5,borderColor:accent,backgroundColor:'transparent'}}>
       <Text style={{fontSize:13,fontWeight:'700',color:accent,textAlign:'center'}}>
         Publier cette semence
       </Text>
     </Pressable>
     <Pressable onPress={uproot} accessibilityRole="button"
       accessibilityLabel="Arracher cette semence"
       style={{alignItems:'center',justifyContent:'center',minHeight:44,
         borderRadius:12,marginTop:13,paddingHorizontal:17,paddingVertical:11,
         backgroundColor:theme.dark?'#18191B':'#242322'}}>
       <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>
         Arracher cette semence
       </Text>
     </Pressable>
   </View>:null}
   {shareOpen?<SemenceShare key={(shareIds||[]).join('-')||'all'}
     dream={dream} initialIds={shareIds}
     onClose={()=>{setShareOpen(false);setShareIds(null);}}/>:null}
  </ScrollView>
  {editable?<Pressable accessibilityRole="button"
    accessibilityLabel="Ajouter une inspiration" onPress={add}
    style={{position:'absolute',right:width<520?21:27,bottom:19,
      width:50,height:50,borderRadius:15,
      borderWidth:1,borderColor:'#B88962',
      backgroundColor:theme.background,alignItems:'center',
      justifyContent:'center',elevation:5,shadowColor:'#382C21',
      shadowOffset:{width:0,height:2},shadowRadius:6,shadowOpacity:0.13}}>
    <Ionicons name="add" color="#A5713D" size={26}/>
  </Pressable>:null}
 </View>;
}
