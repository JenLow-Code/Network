import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicCaptureExperience } from '@/components/music/MusicCaptureExperience';
import { MusicCreateExperience } from '@/components/music/MusicCreateExperience';
import { MusicCollaborateExperience } from '@/components/music/MusicCollaborateExperience';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { musicNextState, makeWorkingVersion, makeWorkingTrack, changeWorkingVersion } from '@/domain/musicNext';
import {isMidiSource,renderMidiSource} from '@/domain/musicMidiAudio';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';
import type { MusicProjectFile } from '@/domain/musicWorkspace';

type Space = 'capture'|'create'|'collaborate';
const PINK='#CB245C';

export default function MusicWorkspace() {
  const {id,tab,intent}=useLocalSearchParams<{id:string;tab?:Space;intent?:string}>();
  const {items,patch,ready,error}=useMusicWorkspaces();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<600;
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const ws=workspaceLayout(width);
  const [space,setSpace]=useState<Space>(
    tab==='create'||tab==='collaborate'?tab:'capture');
  useEffect(()=>{
    if(tab==='capture'||tab==='create'||tab==='collaborate')setSpace(tab);
  },[tab]);
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
  const addingRef=useRef(false);
  const [midiConversionError,setMidiConversionError]=useState('');
  const [convertingMidi,setConvertingMidi]=useState(false);
  const addFromCapture=async(file:MusicProjectFile,forceNew=false)=>{
    if(addingRef.current)return;
    addingRef.current=true;setMidiConversionError('');
    setConvertingMidi(isMidiSource(file));
    try{
      const existing=forceNew?undefined:version;
      if(existing?.tracks.some(track=>{
        const source=project.files.find(item=>item.id===track.sourceFileId);
        return source?.id===file.id||source?.renderedFromMidiId===file.id;
      })){
        setSpace('create');router.replace({pathname:'/music-workspace/[id]',params:{id:project.id,tab:'create'}});return;
      }
      const audible=isMidiSource(file)?await renderMidiSource(file):file;
      const files=audible===file?project.files:[...project.files,audible];
      const next=!existing?(()=>{
        const created=makeWorkingVersion(audible,music.versions.length+1);
        return {...music,versions:[...music.versions,created],activeVersionId:created.id};
      })():changeWorkingVersion(music,{
        ...existing,tracks:[...existing.tracks,makeWorkingTrack(audible)],
      });
      update({files,musicNext:next});
      setSpace('create');router.replace({pathname:'/music-workspace/[id]',params:{id:project.id,tab:'create'}});
    }catch(e){
      setMidiConversionError(e instanceof Error?e.message:
        'La conversion MIDI vers audio a échoué.');
    }finally{addingRef.current=false;setConvertingMidi(false);}
  };
  const start=(file:MusicProjectFile)=>{void addFromCapture(file,true);};
  const useFile=(file:MusicProjectFile)=>{void addFromCapture(file);};
  const spaces: {id:Space; title:string; icon:keyof typeof Ionicons.glyphMap}[]=[
    {id:'capture',title:'Capturer',icon:'mic-outline'},
    {id:'create',title:'Créer',icon:'layers-outline'},
    {id:'collaborate',title:'Collaborer',icon:'people-outline'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      width:'100%',maxWidth:ws.maxWidth,alignSelf:'center',
      paddingHorizontal:ws.gutter,
      paddingTop:desktop?16:8,paddingBottom:desktop?56:120,
      gap:compact?18:desktop?20:25}}>
      {/* Song actions replace the title in the top bar. The song title is
          displayed once above the saved items inside Capturer. */}
      <PageHeader onBack={()=>router.replace('/music-hub')} center={
      <View style={{flex:desktop?undefined:1,minWidth:0,flexDirection:'row',
        alignItems:'center',justifyContent:'center',gap:desktop?20:3}}>
        {spaces.map(item=>{
          const selected=space===item.id;
          return <Pressable key={item.id} onPress={()=>{setSpace(item.id);router.replace({pathname:'/music-workspace/[id]',params:{id:project.id,tab:item.id}});}}
            accessibilityRole="tab" accessibilityLabel={item.title}
            accessibilityState={{selected}}
            style={{flex:desktop?undefined:1,
              flexDirection:'row',alignItems:'center',
              justifyContent:'center',gap:compact?5:desktop?8:9,
              minHeight:desktop?46:52,borderBottomWidth:selected?2:0,
              borderBottomColor:selected?PINK:'transparent',
              paddingHorizontal:desktop?12:3}}>
            <Ionicons name={item.icon} size={compact?22:desktop?18:19}
              color={selected?PINK:theme.muted}/>
            {(desktop||!compact||selected)?<Text numberOfLines={1}
              style={{fontSize:compact?12:desktop?14:14,
                fontWeight:selected?'700':'500',
                color:selected?theme.foreground:theme.muted}}>
              {item.title}
            </Text>:null}
          </Pressable>;
        })}
      </View>
      }/>
      {space==='capture'&&intent==='new-version'?
        <View style={{flexDirection:'row',alignItems:'flex-start',gap:11,
          paddingHorizontal:14,paddingVertical:13,borderRadius:12,
          backgroundColor:theme.dark?'#372B31':'#F9EDF2'}}>
          <Ionicons name="add-circle-outline" size={20} color={PINK}/>
          <View style={{flex:1,gap:4}}>
            <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
              Nouvelle version
            </Text>
            <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
              Choisis une prise audio ou MIDI ci-dessous pour démarrer une nouvelle version.
              Tes enregistrements d'origine restent dans Capturer.
            </Text>
          </View>
        </View>:null}
      {error ? <Text style={{color:'#B94D63',fontSize:12}}>{error}</Text> : null}
      {convertingMidi?<Text style={{fontSize:12,color:PINK}}>
        Conversion MIDI en prise WAV… L’original reste dans Capturer.
      </Text>:null}
      {midiConversionError?<Text style={{fontSize:12,color:'#B94D63'}}>
        {midiConversionError}
      </Text>:null}
      {space==='capture' ? <MusicCaptureExperience project={project} patch={update}
        onStartVersion={start} onUseFile={useFile} hasVersion={!!version}
        newVersionMode={intent==='new-version'}
        quickAction={intent==='write'||intent==='upload'||intent==='play'||
          intent==='record'?intent:undefined}/> : null}
      {space==='create' ? <MusicCreateExperience project={project} patch={update}
        onCapture={()=>{setSpace('capture');router.replace({pathname:'/music-workspace/[id]',params:{id:project.id,tab:'capture'}});}}/> : null}
      {space==='collaborate' ?
        <MusicCollaborateExperience project={project} patch={update}/> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
