import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicFolderCover } from '@/components/music/MusicFolderCover';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
import { useApp } from '@/context/AppContext';
import { useDiscovery } from '@/lib/api/hooks';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout,WORKSPACE_TITLE_GAP } from '@/theme/workspaceLayout';
import type { MusicPublication } from '@/domain/publication';

const PINK = '#CB245C';
type Shelf = 'songs' | 'collaborations' | 'saved';
type SentProposal = { id: string; trackTitle: string; trackPublicationId: string; description: string; status: string };

export default function MusicHub() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 630;
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const ws=workspaceLayout(width);
  const app = useApp();
  const { items, ready, error } = useMusicWorkspaces();
  const discovery = useDiscovery();
  const [shelf, setShelf] = useState<Shelf>('songs');
  const [sent, setSent] = useState<SentProposal[]>([]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let mounted = true;
    void api<{items: SentProposal[]}>('/api/me/music-proposals?role=sent', {auth:'required'})
      .then(value => { if (mounted) {setSent(value.items || []);setOffline(false);} })
      .catch(() => { if (mounted) setOffline(true); });
    return () => { mounted = false; };
  }, [app.email]);
  const saved = useMemo(() => discovery.state === 'ready'
    ? discovery.items.filter((p): p is MusicPublication =>
        p.type === 'music' && (app.fireIds.includes(p.id) || app.musicProposalIds.includes(p.id)))
    : [], [discovery.state, discovery.items, app.fireIds, app.musicProposalIds]);
  const tab = (id:Shelf, label:string, count?:number) => {
    const selected = shelf === id;
    return <Pressable key={id} onPress={() => setShelf(id)} accessibilityRole="tab"
      accessibilityState={{selected}}
      style={{minHeight:45,marginRight:21,borderBottomWidth:selected?2:0,
        borderBottomColor:PINK,justifyContent:'center',flexDirection:'row',alignItems:'center',gap:5}}>
      <Text style={{fontSize:13,fontWeight:selected?'700':'500',
        color:selected?theme.foreground:theme.muted}}>{label}</Text>
      {count ? <Text style={{fontSize:11,color:selected?PINK:theme.muted}}>{count}</Text> : null}
    </Pressable>;
  };
  const sectionHeading = (name:string, description?:string) => <View style={{gap:5}}>
    <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>{name}</Text>
    {description ? <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>{description}</Text> : null}
  </View>;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      paddingHorizontal:ws.gutter,paddingTop:8,paddingBottom:115,
      maxWidth:ws.maxWidth,width:'100%',alignSelf:'center',gap:WORKSPACE_TITLE_GAP}}>
      <PageHeader />
      <View style={{gap:9}}>
        <Text style={{fontSize:compact?34:40,fontWeight:'700',color:theme.foreground,
          letterSpacing:-1.2}}>Musique</Text>
        <Text style={{fontSize:14,lineHeight:23,color:theme.muted,maxWidth:520}}>
          Mes morceaux, mes collaborations et mes favoris.
        </Text>
      </View>
      <Pressable onPress={() => router.push('/music/new')} accessibilityRole="button"
        style={{backgroundColor:PINK,alignSelf:'flex-start',borderRadius:13,
          minHeight:47,paddingHorizontal:19,flexDirection:'row',alignItems:'center',gap:9}}>
        <Ionicons name="add" size={21} color="#fff"/>
        <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Nouvelle chanson</Text>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{borderBottomWidth:1,borderBottomColor:theme.border,
          alignItems:'stretch',paddingRight:20}}>
        {tab('songs','Mes chansons',items.length)}
        {tab('collaborations','Collaborations',sent.length)}
        {tab('saved','Enregistrés',saved.length)}
      </ScrollView>
      {shelf === 'songs' ? <View style={{gap:17}}>
        {sectionHeading('Mes chansons','Morceaux en cours et brouillons enregistrés sur cet appareil.')}
        {!ready ? <ActivityIndicator color={PINK}/> : null}
        {error ? <Text style={{fontSize:12,color:'#B84D63'}}>{error}</Text> : null}
        {ready && !items.length ? <View style={{paddingVertical:40,gap:15,
          alignItems:'center',borderTopWidth:1,borderColor:theme.border}}>
          <Ionicons name="musical-notes-outline" color={PINK} size={31}/>
          <Text style={{color:theme.foreground,fontWeight:'600',fontSize:16}}>Aucune chanson pour le moment.</Text>
          <Text style={{color:theme.muted,lineHeight:21,textAlign:'center',fontSize:13,maxWidth:290}}>
            Crée un morceau, puis ajoute des paroles, des fichiers ou des enregistrements.
          </Text>
          <Pressable onPress={() => router.push('/music/new')}
            accessibilityRole="button" style={{padding:12}}>
            <Text style={{color:PINK,fontWeight:'700',fontSize:13}}>Créer ma première chanson</Text>
          </Pressable>
        </View> : null}
        {items.map((song, index) => {
          const versions = musicNextState(song).versions.length;
          const path = {pathname:'/music-workspace/[id]' as const, params:{id:song.id}};
          return <Pressable key={song.id} onPress={() => router.push(path)}
            accessibilityRole="button" accessibilityLabel={'Ouvrir '+song.title}
            style={{paddingVertical:index===0?14:12,borderBottomWidth:1,borderColor:theme.border,
              flexDirection:'row',gap:15,alignItems:'center'}}>
            <MusicFolderCover project={song} size={compact?77:95}/>
            <View style={{flex:1,gap:6}}>
              <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}
                numberOfLines={2}>{song.title}</Text>
              {song.description ? <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}
                numberOfLines={2}>{song.description}</Text> : null}
              <Text style={{fontSize:11,color:theme.muted}}>
                {song.files.length} {song.files.length===1?'idée':'idées'} · {versions}
                {versions===1?' version':' versions'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
          </Pressable>;
        })}
      </View> : null}
      {shelf === 'collaborations' ? <View style={{gap:17}}>
        {sectionHeading('Mes collaborations',
          'Les chansons auxquelles tu contribues restent liées à leur auteur.')}
        {sent.map(p => <Pressable key={p.id} accessibilityRole="button"
          onPress={() => router.push(p.status==='accepted'||p.status==='published'
            ? {pathname:'/music-collaboration/[id]',params:{id:p.trackPublicationId}}
            : {pathname:'/music/[id]',params:{id:p.trackPublicationId}})}
          style={{flexDirection:'row',alignItems:'center',gap:13,borderBottomWidth:1,
            borderColor:theme.border,paddingVertical:14}}>
          <View style={{width:42,height:42,borderRadius:21,backgroundColor:theme.dark?'#382630':'#F8E8EE',
            alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="people-outline" color={PINK} size={20}/>
          </View>
          <View style={{flex:1,gap:5}}>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'600'}}>{p.trackTitle}</Text>
            <Text numberOfLines={2} style={{color:theme.muted,fontSize:12}}>{p.description||'Contribution musicale'}</Text>
            <Text style={{color:PINK,fontSize:11}}>Proposition · {p.status}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
        </Pressable>)}
        {!sent.length ? <Text style={{color:theme.muted,lineHeight:21,fontSize:13}}>
          {offline ? 'Les collaborations en ligne ne sont pas accessibles avec cette session.'
            : 'Aucune collaboration pour le moment. Découvre une chanson pour proposer ta contribution.'}
        </Text> : null}
        <Pressable onPress={() => router.push('/discover')} style={{paddingVertical:8,alignSelf:'flex-start'}}>
          <Text style={{color:PINK,fontSize:13,fontWeight:'700'}}>Découvrir des chansons</Text>
        </Pressable>
      </View> : null}
      {shelf === 'saved' ? <View style={{gap:16}}>
        {sectionHeading('Chansons enregistrées',
          'Les publications musicales que tu as aimées ou repérées.')}
        {saved.map(song => <Pressable key={song.id} accessibilityRole="button"
          onPress={() => router.push({pathname:'/music/[id]',params:{id:song.id}})}
          style={{borderBottomWidth:1,borderColor:theme.border,paddingVertical:12,
            flexDirection:'row',alignItems:'center',gap:15}}>
          <View style={{width:105,height:72,justifyContent:'center',alignItems:'center'}}>
            <CassetteArtwork width={100} height={70} title={song.title}
              artwork={song.coverArt||song.image} transparent/>
          </View>
          <View style={{flex:1,gap:5}}>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{song.title}</Text>
            <Text style={{color:theme.muted,fontSize:12}}>{song.author}</Text>
          </View>
          <Ionicons name="arrow-forward-outline" color={theme.muted} size={18}/>
        </Pressable>)}
        {!saved.length ? <Text style={{color:theme.muted,fontSize:13,lineHeight:21}}>
          Aucune chanson enregistrée. Les publications musicales restent accessibles dans Discovery.
        </Text> : null}
        <Pressable onPress={() => router.push('/discover')} style={{paddingVertical:8,alignSelf:'flex-start'}}>
          <Text style={{color:PINK,fontWeight:'700',fontSize:13}}>Ouvrir Discovery</Text>
        </Pressable>
      </View> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
