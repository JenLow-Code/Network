import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicFolderCover } from '@/components/music/MusicFolderCover';
import { MusicCaptureExperience } from '@/components/music/MusicCaptureExperience';
import { MusicCreateExperience } from '@/components/music/MusicCreateExperience';
import { MusicCollaborateExperience } from '@/components/music/MusicCollaborateExperience';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { musicNextState, makeWorkingVersion, makeWorkingTrack, changeWorkingVersion } from '@/domain/musicNext';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import type { MusicProjectFile } from '@/domain/musicWorkspace';

type Space = 'capture'|'create'|'collaborate';
const PINK='#CB245C';

export default function MusicWorkspace() {
  const {id}=useLocalSearchParams<{id:string}>();
  const {items,patch,ready,error}=useMusicWorkspaces();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<600;
  const desktop=Platform.OS==='web'&&width>=1100;
  const ws=workspaceLayout(width);
  const [space,setSpace]=useState<Space>('capture');
  const project=items.find(item=>item.id===id);
  if (!ready) return <SafeAreaView style={{flex:1,backgroundColor:theme.background,
    justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color={PINK}/><Nav/>
  </SafeAreaView>;
  if (!project) return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{padding:22,gap:13}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <Text style={{color:theme.foreground,fontSize:19,fontWeight:'700'}}>Chanson introuvable</Text>
      <Text style={{color:theme.muted,fontSize:13,lineHeight:20}}>
        Les brouillons enregistrés localement restent liés à cet appareil.
      </Text>
    </View>
    <Nav/>
  </SafeAreaView>;
  const music=musicNextState(project);
  const version=music.versions.find(v=>v.id===music.activeVersionId)||music.versions[0];
  const update=(value:Partial<typeof project>)=>patch(project.id,value);
  const start=(file:MusicProjectFile)=>{
    const created=makeWorkingVersion(file,music.versions.length+1);
    update({musicNext:{...music,versions:[...music.versions,created],activeVersionId:created.id}});
    setSpace('create');
  };
  const useFile=(file:MusicProjectFile)=>{
    if(!version){start(file);return;}
    if(version.tracks.some(track=>track.sourceFileId===file.id)){setSpace('create');return;}
    update({musicNext:changeWorkingVersion(music,{
      ...version,tracks:[...version.tracks,makeWorkingTrack(file)]
    })});
    setSpace('create');
  };
  const spaces: {id:Space; title:string; icon:keyof typeof Ionicons.glyphMap}[]=[
    {id:'capture',title:'Capturer',icon:'archive-outline'},
    {id:'create',title:'Créer',icon:'options-outline'},
    {id:'collaborate',title:'Collaborer',icon:'people-outline'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      width:'100%',maxWidth:ws.maxWidth,alignSelf:'center',
      paddingHorizontal:ws.gutter,
      paddingTop:desktop?16:8,paddingBottom:desktop?56:120,
      gap:compact?18:desktop?20:25}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <View style={{flexDirection:'row',gap:desktop?16:15,alignItems:'center',
        paddingVertical:desktop?3:0}}>
        <MusicFolderCover project={project} size={compact?65:desktop?74:82}/>
        <View style={{gap:5,flex:1}}>
          <Text style={{fontSize:compact?24:desktop?30:30,
            lineHeight:compact?29:desktop?36:37,
            fontWeight:'700',letterSpacing:-0.65,color:theme.foreground}}
            numberOfLines={2}>
            {project.title}
          </Text>
          <Text style={{fontSize:12,lineHeight:18,color:theme.muted}} numberOfLines={2}>
            {project.description || (music.versions.length
              ? music.versions.length + (music.versions.length===1 ? ' version' : ' versions')+' de travail'
              : 'Aucune version')}
          </Text>
        </View>
      </View>
      {/* Contextual workflow navigation belongs with the workspace, not in a
          second competing right sidebar. Desktop tabs are text-first. */}
      <View style={{flexDirection:'row',alignItems:'center',
        borderBottomWidth:1,borderColor:theme.border,
        gap:desktop?20:3}}>
        {spaces.map(item=>{
          const selected=space===item.id;
          return <Pressable key={item.id} onPress={()=>setSpace(item.id)}
            accessibilityRole="tab" accessibilityLabel={item.title}
            accessibilityState={{selected}}
            style={{flex:desktop?undefined:1,
              flexDirection:'row',alignItems:'center',
              justifyContent:'center',gap:compact?5:desktop?0:9,
              minHeight:desktop?46:52,borderBottomWidth:selected?2:0,
              borderBottomColor:selected?PINK:'transparent',
              paddingHorizontal:desktop?12:3}}>
            {!desktop?<Ionicons name={item.icon} size={compact?24:19}
              color={selected?PINK:theme.muted}/>:null}
            {(desktop||!compact||selected)?<Text numberOfLines={1}
              style={{fontSize:compact?12:desktop?14:14,
                fontWeight:selected?'700':'500',
                color:selected?theme.foreground:theme.muted}}>
              {item.title}
            </Text>:null}
          </Pressable>;
        })}
      </View>
      {error ? <Text style={{color:'#B94D63',fontSize:12}}>{error}</Text> : null}
      {space==='capture' ? <MusicCaptureExperience project={project} patch={update}
        onStartVersion={start} onUseFile={useFile} hasVersion={!!version}/> : null}
      {space==='create' ? <MusicCreateExperience project={project} patch={update}
        onCapture={()=>setSpace('capture')}/> : null}
      {space==='collaborate' ?
        <MusicCollaborateExperience project={project} patch={update}/> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
