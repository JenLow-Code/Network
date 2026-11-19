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
      width:'100%',maxWidth:desktop?1500:940,alignSelf:'center',
      paddingLeft:compact?18:desktop?44:34,
      paddingRight:compact?18:desktop?132:34,
      paddingTop:desktop?16:8,paddingBottom:desktop?45:120,
      gap:compact?18:desktop?28:25}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <View style={{flexDirection:'row',gap:desktop?19:15,alignItems:'center',
        paddingVertical:desktop?8:0}}>
        <MusicFolderCover project={project} size={compact?65:desktop?90:82}/>
        <View style={{gap:5,flex:1}}>
          <Text style={{fontSize:compact?24:desktop?34:30,
            lineHeight:compact?29:desktop?42:37,
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
      <View style={{flexDirection:desktop?'row':'column',
        alignItems:'flex-start',gap:desktop?28:0}}>
        <View style={{flex:1,minWidth:0,width:desktop?undefined:'100%',
          gap:compact?16:23}}>
          {!desktop?<View style={{flexDirection:'row',
            borderBottomWidth:1,borderColor:theme.border,gap:3}}>
            {spaces.map(item=>{
              const selected=space===item.id;
              return <Pressable key={item.id} onPress={()=>setSpace(item.id)}
                accessibilityRole="tab" accessibilityLabel={item.title}
                accessibilityState={{selected}}
                style={{flex:1,flexDirection:'row',alignItems:'center',
                  justifyContent:'center',gap:compact?5:9,
                  minHeight:52,borderBottomWidth:selected?3:0,
                  borderBottomColor:selected?PINK:'transparent',paddingHorizontal:3}}>
                <Ionicons name={item.icon} size={compact?24:19}
                  color={selected?PINK:theme.muted}/>
                {(!compact||selected)?<Text numberOfLines={1}
                  style={{fontSize:compact?12:14,fontWeight:selected?'700':'500',
                    color:selected?theme.foreground:theme.muted}}>{item.title}</Text>:null}
              </Pressable>;
            })}
          </View>:null}
          {error ? <Text style={{color:'#B94D63',fontSize:12}}>{error}</Text> : null}
          {space==='capture' ? <MusicCaptureExperience project={project} patch={update}
            onStartVersion={start} onUseFile={useFile} hasVersion={!!version}/> : null}
          {space==='create' ? <MusicCreateExperience project={project} patch={update}
            onCapture={()=>setSpace('capture')}/> : null}
          {space==='collaborate' ?
            <MusicCollaborateExperience project={project} patch={update}/> : null}
        </View>
        {desktop?<View style={{width:178,minWidth:178,paddingLeft:14,
          paddingTop:3,borderLeftWidth:1,borderColor:theme.border,gap:5,
          ...({position:'sticky',top:24} as any)}}>
          {spaces.map(item=>{
            const selected=space===item.id;
            return <Pressable key={item.id} onPress={()=>setSpace(item.id)}
              accessibilityRole="tab" accessibilityLabel={item.title}
              accessibilityState={{selected}}
              style={{minHeight:54,paddingHorizontal:12,borderRadius:14,
                flexDirection:'row',alignItems:'center',gap:12,
                backgroundColor:selected?
                  (theme.dark?'rgba(203,36,92,.16)':'rgba(203,36,92,.07)'):
                  'transparent'}}>
              <Ionicons name={item.icon} size={20}
                color={selected?PINK:theme.muted}/>
              <Text style={{fontSize:13,fontWeight:selected?'700':'500',
                color:selected?theme.foreground:theme.muted}}>
                {item.title}
              </Text>
              {selected?<View pointerEvents="none" style={{
                position:'absolute',right:0,top:15,bottom:15,
                width:3,borderRadius:3,backgroundColor:PINK}}/>:null}
            </Pressable>;
          })}
        </View>:null}
      </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
