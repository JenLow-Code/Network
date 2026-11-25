import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
import { DetailMoreDrawer } from '@/components/detail/DetailMoreDrawer';
import { MusicWaveform } from '@/components/music/MusicWaveform';
import { MusicLyrics } from '@/components/music/MusicLyrics';
import { MusicMoreDetails } from '@/components/music/MusicMoreDetails';
import { EditorialInline } from '@/components/detail/EditorialInline';
import { usePublication } from '@/lib/api/hooks';
import { useAppTheme } from '@/theme/AppTheme';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { api } from '@/lib/api/client';
import type { MusicPublication } from '@/domain/publication';

/**
 * Same editorial song detail as Discovery, but launched inside Musique.
 * Only the authenticated publication API supplies songs.
 */
export default function MusicDetail() {
  const { id, from, openMore } = useLocalSearchParams<{ id:string; from?:string; openMore?:string }>();
  const theme = useAppTheme();
  const {items:workspaces,ready:workspacesReady}=useMusicWorkspaces();
  const [workspaceChecked,setWorkspaceChecked]=useState(false);
  const checkPersonalRoute=from==='music-tab'&&!!id;
  const remote = usePublication(id);

  // Defense in depth: old links and an out-of-date music shelf may still
  // point an accepted collaborator to the publication player. If the viewer
  // has a local owned project, enter it directly; otherwise ask the server
  // whether the viewer is an actual member before redirecting. No membership
  // is inferred from a submitted or fictional proposal.
  useEffect(()=>{
    if(!checkPersonalRoute){setWorkspaceChecked(true);return;}
    if(!workspacesReady)return;
    let alive=true;
    setWorkspaceChecked(false);
    const localProject=workspaces.find(song=>song.id===id||song.publishedId===id);
    if(localProject){
      router.replace({pathname:'/music-workspace/[id]',
        params:{id:localProject.id,tab:'capture'}});
      return ()=>{alive=false;};
    }
    void api<{conversationId:string}>('/api/music/'+
      encodeURIComponent(id!)+'/conversation',{auth:'required'})
      .then(()=>{
        if(alive)router.replace({pathname:'/music-collaboration/[id]',
          params:{id:id!,tab:'capture'}});
      })
      .catch(()=>{if(alive)setWorkspaceChecked(true);});
    return ()=>{alive=false;};
  },[checkPersonalRoute,id,workspaces,workspacesReady]);

  const item: MusicPublication | undefined = remote.item?.type === 'music' ? remote.item : undefined;
  const loading = remote.state === 'loading';

  // Do not briefly flash the cassette player while verifying workspace access.
  if (checkPersonalRoute&&(!workspacesReady||!workspaceChecked)) return <View
    style={{flex:1,backgroundColor:theme.background,
      justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color="#CB245C"/>
  </View>;

  if (!item && loading) return <View style={{flex:1,backgroundColor:theme.background,
    justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color="#CB245C"/>
  </View>;
  if (!item) return <View style={{flex:1,backgroundColor:theme.background,
    padding:24,gap:16,justifyContent:'center'}}>
    <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
      Ce morceau n’est pas accessible.
    </Text>
    <Text style={{fontSize:13,color:theme.muted,lineHeight:20}}>
      Impossible de retrouver les détails de ce morceau dans les données disponibles.
    </Text>
    <Pressable onPress={() => router.replace('/music-hub')}
      accessibilityRole="button" accessibilityLabel="Retour à Musique"
      style={{paddingVertical:12}}>
      <Text style={{color:'#CB245C',fontWeight:'700'}}>Retour à Musique</Text>
    </Pressable>
  </View>;

  return <MusicWaveform index={item.audioIndex} uri={item.audioUrl}
    renderLayout={(_button, wave, time, seek, togglePlayback, isPlaying) => (
      <PublicationDetail item={item} onCoverPress={togglePlayback}
        musicPlaying={isPlaying} previewOnly={false}>
        <EditorialInline bottomSpace={12}>
          <View style={{gap:9}}>
            <View>{wave}</View>
            <MusicLyrics lines={item.lyrics || []} currentTime={time} onSeek={seek}/>
          </View>
        </EditorialInline>
        <DetailMoreDrawer key={item.id} heading={item.title} subtitle={'Musique · ' + item.author}
          defaultOpen={openMore === '1'}>
          <MusicMoreDetails item={item}/>
        </DetailMoreDrawer>
      </PublicationDetail>
    )}
  />;
}
