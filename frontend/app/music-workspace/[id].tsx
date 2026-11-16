import React,{useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {Nav} from '@/components/navigation/Nav';
import {PageHeader} from '@/components/navigation/PageHeader';
import {useAppTheme} from '@/theme/AppTheme';
import {useMusicWorkspaces} from '@/domain/musicWorkspace';
import {makeWorkingVersion,musicNextState,makeWorkingTrack,
  changeWorkingVersion} from '@/domain/musicNext';
import {MusicFolderCover} from '@/components/music/MusicFolderCover';
import {MusicCanvasV3} from '@/components/music/MusicCanvasV3';
import {MusicStudioV3} from '@/components/music/MusicStudioV3';
import {MusicCollaborateNext} from '@/components/music/MusicCollaborateNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
const pink='#CB245C';
type Space='capture'|'studio'|'collaborate';

/** JenLow Network / Music — a clean new UI generation.
 * Old recordings, files and published versions are deliberately preserved. */
export default function MusicWorkspace(){
  const {id}=useLocalSearchParams<{id:string}>();
  const {items,patch,ready,error}=useMusicWorkspaces();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<640;
  const project=items.find(item=>item.id===id);
  const [space,setSpace]=useState<Space>('capture');
  if(!ready)return <SafeAreaView style={{flex:1,backgroundColor:theme.background,
    justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color={pink}/><Nav/>
  </SafeAreaView>;
  if(!project)return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{padding:21,gap:14}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
        Morceau introuvable
      </Text>
      <Text style={{fontSize:12,color:theme.muted}}>
        Les morceaux enregistrés localement restent liés à leur navigateur.
      </Text>
    </View><Nav/>
  </SafeAreaView>;
  const state=musicNextState(project);
  const activeVersion=state.versions.find(v=>v.id===state.activeVersionId)||
    state.versions[0];
  const update=(change:Partial<typeof project>)=>patch(project.id,change);
  const startVersion=(source:MusicProjectFile)=>{
    const v=makeWorkingVersion(source,state.versions.length+1);
    update({musicNext:{...state,versions:[...state.versions,v],activeVersionId:v.id}});
    setSpace('studio');
  };
  const useSource=(source:MusicProjectFile)=>{
    if(!activeVersion){startVersion(source);return;}
    if(activeVersion.tracks.some(t=>t.sourceFileId===source.id))return;
    update({musicNext:changeWorkingVersion(state,{
      ...activeVersion,tracks:[...activeVersion.tracks,makeWorkingTrack(source)],
    })});
    setSpace('studio');
  };
  const tabs:{id:Space;label:string}[]=[
    {id:'capture',label:'Matière créative'},
    {id:'studio',label:'Versions'},
    {id:'collaborate',label:'Collaborer'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{flex:1}}
      contentContainerStyle={{width:'100%',maxWidth:900,alignSelf:'center',
        paddingHorizontal:compact?16:30,paddingTop:11,paddingBottom:110,gap:17}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Musique"/>
      <View style={{flexDirection:'row',alignItems:'center',gap:13}}>
        <MusicFolderCover project={project} size={compact?66:87}/>
        <View style={{flex:1,gap:5}}>
          <Text style={{fontSize:compact?22:27,lineHeight:compact?29:36,
            fontWeight:'700',color:theme.foreground}} numberOfLines={2}>
            {project.title}
          </Text>
          {project.description?<Text numberOfLines={2}
            style={{fontSize:12,lineHeight:18,color:theme.muted}}>
            {project.description}
          </Text>:null}
          <Text style={{fontSize:11,color:theme.muted}}>
            {state.versions.length?state.versions.length+' version(s) de travail':'Création libre'}
          </Text>
        </View>
      </View>
      {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
      <View style={{flexDirection:'row',borderBottomWidth:1,borderColor:theme.border}}>
        {tabs.map(tab=><Pressable key={tab.id}
          onPress={()=>setSpace(tab.id)} accessibilityRole="tab"
          accessibilityState={{selected:space===tab.id}}
          style={{flex:1,minHeight:47,paddingHorizontal:3,paddingVertical:12,
            borderBottomWidth:space===tab.id?3:0,
            borderBottomColor:pink,alignItems:'center',justifyContent:'center'}}>
          <Text style={{fontSize:12,fontWeight:space===tab.id?'700':'500',
            color:space===tab.id?pink:theme.muted}} numberOfLines={1}>
            {tab.label}
          </Text>
        </Pressable>)}
      </View>
      {space==='capture'?<MusicCanvasV3 project={project} patch={update}
        activeVersion={!!activeVersion} onStartVersion={startVersion}
        onUseFile={useSource}/>:
      space==='studio'?<MusicStudioV3 project={project} patch={update}
        onCapture={()=>setSpace('capture')}/>:
        <MusicCollaborateNext project={project} patch={update}/>}
    </ScrollView><Nav/>
  </SafeAreaView>;
}
