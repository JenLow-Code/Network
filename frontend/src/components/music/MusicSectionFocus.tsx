import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicSongElements} from './MusicSongElements';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {MusicSectionStudio} from './MusicSectionStudio';
import {sectionDurationSeconds,formatMusicDuration} from '@/domain/musicProjectSelectors';
import type {MusicProject,MusicSection} from '@/domain/musicWorkspace';
const pink='#CB245C';

/** A section is simply a filtered view of the SAME song elements, not a second folder. */
export function MusicSectionFocus({project,section,patch,onOpenChat,openSection}:{
  project:MusicProject;section:MusicSection;patch:(changes:Partial<MusicProject>)=>void;
  onOpenChat:(sectionId:string)=>void;openSection:(id:string)=>void;
}) {
  const theme=useAppTheme();
  const [advanced,setAdvanced]=useState(false);
  const [renaming,setRenaming]=useState(false);
  const updateSection=(change:Partial<MusicSection>)=>patch({
    sections:project.sections.map(x=>x.id===section.id?{...x,...change}:x),
  });
  const duration=sectionDurationSeconds(project,section);
  return <View style={{gap:17}}>
    <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
      <View style={{flex:1,gap:5}}>
        {renaming?<TextInput value={section.title} onChangeText={title=>updateSection({title})}
          onBlur={()=>setRenaming(false)} autoFocus
          style={{borderColor:theme.border,borderWidth:1,borderRadius:10,
            paddingHorizontal:11,paddingVertical:8,color:theme.foreground,fontSize:16}}/>:
          <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>{section.title}</Text>}
        <Text style={{color:theme.muted,fontSize:12}}>
          <Ionicons name="time-outline" color={theme.muted} size={14}/> {' '}
          {duration===undefined?'Durée à déterminer':'Durée : '+formatMusicDuration(duration)}
        </Text>
      </View>
      <Pressable onPress={()=>setRenaming(!renaming)} accessibilityLabel="Renommer la partie"
        style={{padding:8}}><Ionicons name="pencil-outline" color={theme.muted} size={18}/></Pressable>
    </View>
    <MusicMissingTalentAction project={project} patch={patch} sectionId={section.id}/>
    <MusicSongElements key={section.id} project={project} patch={patch}
      sectionId={section.id} openSection={openSection}/>
    <Pressable onPress={()=>onOpenChat(section.id)} accessibilityRole="button"
      style={{flexDirection:'row',gap:9,alignItems:'center',paddingVertical:8}}>
      <Ionicons name="chatbubble-ellipses-outline" color={pink} size={19}/>
      <Text style={{color:pink,fontSize:12,fontWeight:'600',flex:1}}>
        Écrire au groupe à propos de « {section.title} »
      </Text>
      <Ionicons name="arrow-forward-outline" color={pink} size={17}/>
    </Pressable>
    <Pressable onPress={()=>setAdvanced(!advanced)} accessibilityRole="button"
      accessibilityState={{expanded:advanced}}
      style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:9,
        borderTopWidth:1,borderColor:theme.border}}>
      <Ionicons name="options-outline" color={theme.muted} size={17}/>
      <Text style={{flex:1,color:theme.muted,fontSize:11}}>Repères, partitions et outils avancés de cette partie</Text>
      <Ionicons name={advanced?'chevron-up':'chevron-down'} color={theme.muted} size={16}/>
    </Pressable>
    {advanced?<MusicSectionStudio project={project} section={section}
      patch={patch} onOpenChat={onOpenChat}/>:null}
  </View>;
}
