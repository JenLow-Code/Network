import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { DreamPhaseHeader } from './DreamPhaseLayout';
import SemenceInspirations from './SemenceInspirations';
import SemenceNotes from './SemenceNotes';

/** Semence Level 3: two simple places, with separate, focused editors. */
export default function SemenceStudio({dream,onBack,onNavigate}:{
  dream:DreamEntry;onBack:()=>void;onNavigate?:(phase:DreamPhase)=>void;
}) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const {patch,advance,remove}=useDreams();
  const [tab,setTab]=useState<'inspirations'|'notes'>('inspirations');
  const [confirm,setConfirm]=useState(false);
  const editable=dream.phase==='Rêve';
  const accent='#B88962';

  const uproot=()=>{
    const run=()=>{remove(dream.id);router.replace('/my-space');};
    const question='Arracher cette semence ?';
    const detail='Cette action supprimera définitivement cette semence et son contenu sur cet appareil.';
    if(Platform.OS==='web'&&typeof window!=='undefined'){
      if(window.confirm(question+'\n'+detail))run();
    }else Alert.alert(question,detail,[
      {text:'Annuler',style:'cancel'},
      {text:'Arracher',style:'destructive',onPress:run},
    ]);
  };
  return <ScrollView style={{flex:1,backgroundColor:theme.background}}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{paddingHorizontal:width<520?16:19,paddingTop:10,
      paddingBottom:100,maxWidth:760,width:'100%',alignSelf:'center'}}>
    <DreamPhaseHeader dream={dream} phase="Rêve" onBack={onBack}
      onNavigate={onNavigate} readOnly={!editable}/>

    <View style={{flexDirection:'row',borderBottomWidth:1,borderColor:theme.border,
      marginTop:6,marginBottom:19}}>
      {([
        {key:'inspirations',label:'Inspirations'},
        {key:'notes',label:'Notes'},
      ] as const).map(item=><Pressable key={item.key}
        onPress={()=>setTab(item.key)}
        accessibilityRole="tab" accessibilityState={{selected:tab===item.key}}
        style={{flex:1,minHeight:47,alignItems:'center',justifyContent:'center',
          borderBottomWidth:tab===item.key?2:0,
          borderBottomColor:tab===item.key?accent:'transparent'}}>
        <Text style={{color:tab===item.key?theme.foreground:theme.muted,
          fontSize:14,fontWeight:tab===item.key?'700':'500'}}>
          {item.label}
        </Text>
      </Pressable>)}
    </View>
    {tab==='inspirations'
      ?<SemenceInspirations dream={dream} editable={editable}/>
      :<SemenceNotes dream={dream} editable={editable}/>}

    {editable?<View style={{marginTop:25}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Faire germer cette semence"
        onPress={()=>setConfirm(true)}
        style={{minHeight:48,marginTop:12,paddingHorizontal:17,paddingVertical:12,
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
          En Germination, ton rêve devient public. Tes notes personnelles restent privées et tes inspirations sont conservées.
        </Text>
        <Pressable accessibilityRole="button"
          onPress={()=>{patch(dream.id,{visibility:'public'});
            advance(dream.id);setConfirm(false);onBack();}}
          style={{minHeight:48,marginTop:12,paddingHorizontal:17,paddingVertical:12,
            borderRadius:12,alignItems:'center',justifyContent:'center',
            backgroundColor:'#A1BA44'}}>
          <Text style={{color:'#242322',fontSize:13,fontWeight:'700',textAlign:'center'}}>
            Confirmer la germination
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setConfirm(false)}
          style={{paddingVertical:11}}>
          <Text style={{color:theme.muted,textAlign:'center'}}>Pas encore</Text>
        </Pressable>
      </View>:null}
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
  </ScrollView>;
}
