import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicCaptureExperience } from '@/components/music/MusicCaptureExperience';
import { MusicCreateExperience } from '@/components/music/MusicCreateExperience';
import { MusicCollaborateExperience } from '@/components/music/MusicCollaborateExperience';
import { MusicWorkspaceTabs } from '@/components/music/MusicWorkspaceTabs';
import { musicNextState, makeWorkingVersion, makeWorkingTrack, changeWorkingVersion } from '@/domain/musicNext';
import {isMidiSource,renderMidiSource} from '@/domain/musicMidiAudio';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import type { MusicProject, MusicProjectFile } from '@/domain/musicWorkspace';
import type { SharedWorkspaceAccess } from './MusicCollaborateExperience';

type Space = 'capture'|'create'|'collaborate';
const PINK='#CB245C';

type SharedAccess=SharedWorkspaceAccess;
type Props={project:MusicProject;update:(changes:Partial<MusicProject>)=>void;tab?:Space;intent?:string;
  error?:string|null;showEditor?:boolean;shared?:SharedAccess};

/** The only music editor screen. Route adapters supply the data and authorization. */
export function MusicWorkspaceScreen({project,update,tab,intent,error,showEditor=false,shared}:Props) {
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
  const addingRef=useRef(false);
  const [midiConversionError,setMidiConversionError]=useState('');
  const [convertingMidi,setConvertingMidi]=useState(false);
  const navigate=(next:Space)=>{
    setSpace(next);
    if(shared)router.replace({pathname:'/music-collaboration/[id]',params:{id:project.id,tab:next}});
    else router.replace({pathname:'/music-workspace/[id]',params:{id:project.id,tab:next}});
  };
  const music=musicNextState(project);
  const version=music.versions.find(v=>v.id===music.activeVersionId)||music.versions[0];
  const addFromCapture=async(file:MusicProjectFile,forceNew=false)=>{
    if(shared||addingRef.current)return;
    addingRef.current=true;setMidiConversionError('');
    setConvertingMidi(isMidiSource(file));
    try{
      const existing=forceNew?undefined:version;
      if(existing?.tracks.some(track=>{
        const source=project.files.find(item=>item.id===track.sourceFileId);
        return source?.id===file.id||source?.renderedFromMidiId===file.id;
      })){
        navigate('create');return;
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
      navigate('create');
    }catch(e){
      setMidiConversionError(e instanceof Error?e.message:
        'La conversion MIDI vers audio a échoué.');
    }finally{addingRef.current=false;setConvertingMidi(false);}
  };
  const start=(file:MusicProjectFile)=>{void addFromCapture(file,true);};
  const useFile=(file:MusicProjectFile)=>{void addFromCapture(file);};
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      width:'100%',maxWidth:ws.maxWidth,alignSelf:'center',
      paddingLeft:ws.contentGutter,paddingRight:ws.gutter,
      paddingTop:12,paddingBottom:desktop?56:120,
      gap:compact?18:desktop?20:25}}>
      {/* Song actions replace the title in the top bar. The song title is
          displayed once above the saved items inside Capturer. */}
      <PageHeader onBack={()=>router.replace('/music-hub')} center={
        <MusicWorkspaceTabs space={space} compact={compact} desktop={desktop}
          onChange={navigate}/>
      }/>
      {shared?<Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
        {shared.demo?'Aperçu de démonstration · lecture seule':'Lecture seule · les fichiers et versions de travail partagés ne sont pas encore synchronisés.'}
      </Text>:null}
      {!shared&&space==='capture'&&intent==='new-version'?
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
        showEditor={showEditor||!!shared} readOnly={!!shared}
        newVersionMode={!shared&&intent==='new-version'}
        quickAction={!shared&&(intent==='write'||intent==='upload'||intent==='play'||
          intent==='record')?intent:undefined}/> : null}
      {space==='create' ? <MusicCreateExperience project={project} patch={update}
        onCapture={()=>navigate('capture')}/> : null}
      {space==='collaborate' ?
        <MusicCollaborateExperience project={project} patch={update} shared={shared}/> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
