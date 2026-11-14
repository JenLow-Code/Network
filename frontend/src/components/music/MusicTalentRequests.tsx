import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {TalentLevelSelector} from '@/components/talent/TalentLevelSelector';
import {TranslatorLanguageFields} from '@/components/talent/TranslatorLanguageFields';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';
export function MusicTalentRequests({project,patch,sectionId}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;sectionId?:string;
}){
  const theme=useAppTheme();
  const [open,setOpen]=useState(false);
  const [talent,setTalent]=useState('');
  const [level,setLevel]=useState('Quelques notions');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const requests=project.needs.filter(x=>x.kind==='talent'&&
    (sectionId?x.sectionId===sectionId:!x.sectionId));
  const submit=()=>{
    if(!talent.trim())return;
    const translator=talent.trim().toLowerCase()==='traducteur';
    if(translator&&(!from.trim()||!to.trim()))return;
    patch({needs:[...project.needs,{id:newMusicId(),kind:'talent',label:talent.trim(),
      level,sectionId,sourceLanguage:translator?from.trim():undefined,
      targetLanguage:translator?to.trim():undefined}]});
    setTalent('');setFrom('');setTo('');setOpen(false);
  };
  return <View style={{gap:11,borderWidth:1,borderColor:theme.border,
    backgroundColor:theme.surface,borderRadius:16,padding:15}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Ionicons name="people-outline" size={21} color={pink}/>
      <View style={{flex:1,gap:3}}>
        <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>Talents recherchés</Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          {sectionId?'Uniquement pour cette partie':'Pour l’ensemble du chant'}
        </Text>
      </View>
      <Pressable accessibilityLabel="Ajouter un talent" onPress={()=>setOpen(!open)}>
        <Ionicons name={open?'close':'add-circle-outline'} color={pink} size={23}/>
      </Pressable>
    </View>
    {requests.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {requests.map(need=><Pressable key={need.id}
        onPress={()=>patch({needs:project.needs.filter(x=>x.id!==need.id)})}
        style={{borderRadius:9,borderWidth:1,borderColor:theme.border,
          paddingHorizontal:10,paddingVertical:8,flexDirection:'row',gap:6}}>
        <Text style={{color:theme.foreground,fontSize:12}}>
          {need.label}{need.sourceLanguage&&need.targetLanguage?
            ' · '+need.sourceLanguage+' → '+need.targetLanguage:''}
        </Text>
        <Ionicons name="close-outline" size={15} color={pink}/>
      </Pressable>)}
    </View>:<Text style={{fontSize:12,color:theme.muted}}>
      Aucune demande pour {sectionId?'cette partie':'le morceau entier'}.
    </Text>}
    {open?<View style={{gap:9}}>
      <TextInput value={talent} onChangeText={setTalent} placeholder="Batteur, chanteur, traducteur…"
        placeholderTextColor={theme.muted} style={{borderWidth:1,borderColor:theme.border,
          borderRadius:10,padding:11,color:theme.foreground,fontSize:13}}/>
      <TalentLevelSelector value={level} onChange={setLevel}/>
      {talent.toLowerCase().trim()==='traducteur'?
        <TranslatorLanguageFields sourceLanguage={from} targetLanguage={to}
          onChangeSource={setFrom} onChangeTarget={setTo}/>:null}
      <Pressable accessibilityRole="button" disabled={!talent.trim()||
        (talent.toLowerCase().trim()==='traducteur'&&(!from.trim()||!to.trim()))}
        onPress={submit} style={{backgroundColor:pink,borderRadius:10,alignSelf:'flex-start',
          paddingVertical:11,paddingHorizontal:15}}>
        <Text style={{fontWeight:'700',color:'#fff',fontSize:12}}>Ajouter la demande</Text>
      </Pressable>
    </View>:null}
    <Text style={{fontSize:10,color:theme.muted,lineHeight:17}}>
      La demande reste dans ton dossier local jusqu’à l’ouverture des invitations sur JenLow.
    </Text>
  </View>;
}
