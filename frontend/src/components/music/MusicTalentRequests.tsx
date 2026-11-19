import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import type {MusicProject} from '@/domain/musicWorkspace';
const PINK='#CB245C';

/** Reuse the exact same JenLow catalog and brief editor across music sections. */
export function MusicTalentRequests({project,patch,sectionId}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;sectionId?:string;
}){
  const theme=useAppTheme();
  const requests=project.needs.filter(need=>need.kind==='talent'&&
    (sectionId?need.sectionId===sectionId:!need.sectionId));
  return <View style={{gap:12}}>
    <Text style={{fontSize:14,color:theme.foreground,fontWeight:'700'}}>
      Talents recherchés
    </Text>
    <MusicMissingTalentAction project={project} patch={patch} sectionId={sectionId}/>
    {requests.map(need=><View key={need.id}
      style={{flexDirection:'row',alignItems:'center',gap:9,
        paddingVertical:8,borderBottomWidth:1,borderColor:theme.border}}>
      <Ionicons name="person-outline" size={18} color={PINK}/>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:12,color:theme.foreground,
          fontWeight:'600'}}>{need.label}</Text>
        {need.description?<Text style={{fontSize:11,color:theme.muted}}
          numberOfLines={2}>{need.description}</Text>:null}
      </View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={'Retirer '+need.label}
        onPress={()=>patch({needs:project.needs.filter(item=>item.id!==need.id)})}
        style={{width:41,height:41,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="trash-outline" size={17} color={theme.muted}/>
      </Pressable>
    </View>)}
  </View>;
}
