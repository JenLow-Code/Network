import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicSongCard } from '@/components/music/MusicSongCard';
import { MusicTile } from '@/components/music/MusicTile';
import type { MusicCollaborator } from '@/components/music/MusicCollaboratorAvatars';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { readMusicLibraryLayout, type MusicLibraryLayout } from '@/domain/musicLibraryPreferences';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';
import { api } from '@/lib/api/client';
import { fetchDemoMusicPreview, type DemoMusicPreview } from '@/lib/api/musicPreview';

type Proposal = {
  id:string;
  trackPublicationId:string;
  trackTitle:string;
  status:string;
  createdAt?:string;
  publisher?:MusicCollaborator;
  proposer?:MusicCollaborator;
  isDemo?:boolean;
  direction:'received'|'sent';
};

export default function MusicLibrary() {
  const {width} = useWindowDimensions();
  const ws = workspaceLayout(width);
  const theme = useAppTheme();
  const {email} = useApp();
  const {items,ready,error} = useMusicWorkspaces();
  const [layout,setLayout] = useState<MusicLibraryLayout>('cards');
  const [proposals,setProposals] = useState<Proposal[]>([]);
  const [preview,setPreview] = useState<DemoMusicPreview|null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    void readMusicLibraryLayout(email).then(value => {
      if(live)setLayout(value);
    }).catch(() => {});
    return () => { live = false; };
  },[email]));

  useEffect(() => {
    let live=true;
    void Promise.allSettled([
      api<{items: Omit<Proposal,'direction'>[]}>('/api/me/music-proposals?role=sent',{auth:'required'}),
      api<{items: Omit<Proposal,'direction'>[]}>('/api/me/music-proposals?role=received',{auth:'required'}),
    ]).then(([sent,received]) => {
      if(!live)return;
      setProposals([
        ...(sent.status==='fulfilled'?(sent.value.items||[]).map(p=>({...p,direction:'sent' as const})):[]),
        ...(received.status==='fulfilled'?(received.value.items||[]).map(p=>({...p,direction:'received' as const})):[]),
      ]);
    });
    return()=>{live=false;};
  },[email]);

  useEffect(() => {
    if(process.env.EXPO_PUBLIC_DISCOVERY_SOURCE==='unified')return;
    let live=true;
    void fetchDemoMusicPreview().then(v=>{if(live)setPreview(v);})
      .catch(()=>{if(live)setPreview(null);});
    return()=>{live=false;};
  },[]);

  const songs=useMemo(() => [...items].sort((a,b)=>
    (b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt)),[items]);
  const accepted=[...proposals.filter(p=>p.status==='accepted'||p.status==='published'),
    ...(preview?.collaborations || [])];
  const mineIds=new Set(songs.map(song=>song.publishedId).filter(Boolean));
  const peopleFor=(song:typeof songs[number]):MusicCollaborator[]=>{
    const acceptedPeople=song.publishedId?accepted
      .filter(p=>p.trackPublicationId===song.publishedId&&!p.isDemo)
      .map(p=>p.direction==='received'?p.proposer:p.publisher)
      .filter((person):person is MusicCollaborator=>!!person?.displayName):[];
    const credited=song.layers.filter(layer=>layer.contributor?.trim() &&
      layer.contributor.trim().toLowerCase()!==song.ownerName.trim().toLowerCase() &&
      !['moi','me','you'].includes(layer.contributor.trim().toLowerCase()))
      .map(layer=>({displayName:layer.contributor.trim()}));
    return [...acceptedPeople,...credited];
  };
  const shared=new Map<string,{
    title:string;first:Proposal;people:MusicCollaborator[];demo:boolean;
  }>();
  for(const p of accepted){
    if(!p.trackPublicationId||mineIds.has(p.trackPublicationId))continue;
    let piece=shared.get(p.trackPublicationId);
    if(!piece){
      piece={title:p.trackTitle,first:p,people:[],demo:!!p.isDemo};
      shared.set(p.trackPublicationId,piece);
    }
    for(const person of [p.publisher,p.proposer]){
      if(person?.displayName&&!piece.people.some(x=>x.displayName===person.displayName)){
        piece.people.push(person);
      }
    }
  }
  const columns=width<340?1:width<700?2:width<950?3:width<1100?4:5;
  const availableWidth=Math.min(width,ws.maxWidth||width)-ws.gutter*2;
  const cardWidth=Math.max(142,Math.floor((availableWidth-(columns-1)*14)/columns));
  const count=songs.length+shared.size;

  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView contentContainerStyle={{
      ...workspaceCanvas(width),paddingTop:8,paddingBottom:110,gap:20,
    }}>
      <PageHeader title="Mes morceaux"/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{color:theme.muted,fontSize:12}}>
          {count} {count===1?'morceau':'morceaux'} · {layout==='cards'?'Cartes':'Liste'}
        </Text>
        <Pressable onPress={()=>router.push('/music/new')} accessibilityRole="button"
          accessibilityLabel="Créer un morceau"
          style={{paddingHorizontal:13,height:38,borderRadius:19,alignItems:'center',
            flexDirection:'row',gap:4,backgroundColor:'#CB245C'}}>
          <Ionicons name="add" color="#FFFFFF" size={20}/>
          <Text style={{color:'#FFFFFF',fontWeight:'700',fontSize:12}}>Créer</Text>
        </Pressable>
      </View>
      {!ready?<ActivityIndicator color="#CB245C"/>:null}
      {error?<Text style={{color:'#CB245C',fontSize:12}}>{error}</Text>:null}
      {count?<View style={layout==='list'?{gap:1}:{
        flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',
        columnGap:14,rowGap:22,
      }}>
        {songs.map(song=><MusicSongCard key={song.id} song={song}
          layout={layout} width={cardWidth} participants={peopleFor(song)}
          pendingCount={proposals.filter(p=>p.direction==='received' &&
            p.status==='submitted' && p.trackPublicationId===song.publishedId).length}/>)}
        {[...shared.entries()].map(([id,p])=><MusicTile key={id}
          title={p.title} width={cardWidth} mode="draft" layout={layout}
          byline="Morceau partagé"
          detail={p.people.map(person=>person.displayName).join(' · ')}
          status="En collaboration" participants={p.people} demo={p.demo}
          onPress={()=>router.push(p.first.direction==='sent'
            ? {pathname:'/music-collaboration/[id]',params:{id}}
            : {pathname:'/music/[id]',params:{id}})}/>)}
      </View>:ready?<Text style={{color:theme.muted,fontSize:13}}>
        Aucun morceau pour le moment.
      </Text>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
