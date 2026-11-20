import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { TopActions } from '@/components/navigation/TopActions';
import { MusicFolderCover } from '@/components/music/MusicFolderCover';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
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
  proposer?: { displayName?: string };
};
type ProposalItem = Proposal & { direction: 'received' | 'sent' };

function proposalStatus(status: string, received: boolean) {
  switch (status) {
    case 'submitted': return received ? 'À examiner' : 'En attente';
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
  const app = useApp();
  const { items, ready, error } = useMusicWorkspaces();
  const discovery = useDiscovery();
  const [sent, setSent] = useState<Proposal[]>([]);
  const [received, setReceived] = useState<Proposal[]>([]);
  const [requestsError, setRequestsError] = useState(false);

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

  const saved = useMemo(() => discovery.state === 'ready'
    ? discovery.items.filter((p): p is MusicPublication =>
        p.type === 'music' && (app.fireIds.includes(p.id) || app.musicProposalIds.includes(p.id)))
    : [], [discovery.state, discovery.items, app.fireIds, app.musicProposalIds]);
  const toDiscover = useMemo(() => discovery.items.filter((p): p is MusicPublication =>
    p.type === 'music' && !saved.some(s => s.id === p.id)).slice(0, 8), [discovery.items, saved]);
  const songs = useMemo(() => [...items].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)), [items]);
  const proposals = useMemo<ProposalItem[]>(() => [
    ...received.map(p => ({ ...p, direction: 'received' as const })),
    ...sent.map(p => ({ ...p, direction: 'sent' as const })),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [received, sent]);
  const panelColor = theme.dark ? '#28242A' : '#FFFCF8';
  const softColor = theme.dark ? '#332832' : '#F9EEF2';
  const openDiscovery = () => router.push({ pathname: '/discover', params: { filter: 'Musique' } });
  const sectionTitle = (title: string, count?: number) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
    <Text style={{ color: theme.foreground, fontSize: compact ? 20 : 22,
      fontWeight: '700', letterSpacing: -0.4 }}>{title}</Text>
    {count ? <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '600' }}>{count}</Text> : null}
  </View>;
  const openProposal = (p: ProposalItem) => {
    if (p.direction === 'received') {
      const project = items.find(song => song.publishedId === p.trackPublicationId);
      if (project) {
        router.push({ pathname: '/music-workspace/[id]', params: { id: project.id } });
        return;
      }
    }
    router.push(p.direction === 'sent' && (p.status === 'accepted' || p.status === 'published')
      ? { pathname: '/music-collaboration/[id]', params: { id: p.trackPublicationId } }
      : { pathname: '/music/[id]', params: { id: p.trackPublicationId } });
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      paddingHorizontal: ws.gutter, paddingTop: desktop ? 8 : 4, paddingBottom: 125,
      maxWidth: ws.maxWidth, width: '100%', alignSelf: 'center', gap: compact ? 25 : 29,
    }}>
      {desktop ? <>
        <PageHeader />
        <Text style={{ color: theme.foreground, fontSize: 24, lineHeight: 32,
          fontWeight: '700', letterSpacing: -0.5 }}>Musique</Text>
      </> : <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/discover')}
          style={{ width: 42, height: 44, justifyContent: 'center' }}>
          <Ionicons name="arrow-back-outline" size={23} color={theme.foreground} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 21, fontWeight: '700',
          letterSpacing: -0.4, color: theme.foreground }}>Musique</Text>
        <TopActions />
      </View>}

      <View style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', gap: 12 }}>
          {sectionTitle('Mes morceaux', items.length)}
          <Pressable onPress={() => router.push('/music/new')} accessibilityRole="button"
            accessibilityLabel="Créer une nouvelle chanson"
            style={{ height: 38, borderRadius: 20, backgroundColor: PINK,
              paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="add" color="#FFF" size={19}/>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Créer</Text>
          </Pressable>
        </View>
        {!ready ? <ActivityIndicator color={PINK} /> : null}
        {error ? <Text style={{ color: '#B84D63', fontSize: 12 }}>{error}</Text> : null}
        {ready && !items.length ? <View style={{
          backgroundColor: panelColor, borderColor: theme.border, borderWidth: 1,
          borderRadius: 18, padding: compact ? 17 : 23, flexDirection: 'row',
          alignItems: 'center', gap: 16,
        }}>
          <View style={{ width: compact ? 64 : 78, height: compact ? 64 : 78,
            borderRadius: 17, backgroundColor: softColor, alignItems: 'center',
            justifyContent: 'center' }}>
            <Ionicons name="musical-notes-outline" size={30} color={PINK}/>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.foreground, fontWeight: '700',
              fontSize: compact ? 15 : 17 }}>Une chanson à commencer ?</Text>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>
              Rassemble tes idées, tes paroles et tes enregistrements dans un même espace.
            </Text>
          </View>
        </View> : null}
        {songs.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {songs.map(song => {
            const working = musicNextState(song).versions.length;
            const versions = Math.max(working, song.versions.length);
            const talentNeeds = song.needs.filter(need => need.kind === 'talent');
            return <Pressable key={song.id} accessibilityRole="button"
              accessibilityLabel={'Ouvrir ' + song.title}
              onPress={() => router.push({ pathname: '/music-workspace/[id]', params: { id: song.id } })}
              style={{ width: desktop ? '49%' : '100%', borderWidth: 1,
                borderColor: theme.border, borderRadius: 18, backgroundColor: panelColor,
                padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <MusicFolderCover project={song} size={compact ? 92 : 108}/>
              <View style={{ flex: 1, gap: 7 }}>
                <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '700',
                  color: theme.foreground }}>{song.title}</Text>
                {song.description ? <Text numberOfLines={2} style={{ color: theme.muted,
                  fontSize: 12, lineHeight: 18 }}>{song.description}</Text> : null}
                <Text style={{ fontSize: 11, color: theme.muted }}>
                  {song.files.length} {song.files.length === 1 ? 'fichier' : 'fichiers'}
                  {versions ? ` · ${versions} ${versions === 1 ? 'version' : 'versions'}` : ''}
                </Text>
                {talentNeeds.length ? <Text numberOfLines={1} style={{ color: PINK,
                  fontSize: 11, fontWeight: '600' }}>
                  Talents recherchés : {talentNeeds.map(need => need.label).join(', ')}
                </Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
            </Pressable>;
          })}
        </View> : null}
      </View>

      <View style={{ gap: 13 }}>
        {sectionTitle('Collaborations', proposals.length)}
        {proposals.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {proposals.map(p => {
            const incoming = p.direction === 'received';
            return <Pressable key={`${p.direction}-${p.id}`} accessibilityRole="button"
              accessibilityLabel={`Ouvrir ${p.trackTitle}`}
              onPress={() => openProposal(p)}
              style={{ width: desktop ? '49%' : '100%', padding: 15,
                borderRadius: 17, borderColor: theme.border, borderWidth: 1,
                backgroundColor: panelColor, gap: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 37, height: 37, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center', backgroundColor: softColor }}>
                  <Ionicons name={incoming ? 'mail-unread-outline' : 'paper-plane-outline'}
                    color={PINK} size={18}/>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 11, color: theme.muted }}>
                    {incoming ? 'Demande reçue' : 'Proposition envoyée'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: theme.foreground,
                    fontWeight: '700', fontSize: 15 }}>{p.trackTitle}</Text>
                </View>
                <Text style={{ color: incoming && p.status === 'submitted' ? PINK : theme.muted,
                  fontWeight: '600', fontSize: 11 }}>
                  {proposalStatus(p.status, incoming)}
                </Text>
              </View>
              {p.description ? <Text numberOfLines={2} style={{ fontSize: 12,
                lineHeight: 19, color: theme.muted }}>{p.description}</Text> : null}
              {incoming && p.proposer?.displayName ? <Text style={{ fontSize: 11,
                color: theme.muted }}>De {p.proposer.displayName}</Text> : null}
            </Pressable>;
          })}
        </View> : <Pressable onPress={openDiscovery} accessibilityRole="button"
          style={{ borderRadius: 17, backgroundColor: panelColor, borderWidth: 1,
            borderColor: theme.border, padding: 16, flexDirection: 'row',
            alignItems: 'center', gap: 13 }}>
          <View style={{ width: 43, height: 43, borderRadius: 14,
            justifyContent: 'center', alignItems: 'center', backgroundColor: softColor }}>
            <Ionicons name="people-outline" size={21} color={PINK}/>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '700' }}>
              La musique se crée aussi à plusieurs.
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Découvre des morceaux auxquels contribuer.
            </Text>
          </View>
          <Ionicons name="arrow-forward-outline" size={19} color={PINK}/>
        </Pressable>}
        {requestsError ? <Text style={{ fontSize: 12, color: theme.muted }}>
          Certaines demandes en ligne ne sont pas accessibles pour le moment.
        </Text> : null}
      </View>

      {saved.length ? <View style={{ gap: 13 }}>
        {sectionTitle('Enregistrés', saved.length)}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 2 }}>
          {saved.map(song => <Pressable key={song.id} accessibilityRole="button"
            accessibilityLabel={'Ouvrir ' + song.title}
            onPress={() => router.push({ pathname: '/music/[id]', params: { id: song.id } })}
            style={{ width: compact ? 196 : 224, padding: 13, borderRadius: 17,
              backgroundColor: panelColor, borderWidth: 1, borderColor: theme.border, gap: 10 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 110 }}>
              <CassetteArtwork width={178} height={108} title={song.title}
                artwork={song.coverArt || song.image} transparent/>
            </View>
            <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 14,
              color: theme.foreground }}>{song.title}</Text>
            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{song.author}</Text>
          </Pressable>)}
        </ScrollView>
      </View> : null}

      <View style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', gap: 10 }}>
          {sectionTitle('À découvrir')}
          <Pressable onPress={openDiscovery} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7 }}>
            <Text style={{ color: PINK, fontSize: 12, fontWeight: '700' }}>Voir tout</Text>
            <Ionicons name="arrow-forward" size={15} color={PINK}/>
          </Pressable>
        </View>
        {toDiscover.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 2 }}>
          {toDiscover.map(song => <Pressable key={song.id} accessibilityRole="button"
            accessibilityLabel={'Découvrir ' + song.title}
            onPress={() => router.push({ pathname: '/music/[id]', params: { id: song.id } })}
            style={{ width: compact ? 216 : 246, padding: 13, borderRadius: 17,
              backgroundColor: panelColor, borderColor: theme.border, borderWidth: 1, gap: 9 }}>
            <View style={{ height: compact ? 132 : 150, alignItems: 'center',
              justifyContent: 'center', borderRadius: 12, backgroundColor: softColor }}>
              <CassetteArtwork width={compact ? 191 : 220} height={compact ? 126 : 145}
                title={song.title} artwork={song.coverArt || song.image} transparent/>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700',
              color: theme.foreground }}>{song.title}</Text>
            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{song.author}</Text>
          </Pressable>)}
        </ScrollView> : <Pressable onPress={openDiscovery} accessibilityRole="button"
          style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 17,
            padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: panelColor }}>
          <Ionicons name="headset-outline" color={PINK} size={25}/>
          <Text style={{ color: theme.foreground, fontSize: 13, flex: 1,
            lineHeight: 19 }}>Explore les chansons partagées sur JenLow.</Text>
          <Ionicons name="arrow-forward-outline" size={18} color={PINK}/>
        </Pressable>}
      </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
