import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicSongCard } from '@/components/music/MusicSongCard';
import { MusicCollaboratorAvatars, type MusicCollaborator } from '@/components/music/MusicCollaboratorAvatars';
import { MusicAudioPreview } from '@/components/music/MusicAudioPreview';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
import { readMusicLibraryLayout, type MusicLibraryLayout } from '@/domain/musicLibraryPreferences';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { matchesForMe, profileTalentStorageKey, type SavedTalent } from '@/domain/personalDiscovery';
import { useApp } from '@/context/AppContext';
import { useDiscovery } from '@/lib/api/hooks';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import type { MusicPublication } from '@/domain/publication';

const PINK = '#CB245C';
type Proposal = {
  id: string;
  trackTitle: string;
  trackPublicationId: string;
  description: string;
  status: string;
  createdAt?: string;
  reviewState?:string;
  proposer?: MusicCollaborator;
  publisher?: MusicCollaborator;
};
type ProposalItem = Proposal & { direction: 'received' | 'sent' };

function proposalStatus(status: string, received: boolean, reviewState?:string) {
  switch (status) {
    case 'submitted': return received
      ?reviewState==='archived'?'Archivée · rappel à venir':
        reviewState==='testing'?'En cours d’examen':'À examiner'
      :reviewState==='in_review'?'Ta proposition est à l’étude':'En attente';
    case 'accepted': return 'Acceptée';
    case 'rejected': return 'Refusée';
    case 'published': return 'Publiée';
    case 'withdrawn': return 'Retirée';
    case 'draft': return 'Brouillon';
    default: return status;
  }
}

export default function MusicHub() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const ws = workspaceLayout(width);
  const compact = width < 630;
  const desktop = Platform.OS === 'web' && ws.desktop;
  // Real responsive grids: no sideways scrolling to find a song or a person.
  const columns = compact ? 1 : desktop ? 3 : 2;
  const usableWidth = Math.min(width, ws.maxWidth || width) - ws.gutter * 2;
  const cardWidth = Math.max(200, Math.floor((usableWidth - (columns - 1) * 12) / columns));
  const songPreviewCount = compact ? 2 : desktop ? 3 : 4;
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
      AsyncStorage.getItem(profileTalentStorageKey(app.email)),
    ]).then(([preferred, raw]) => {
      if (!active) return;
      setLayout(preferred);
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        setTalents(Array.isArray(parsed) ? parsed.filter(
          (value): value is SavedTalent => !!value && typeof value === 'object' &&
            typeof (value as SavedTalent).name === 'string',
        ) : []);
      } catch { setTalents([]); }
    }).catch(() => { if (active) {setLayout('cards');setTalents([]);} });
    return () => { active = false; };
  }, [app.email]));

  useEffect(() => {
    let mounted = true;
    setSent([]);
    setReceived([]);
    setRequestsError(false);
    void Promise.allSettled([
      api<{ items: Proposal[] }>('/api/me/music-proposals?role=sent', { auth: 'required' }),
      api<{ items: Proposal[] }>('/api/me/music-proposals?role=received', { auth: 'required' }),
    ]).then(([outgoing, incoming]) => {
      if (!mounted) return;
      setSent(outgoing.status === 'fulfilled' ? outgoing.value.items || [] : []);
      setReceived(incoming.status === 'fulfilled' ? incoming.value.items || [] : []);
      setRequestsError(outgoing.status === 'rejected' || incoming.status === 'rejected');
    });
    return () => { mounted = false; };
  }, [app.email]);

  const songs = useMemo(() => [...items].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)), [items]);
  const saved = useMemo(() => discovery.state === 'ready'
    ? discovery.items.filter((p): p is MusicPublication => p.type === 'music' &&
      (app.fireIds.includes(p.id) || app.musicProposalIds.includes(p.id)))
    : [], [discovery.state, discovery.items, app.fireIds, app.musicProposalIds]);

  /** Never use the generic Discovery feed as an opportunity list.
   * Source must be a real API publication, with a specific unfilled talent
   * request and a match against the viewer's saved talents. Mock songs have
   * neither the source nor a confirmed open request.
   *
   * The backend must expose request state and authorized circle-only
   * opportunities before those can appear. Private local needs never leak.
   */
  const opportunities = useMemo(() => discovery.state === 'ready'
    ? discovery.items.filter((p): p is MusicPublication =>
        p.type === 'music' && p.source === 'api' &&
        !!p.requestedTalents?.length && matchesForMe(p, talents) &&
        !items.some(local => local.publishedId === p.id))
    : [], [discovery.state, discovery.items, talents, items]);

  const proposals = useMemo<ProposalItem[]>(() => [
    ...received.map(p => ({ ...p, direction: 'received' as const })),
    ...sent.map(p => ({ ...p, direction: 'sent' as const })),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [received, sent]);
  const active = proposals.filter(p => p.status === 'accepted' || p.status === 'published');
  const pending = proposals.filter(p => p.status !== 'accepted' && p.status !== 'published' &&
    p.status !== 'withdrawn' && p.status !== 'rejected');
  const panelColor = theme.dark ? '#28242A' : '#FFFCF8';
  const softColor = theme.dark ? '#332832' : '#F9EEF2';

  const sectionTitle = (title: string, count?: number) => <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 8,
  }}>
    <Text style={{ color: theme.foreground, fontSize: compact ? 20 : 22,
      fontWeight: '700', letterSpacing: -0.4 }}>{title}</Text>
    {count ? <Text style={{ color: theme.muted, fontSize: 12,
      fontWeight: '600' }}>{count}</Text> : null}
  </View>;
  const viewAll = (title: string, onPress: () => void) => <Pressable
    onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
    style={{ flexDirection: 'row', gap: 5, alignItems: 'center',
      paddingVertical: 8, paddingHorizontal: 3 }}>
    <Text style={{ color: PINK, fontWeight: '700', fontSize: 12 }}>Voir tout</Text>
    <Ionicons name="arrow-forward-outline" color={PINK} size={15}/>
  </Pressable>;
  const openProposal = (p: ProposalItem) => {
    if (p.direction === 'received') {
      const project = items.find(song => song.publishedId === p.trackPublicationId);
      if (project) {
        router.push({ pathname: '/music-workspace/[id]', params: { id: project.id,tab:'collaborate' } });
        return;
      }
    }
    router.push(p.direction === 'sent' && (p.status === 'accepted' || p.status === 'published')
      ? { pathname: '/music-collaboration/[id]', params: { id: p.trackPublicationId } }
      : { pathname: '/music/[id]', params: { id: p.trackPublicationId } });
  };
  const proposalCard = (p: ProposalItem) => {
    const incoming = p.direction === 'received';
    return <Pressable key={p.direction + ':' + p.id}
      accessibilityRole="button" accessibilityLabel={'Ouvrir ' + p.trackTitle}
      onPress={() => openProposal(p)}
      style={{ width: cardWidth, padding: 14,
        borderRadius: 16, borderColor: theme.border, borderWidth: 1,
        backgroundColor: panelColor, gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11,
          alignItems: 'center', justifyContent: 'center', backgroundColor: softColor }}>
          <Ionicons name={incoming ? 'mail-unread-outline' : 'paper-plane-outline'}
            color={PINK} size={17}/>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 11, color: theme.muted }}>
            {incoming ? 'Demande reçue' : 'Proposition envoyée'}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.foreground,
            fontWeight: '700', fontSize: 14 }}>{p.trackTitle}</Text>
        </View>
      </View>
      {p.description ? <Text numberOfLines={2} style={{ color: theme.muted,
        fontSize: 12, lineHeight: 18 }}>{p.description}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ fontSize: 11, color: theme.muted }} numberOfLines={1}>
          {incoming ? p.proposer?.displayName || 'Musicien' : 'Ma proposition'}
        </Text>
        <Text style={{ fontSize: 11, color: incoming && p.status === 'submitted' ? PINK : theme.muted,
          fontWeight: '700' }}>{proposalStatus(p.status, incoming,p.reviewState)}</Text>
      </View>
    </Pressable>;
  };

  const collaborationCard = (p: ProposalItem) => <Pressable
    key={p.direction + ':' + p.id} onPress={() => openProposal(p)}
    accessibilityRole="button" accessibilityLabel={'Ouvrir la collaboration ' + p.trackTitle}
    style={{ width: cardWidth, minHeight: 144, padding: 16, borderRadius: 17,
      borderWidth: 1, borderColor: theme.border, backgroundColor: panelColor,
      gap: 13, justifyContent: 'space-between' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <MusicCollaboratorAvatars publisher={p.publisher} proposer={p.proposer} size={46}/>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text numberOfLines={2} style={{
          color: theme.foreground, fontSize: 15, fontWeight: '700',
        }}>{p.trackTitle}</Text>
        <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>
          {p.publisher?.displayName || 'Auteur'} · {p.proposer?.displayName || 'Collaborateur'}
        </Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', gap: 8 }}>
      <Text style={{ color: p.status === 'published' ? theme.muted : PINK,
        fontSize: 11, fontWeight: '700' }}>
        {p.status === 'published' ? 'Publiée' : 'En collaboration'}
      </Text>
      <Ionicons name="arrow-forward-outline" size={18} color={theme.muted}/>
    </View>
  </Pressable>;

  const emptyCard = (message: string, action: string, icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void) => <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: compact ? 15 : 19,
    borderWidth: 1, borderColor: theme.border, borderRadius: 16,
    backgroundColor: panelColor,
  }}>
    <View style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: softColor,
      alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={21} color={PINK}/>
    </View>
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress}
        style={{ minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ color: PINK, fontSize: 12, fontWeight: '700' }}>{action}</Text>
        <Ionicons name="arrow-forward-outline" color={PINK} size={14}/>
      </Pressable>
    </View>
  </View>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      paddingHorizontal: ws.gutter, paddingTop: desktop ? 8 : 4, paddingBottom: 125,
      maxWidth: ws.maxWidth, width: '100%', alignSelf: 'center', gap: compact ? 27 : 31,
    }}>
      <PageHeader title="Musique" />

      <View style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', gap: 12 }}>
          {sectionTitle('Mes morceaux', songs.length)}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            {songs.length > (layout === 'cards' ? songPreviewCount : 3) ?
              viewAll('Voir tous mes morceaux', () => router.push('/music-library')) : null}
            <Pressable onPress={() => router.push('/music/new')} accessibilityRole="button"
              accessibilityLabel="Créer une nouvelle chanson"
              style={{ height: 38, borderRadius: 20, backgroundColor: PINK,
                paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="add" color="#FFF" size={19}/>
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Créer</Text>
            </Pressable>
          </View>
        </View>
        {!ready ? <ActivityIndicator color={PINK}/> : null}
        {error ? <Text style={{ color: '#B84D63', fontSize: 12 }}>{error}</Text> : null}
        {ready && !songs.length ? emptyCard(
          'Ton premier morceau commence avec une idée.',
          'Créer un morceau', 'create-outline',
          () => router.push('/music/new'),
        ) : null}
        {songs.length ? layout === 'cards'
          ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12,
              alignItems: 'stretch' }}>
              {songs.slice(0, songPreviewCount).map(song =>
                <MusicSongCard key={song.id} song={song}
                  layout="cards" width={cardWidth}/>)}
            </View>
          : <View style={{ gap: 0 }}>
              {songs.slice(0, 3).map(song => <MusicSongCard key={song.id}
                song={song} layout="list"/>)}
            </View> : null}
      </View>

      <View style={{ gap: 13 }}>
        {sectionTitle('Pour moi', opportunities.length)}
        {opportunities.length ? <>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Des morceaux partagés qui cherchent tes talents.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap',
            gap: 12, alignItems: 'stretch' }}>
            {opportunities.map(song => <View key={song.id} style={{
              width: cardWidth, borderRadius: 17, padding: 14,
              borderWidth: 1, borderColor: theme.border, backgroundColor: panelColor,
              gap: 12, justifyContent: 'space-between',
            }}>
              <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + song.title}
                onPress={() => router.push({ pathname: '/music/[id]', params: { id: song.id } })}
                style={{ gap: 8, alignItems: 'center' }}>
                <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center',
                  minHeight: 190, borderRadius: 13, backgroundColor: softColor,
                  overflow: 'hidden' }}>
                  <CassetteArtwork width={Math.min(cardWidth - 30, 330)} height={190}
                    title={song.title} artwork={song.coverArt || song.image} transparent/>
                </View>
                <View style={{ alignSelf: 'stretch', gap: 5 }}>
                  <Text numberOfLines={2} style={{ color: theme.foreground,
                    fontWeight: '700', fontSize: 15 }}>{song.title}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted,
                    fontSize: 12 }}>{song.author}</Text>
                  <Text numberOfLines={2} style={{ color: PINK, fontSize: 11,
                    fontWeight: '600' }}>Recherche : {song.requestedTalents?.join(', ')}</Text>
                </View>
              </Pressable>
              {song.audioUrl ? <MusicAudioPreview source={{ audioUrl: song.audioUrl }}/> : (
                <Pressable accessibilityRole="button" onPress={() =>
                  router.push({ pathname: '/music/[id]', params: { id: song.id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5 }}>
                  <Ionicons name="play-circle-outline" size={21} color={PINK}/>
                  <Text style={{ color: PINK, fontSize: 12 }}>Ouvrir pour écouter</Text>
                </Pressable>
              )}
            </View>)}
          </View>
        </> : emptyCard(
          'Aucun appel ne correspond encore à tes talents.',
          talents.length ? 'Découvrir les collaborations' : 'Ajouter mes talents',
          'headset-outline',
          () => router.push(talents.length
            ? { pathname: '/discover', params: { filter: 'Musique' } } : '/profile'),
        )}
      </View>

      <View style={{ gap: 13 }}>
        {sectionTitle('Mes collaborations', active.length + pending.length)}
        {active.length ? <View style={{ gap: 9 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.foreground }}>
            Projets partagés
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {active.map(collaborationCard)}
          </View>
        </View> : null}
        {pending.length ? <View style={{ gap: 9 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.foreground }}>
            Propositions en attente
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {pending.map(proposalCard)}
          </View>
        </View> : null}
        {!active.length && !pending.length && !requestsError ? emptyCard(
          'Les morceaux que tu construis avec d’autres apparaîtront ici.',
          'Découvrir les appels à collaboration', 'people-outline',
          () => router.push({ pathname: '/discover', params: { filter: 'Musique' } }),
        ) : null}
        {requestsError ? <Text style={{ fontSize: 12, color: theme.muted }}>
          Certaines propositions en ligne ne sont pas accessibles avec cette session.
        </Text> : null}
      </View>

      {saved.length ? <View style={{ gap: 13 }}>
        {sectionTitle('Enregistrés', saved.length)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {saved.map(song => <Pressable key={song.id} accessibilityRole="button"
            accessibilityLabel={'Ouvrir ' + song.title}
            onPress={() => router.push({ pathname: '/music/[id]', params: { id: song.id } })}
            style={{ width: cardWidth, padding: 13, borderRadius: 17,
              backgroundColor: panelColor, borderWidth: 1, borderColor: theme.border, gap: 10 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 116 }}>
              <CassetteArtwork width={187} height={112} title={song.title}
                artwork={song.coverArt || song.image} transparent/>
            </View>
            <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 14,
              color: theme.foreground }}>{song.title}</Text>
            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{song.author}</Text>
          </Pressable>)}
        </View>
      </View> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
