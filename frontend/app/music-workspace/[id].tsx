import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { useAppTheme } from '@/theme/AppTheme';
import { MusicWorkspaceScreen } from '@/components/music/MusicWorkspaceScreen';
import { api } from '@/lib/api/client';

type Space = 'capture'|'create'|'collaborate';
const PINK='#CB245C';

export default function MusicWorkspace() {
  const {id,tab,intent}=useLocalSearchParams<{id:string;tab?:Space;intent?:string}>();
  const {items,patch,ready,error}=useMusicWorkspaces();
  const theme=useAppTheme();
  const project=items.find(item=>item.id===id);
  const [hasCollaborators,setHasCollaborators]=useState(false);
  useEffect(()=>{
    let live=true;
    const publicationId=project?.publishedId;
    if(!publicationId){setHasCollaborators(false);return;}
    void api<{members:{id:string}[]}>('/api/music/'+
      encodeURIComponent(publicationId)+'/collaborators',{auth:'required'})
      .then(response=>{if(live)setHasCollaborators(response.members.length>1);})
      .catch(()=>{if(live)setHasCollaborators(false);});
    return()=>{live=false;};
  },[project?.publishedId]);
  if (!ready) return <SafeAreaView style={{flex:1,backgroundColor:theme.background,
    justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color={PINK}/><Nav/>
  </SafeAreaView>;
  if (!project) return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{padding:22,gap:13}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <Text style={{color:theme.foreground,fontSize:19,fontWeight:'700'}}>Espace de création indisponible</Text>
      <Text style={{color:theme.muted,fontSize:13,lineHeight:20}}>
        {error || 'Ce morceau est introuvable ou inaccessible.'}
      </Text>
    </View>
    <Nav/>
  </SafeAreaView>;
  return <MusicWorkspaceScreen key={project.id} project={project} update={value=>patch(project.id,value)}
    tab={tab} intent={intent} error={error} showEditor={hasCollaborators}/>;
}
