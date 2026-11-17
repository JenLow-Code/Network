import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {TalentLevelSelector} from '@/components/talent/TalentLevelSelector';
import {TranslatorLanguageFields} from '@/components/talent/TranslatorLanguageFields';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';

/** Finding a musician is a need, not an uploaded file. It lives by instruments/section. */
export function MusicMissingTalentAction({project,patch,sectionId,primary=false}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;sectionId?:string;
  primary?:boolean;
}){
  const theme=useAppTheme();
  const [open,setOpen]=useState(false);
  const [talent,setTalent]=useState('');
  const [level,setLevel]=useState('Quelques notions');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const translator=talent.trim().toLowerCase()==='traducteur';
  const submit=()=>{
    const value=talent.trim();if(!value||(translator&&(!from.trim()||!to.trim())))return;
    patch({needs:[...project.needs,{id:newMusicId(),kind:'talent',label:value,level,
      sectionId,sourceLanguage:translator?from.trim():undefined,
      targetLanguage:translator?to.trim():undefined}]});
    setTalent('');setOpen(false);setFrom('');setTo('');
  };
  const field={backgroundColor:theme.background,borderColor:theme.border,borderWidth:1,
    borderRadius:10,padding:11,color:theme.foreground,fontSize:12} as const;
  return <View style={{gap:8}}>
    <Pressable onPress={()=>setOpen(!open)} accessibilityRole="button"
      accessibilityState={{expanded:open}}
      style={{alignSelf:primary?'stretch':'flex-start',flexDirection:'row',
        alignItems:'center',justifyContent:primary?'center':'flex-start',gap:9,
        minHeight:primary?52:38,paddingHorizontal:primary?18:0,
        paddingVertical:primary?13:6,borderRadius:primary?14:0,
        backgroundColor:primary?pink:'transparent'}}>
      <Ionicons name="person-add-outline" size={primary?21:17}
        color={primary?'#fff':pink}/>
      <Text style={{fontSize:primary?14:12,color:primary?'#fff':pink,
        fontWeight:'700'}}>
        {primary?'Je recherche un talent':sectionId?
          'Un talent manque pour cette partie ?':'Un instrument ou un talent manque ?'}
      </Text>
      <Ionicons name={open?'chevron-up':'chevron-down'}
        size={primary?17:14} color={primary?'#fff':pink}/>
    </Pressable>
    {open?<View style={{borderRadius:12,padding:12,borderWidth:1,
      borderColor:theme.border,backgroundColor:theme.surface,gap:9}}>
      <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
        Quel talent recherches-tu ?
      </Text>
      <TextInput value={talent} onChangeText={setTalent}
        placeholder="Ex. guitariste, batteur, traducteur…" placeholderTextColor={theme.muted}
        style={field}/>
      <TalentLevelSelector value={level} onChange={setLevel}/>
      {translator?<TranslatorLanguageFields sourceLanguage={from} targetLanguage={to}
        onChangeSource={setFrom} onChangeTarget={setTo}/>:null}
      <Pressable onPress={submit} disabled={!talent.trim()||(translator&&(!from.trim()||!to.trim()))}
        style={{backgroundColor:pink,opacity:talent.trim()?1:.5,
          paddingHorizontal:14,paddingVertical:10,borderRadius:9,alignSelf:'flex-start'}}>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Ajouter à mes besoins</Text>
      </Pressable>
      <Text style={{color:theme.muted,fontSize:10,lineHeight:17}}>
        Le besoin apparaît dans ce morceau. Sa publication auprès des musiciens sera disponible
        lorsque les invitations de collaboration seront connectées.
      </Text>
    </View>:null}
  </View>;
}
