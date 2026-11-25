import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicSongCard } from '@/components/music/MusicSongCard';
import { MusicTile } from '@/components/music/MusicTile';
import type { MusicCollaborator } from '@/components/music/MusicCollaboratorAvatars';
import { readMusicLibraryLayout, type MusicLibraryLayout } from '@/domain/musicLibraryPreferences';
import { useMusicWorkspaces, type MusicProject } from '@/domain/musicWorkspace';
import { matchesForMe, type SavedTalent } from '@/domain/personalDiscovery';
import { useApp } from '@/context/AppContext';
import { useDiscovery } from '@/lib/api/hooks';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout, workspaceCanvas } from '@/theme/workspaceLayout';
import type { MusicPublication } from '@/domain/publication';

const PINK = '#CB245C';

type Proposal = {
  id: string;
  trackTitle: string;
  trackPublicationId: string;
  description: string;
  status: string;
  createdAt?: string;
  reviewState?: string;
  proposer?: MusicCollaborator;
  publisher?: MusicCollaborator;
};
type ProposalItem = Proposal & { direction: 'received' | 'sent' };
type SharedPiece = {
  publicationId: string;
  title: string;
  primary: ProposalItem;
  participants: MusicCollaborator[];
  pending: boolean;
};

/**
 * The music home has just two families:
 * - My pieces: privately owned workspaces + authorised shared pieces.
 * - For me: real requests matching skills, plus proposals not yet accepted.
 *
 * An accepted proposal is a property of the SONG, never a third category.
 * A submitted proposal is not collaboration membership.
 */
export default function MusicHub() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const ws = workspaceLayout(width);
  const narrow = width < 700;
  // Unlike the former 1/2/3 layout, five small tiles fit the desktop music shelf.
  const columns = width < 340 ? 1 : width < 700 ? 2 :
    width < 950 ? 3 : width < 1100 ? 4 : 5;
  const availableWidth = Math.max(0,Math.min(width, ws.maxWidth || width) - ws.contentGutter - ws.gutter);
  const gutter = 14;
  // Keep three cassette thumbnails fully visible across a phone viewport.
  // Extra items scroll horizontally like a music streaming app.
  const tileWidth = narrow
    ? Math.min(142, Math.max(70, Math.floor((availableWidth - 16) / 3)))
    : Math.min(188, Math.max(150,
        Math.floor((availableWidth - (columns - 1) * gutter) / columns)));
  const app = useApp();
  const { items, ready, error } = useMusicWorkspaces();
  const discovery = useDiscovery({ type: 'music' });
  const [layout, setLayout] = useState<MusicLibraryLayout>('cards');
  const [talents, setTalents] = useState<SavedTalent[]>([]);
  const [sent, setSent] = useState<Proposal[]>([]);
  const [received, setReceived] = useState<Proposal[]>([]);
  const [requestsError, setRequestsError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([
      readMusicLibraryLayout(app.email),
      api<{items:SavedTalent[]}>('/api/me/talents',{auth:'required'}),
    ]).then(([preferred, result]) => {
      if (!active) return;
      setLayout(preferred);
      setTalents(result.items.filter(t=>typeof t.name==='string'&&t.name.trim().length>0));
    }).catch(() => {
      if (active) { setLayout('cards'); setTalents([]); }
    });
    return () => { active = false; };
  }, [app.email]));

  useEffect(() => {
    let live = true;
    setSent([]); setReceived([]); setRequestsError(false);
    void Promise.allSettled([
      api<{items: Proposal[]}>('/api/me/music-proposals?role=sent', {auth:'required'}),
      api<{items: Proposal[]}>('/api/me/music-proposals?role=received', {auth:'required'}),
    ]).then(([outgoing, incoming]) => {
      if (!live) return;
      setSent(outgoing.status === 'fulfilled' ? outgoing.value.items || [] : []);
      setReceived(incoming.status === 'fulfilled' ? incoming.value.items || [] : []);
      setRequestsError(outgoing.status === 'rejected' || incoming.status === 'rejected');
    });
    return () => { live = false; };
  }, [app.email]);

  const songs = useMemo(() => [...items].sort((a,b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)), [items]);
  const proposals = useMemo<ProposalItem[]>(() => [
    ...received.map(p => ({...p, direction:'received' as const})),
    ...sent.map(p => ({...p, direction:'sent' as const})),
  ].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [sent, received]);

  const accepted = proposals.filter(p => p.status === 'accepted' || p.status === 'published');
  const publishedLocalIds = new Set(songs.map(song => song.publishedId).filter(
    (id): id is string => !!id,
  ));

  const peopleForLocal = (song: MusicProject): MusicCollaborator[] => {
    const acceptedPeople = song.publishedId ? accepted
      .filter(p => p.trackPublicationId === song.publishedId)
      .flatMap(p => p.direction === 'received' ? [p.proposer] : [p.publisher])
      .filter((person): person is MusicCollaborator => !!person?.displayName) : [];
    // Attribution entered by the owner on a local track is a real contributor
    // reference; a private invitation draft is NOT an accepted participant.
    const credited = song.layers.filter(layer => layer.contributor?.trim() &&
      layer.contributor.trim().toLowerCase() !== song.ownerName.trim().toLowerCase() &&
      !['moi','me','you'].includes(layer.contributor.trim().toLowerCase()))
      .map(layer => ({displayName:layer.contributor.trim()}));
    return [...acceptedPeople, ...credited];
  };

  // One remote/shared song card even when several contributors have joined it.
  const sharedPieces = useMemo(() => {
    const grouped = new Map<string, SharedPiece>();
    const ensure = (proposal: ProposalItem, pending: boolean) => {
      const id = proposal.trackPublicationId;
      if (!id || publishedLocalIds.has(id)) return null;
      let piece = grouped.get(id);
      if (!piece) {
        piece = {
          publicationId:id, title:proposal.trackTitle, primary:proposal,
          participants:[], pending,
        };
        grouped.set(id,piece);
      }
      // Never turn an unaccepted application into a confirmed collaborator.
      if (!pending) {
        for (const person of [proposal.publisher, proposal.proposer]) {
          if (person?.displayName && !piece.participants.some(p =>
            p.displayName === person.displayName)) piece.participants.push(person);
        }
        piece.pending = false;
        piece.primary = proposal;
      }
      return piece;
    };
    accepted.forEach(p => ensure(p,false));
    // Received requests still refer to a song I own, but are not collaborations yet.
    proposals.filter(p => p.direction === 'received' &&
      (p.status === 'submitted' || p.status === 'draft')).forEach(p => ensure(p,true));
    return [...grouped.values()];
  }, [accepted, proposals, songs]);

  const opportunities = useMemo(() => discovery.state === 'ready'
    ? discovery.items.filter((p): p is MusicPublication =>
      p.type === 'music' && p.source === 'api' &&
      !!p.requestedTalents?.length && matchesForMe(p,talents) &&
      !publishedLocalIds.has(p.id))
    : [], [discovery.state, discovery.items, talents, songs]);
  const recommended:MusicPublication[]=opportunities.length ? opportunities : discovery.state==='ready'
    ? discovery.items.filter((p):p is MusicPublication=>p.type==='music'&&p.source==='api'&&!publishedLocalIds.has(p.id)) : [];
  // An outgoing, unanswered proposal remains in For me, not in My pieces.
  const pendingSent = proposals.filter(p => p.direction === 'sent' &&
    (p.status === 'submitted' || p.status === 'draft') &&
    !recommended.some(song => song.id === p.trackPublicationId));
  const myCount = songs.length + sharedPieces.length;
  const forMeCount = recommended.length + pendingSent.length;
  // For me is a shelf, not a detail panel: every cassette opens the
  // dedicated, music-focused listening page. The page fetches its own
  // catalog so direct URLs, refreshes and mobile song swipes work too.
  const openForMe=(id:string)=>router.push({pathname:'/music-listen/[id]',
    params:{id,from:'music-tab'}});

  // A personal music tile is ALWAYS a workspace entry, never the Discovery
  // player. The latter is exclusively for music the viewer is exploring.
  const openMyPiece = (p: ProposalItem) => {
    const project=items.find(song=>song.publishedId===p.trackPublicationId);
    if(project){
      router.push({pathname:'/music-workspace/[id]',
        params:{id:project.id,tab:p.direction==='received'?'collaborate':'capture'}});
      return;
    }
    router.push({pathname:'/music-collaboration/[id]',
      params:{id:p.trackPublicationId,
        tab:p.direction==='received'?'collaborate':'capture'}});
  };
  const sectionTitle = (title:string,count:number) => <View style={{
    flexDirection:'row',alignItems:'baseline',gap:9,
  }}>
    <Text style={{fontWeight:'800',fontSize:narrow?20:22,color:theme.foreground,
      letterSpacing:-0.5}}>{title}</Text>
    <Text style={{fontSize:12,fontWeight:'600',color:theme.muted}}>{count}</Text>
  </View>;

  const empty = (label:string,action:string,onPress:()=>void) =>
    <Pressable onPress={onPress} accessibilityRole="button"
      style={{flexDirection:'row',gap:11,alignItems:'center',borderRadius:14,
        backgroundColor:theme.dark?'#24242A':'#F4EDE7',
        paddingHorizontal:15,paddingVertical:13,maxWidth:480}}>
      <Ionicons name="musical-notes-outline" size={19} color={PINK}/>
      <View style={{gap:5,flex:1}}>
        <Text style={{color:theme.foreground,fontSize:12}}>{label}</Text>
        <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>{action}</Text>
      </View>
      <Ionicons name="arrow-forward-outline" size={17} color={PINK}/>
    </Pressable>;

  const tileContainer = {flexDirection:'row' as const,flexWrap:'wrap' as const,
    columnGap:gutter,rowGap:22,alignItems:'flex-start' as const};
  const musicShelf = (tiles:React.ReactNode[]) => layout === 'list'
    ? <View style={{gap:1}}>{tiles}</View>
    : narrow
      ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{flexGrow:0,marginRight:-ws.gutter}}
          contentContainerStyle={{gap:8,paddingRight:ws.gutter+8,paddingBottom:4}}>
          {tiles}
        </ScrollView>
      : <View style={tileContainer}>{tiles}</View>;

  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      ...workspaceCanvas(width),paddingTop:12,paddingBottom:125,
      gap:narrow?30:37,
    }}>
      <PageHeader title="Musique"/>

      <View style={{gap:17}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',
          gap:12,alignItems:'center'}}>
          {sectionTitle('Mes morceaux',myCount)}
          <Pressable accessibilityRole="button"
            accessibilityLabel="Créer un nouveau morceau"
            onPress={() => router.push('/music/new')}
            style={{minHeight:37,borderRadius:20,backgroundColor:PINK,
              paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:5}}>
            <Ionicons name="add" size={19} color="#FFFFFF"/>
            <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>Créer</Text>
          </Pressable>
        </View>
        {!ready ? <ActivityIndicator color={PINK}/> : null}
        {error ? <Text style={{color:PINK,fontSize:12}}>{error}</Text> : null}
        {myCount ? musicShelf([
          ...songs.map(song => <MusicSongCard key={song.id}
            song={song} layout={layout}
            width={tileWidth} participants={peopleForLocal(song)}
            pendingCount={proposals.filter(p => p.direction === 'received' &&
              p.status === 'submitted' && p.trackPublicationId === song.publishedId).length}/>),
          ...sharedPieces.map(piece => <MusicTile
            key={'shared-'+piece.publicationId} width={tileWidth}
            title={piece.title} mode="draft" layout={layout}
            byline=""
            participants={piece.participants}
            status={piece.pending?'À examiner':undefined}
            onPress={() => openMyPiece(piece.primary)}/>)
        ]) : ready && !error ? empty('Ton premier morceau commence ici.',
          'Créer un morceau',() => router.push('/music/new')) : null}
        {requestsError ? <Text style={{color:theme.muted,fontSize:10}}>
          Les morceaux partagés nécessitent une session API connectée.
        </Text> : null}
      </View>

      <View style={{gap:16}}>
        <View style={{gap:5}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
            flexWrap:'wrap',gap:10}}>
            {sectionTitle('Pour moi',forMeCount)}
            <Pressable accessibilityRole="button"
              accessibilityLabel="Découvrir tous les morceaux dans Discovery"
              onPress={() => router.push({pathname:'/discover',params:{filter:'Musique'}})}
              style={{minHeight:38,paddingHorizontal:7,flexDirection:'row',alignItems:'center',gap:6}}>
              <Text style={{color:PINK,fontSize:12,fontWeight:'700'}}>Découvrir tout</Text>
              <Ionicons name="arrow-forward-outline" color={PINK} size={16}/>
            </Pressable>
          </View>
        </View>
        {forMeCount ? musicShelf([
          ...recommended.map(song => <MusicTile key={song.id}
            width={tileWidth} layout={layout} mode="cassette"
            title={song.title} byline={song.author}
            detail={song.requestedTalents?.length
              ? 'Recherche : ' + song.requestedTalents.join(' · ') : 'À découvrir'}
            artwork={song.coverArt || song.image} audioUrl={song.audioUrl}
            onPress={() => openForMe(song.id)}
            onLearnMore={() => openForMe(song.id)}/>),
          ...pendingSent.map(p => <MusicTile key={'pending-'+p.id}
            width={tileWidth} layout={layout} mode="cassette"
            title={p.trackTitle} byline={p.publisher?.displayName || 'Morceau proposé'}
            detail={p.description} status={p.status === 'submitted'
              ? 'Réponse en attente' : 'Proposition en brouillon'}
            onPress={() => openForMe(p.trackPublicationId)}
            onLearnMore={() => openForMe(p.trackPublicationId)}/>)
        ]) : empty('Aucune proposition musicale pour le moment.',
          'Découvrir la musique',() => router.push({
            pathname:'/discover',params:{filter:'Musique'},
          }))}
      </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
