import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useDiscovery } from '@/lib/api/hooks';
import { useApp } from '@/context/AppContext';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { musics } from '@/mocks/publications';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
import type { MusicPublication } from '@/domain/publication';

type Tab = 'mine' | 'collabs' | 'saved' | 'explore';
type SentProposal = {
  id: string; trackTitle: string; trackPublicationId: string;
  status: string; description: string; publishedTrackId?: string | null;
};
const pink = '#CB245C';

export default function MusicHub() {
  const { mine } = useLocalSearchParams<{ mine?: string }>();
  const theme = useAppTheme();
  const app = useApp();
  const { items: projects, ready, error } = useMusicWorkspaces();
  const feed = useDiscovery();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const [tab, setTab] = useState<Tab>(mine === '1' ? 'mine' : 'mine');
  const [sent, setSent] = useState<SentProposal[]>([]);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void api<{ items: SentProposal[] }>('/api/me/music-proposals?role=sent', { auth: 'required' })
      .then(result => { if (live) setSent(result.items || []); })
      .catch(() => { if (live) setRemoteError('Les collaborations en ligne ne sont pas accessibles avec la session actuelle.'); });
    return () => { live = false; };
  }, [app.email]);

  const publicMusic: MusicPublication[] = useMemo(
    () => (feed.state === 'ready' ? feed.items.filter((p): p is MusicPublication => p.type === 'music') : musics),
    [feed.state, feed.items],
  );
  const saved = publicMusic.filter(p => app.fireIds.includes(p.id) || app.musicProposalIds.includes(p.id));
  const legacyMine = publicMusic.filter(p => p.author === app.name &&
    !projects.some(project => project.publishedId === p.id));

  const tabs: { key: Tab; title: string }[] = [
    { key: 'mine', title: 'Mes morceaux' },
    { key: 'collabs', title: 'Mes collaborations' },
    { key: 'saved', title: 'Enregistrés' },
    { key: 'explore', title: 'Découvrir' },
  ];
  const publicCard = (music: MusicPublication) => (
    <Pressable key={music.id} accessibilityRole="button" accessibilityLabel={'Écouter ' + music.title}
      onPress={() => router.push({ pathname: '/music/[id]', params: { id: music.id, from: 'music-tab' } })}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 13,
        borderBottomWidth: 1, borderColor: theme.border }}>
      <View style={{ width: compact ? 94 : 124, height: compact ? 74 : 93, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center' }}>
        <CassetteArtwork width={compact ? 94 : 124} height={compact ? 74 : 93}
          title={music.title} artwork={music.coverArt || music.image} transparent/>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>{music.title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{music.author}</Text>
        {app.musicProposalIds.includes(music.id) ?
          <Text style={{ color: pink, fontSize: 11 }}>Repéré pour une collaboration</Text> : null}
      </View>
      <Ionicons name="arrow-forward-outline" size={18} color={theme.foreground}/>
    </Pressable>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: compact ? 18 : 26, paddingTop: 12,
          paddingBottom: 100, maxWidth: 870, width: '100%', alignSelf: 'center', gap: 20 }}>
        <PageHeader/>
        <View style={{ gap: 8, paddingBottom: 6 }}>
          <Text style={{ fontSize: compact ? 30 : 34, fontWeight: '700', color: theme.foreground }}>Musique</Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 21, maxWidth: 560 }}>
            Tes morceaux prennent vie ici, avec leurs paroles, leurs pistes et les talents qui s'y rencontrent.
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/music/new')}
          style={{ backgroundColor: pink, borderRadius: 12, minHeight: 47, paddingHorizontal: 17,
            alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="add" color="#fff" size={21}/>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Nouveau morceau</Text>
        </Pressable>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {tabs.map(item => <Pressable key={item.key} onPress={() => setTab(item.key)}
            accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }}
            style={{ minHeight: 43, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12,
              borderWidth: 1, borderColor: tab === item.key ? pink : theme.border,
              backgroundColor: tab === item.key ? (theme.dark ? '#47283C' : '#FAE8F0') : theme.surface }}>
            <Text style={{ color: tab === item.key ? pink : theme.foreground, fontWeight: tab === item.key ? '700' : '500', fontSize: 12 }}>
              {item.title}
            </Text>
          </Pressable>)}
        </ScrollView>
        {error ? <Text style={{ color: '#C34D65', fontSize: 12 }}>{error}</Text> : null}
        {!ready ? <ActivityIndicator color={pink}/> : null}
        {tab === 'mine' && ready ? <View style={{ gap: 10 }}>
          <Text style={{ color: theme.foreground, fontSize: 19, fontWeight: '700' }}>Mes morceaux</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Ton atelier musical · morceaux et versions en cours</Text>
          {projects.map(project => (
            <Pressable key={project.id} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/music-workspace/[id]', params: { id: project.id } })}
              style={{ backgroundColor: theme.surface, borderRadius: 17, borderWidth: 1,
                borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
              <View style={{ width: 68, height: 68, borderRadius: 12, backgroundColor: theme.dark ? '#393035' : '#F5ECEB',
                overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                {project.coverUrl ? <Image source={{ uri: project.coverUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}/> :
                  <Ionicons name="musical-notes-outline" size={29} color={pink}/>}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>{project.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>
                  {project.layers.length} piste{project.layers.length === 1 ? '' : 's'} · {project.lyrics.length} langue{project.lyrics.length === 1 ? '' : 's'}
                </Text>
                <Text style={{ color: project.publishedId ? pink : theme.muted, fontSize: 11 }}>
                  {project.publishedId ? 'Publication liée' : 'Brouillon privé'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
            </Pressable>
          ))}
          {!projects.length ? <View style={{ borderWidth: 1, borderStyle: 'dashed',
            borderColor: theme.border, borderRadius: 17, padding: 23, alignItems: 'center', gap: 10 }}>
            <Ionicons name="folder-open-outline" size={32} color={pink}/>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.foreground }}>Chaque morceau commence ici.</Text>
            <Text style={{ fontSize: 12, lineHeight: 20, textAlign: 'center', color: theme.muted }}>
              Commence par un enregistrement, importe une démo, ou écris simplement ta première idée.
            </Text>
          </View> : null}
          {legacyMine.length ? <>
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 15, marginTop: 10 }}>
              Publications existantes
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Ces publications ne disposent pas encore d'un dossier de travail lié sur cet appareil.
            </Text>
            {legacyMine.map(publicCard)}
          </> : null}
        </View> : null}
        {tab === 'collabs' ? <View style={{ gap: 12 }}>
          <Text style={{ color: theme.foreground, fontSize: 19, fontWeight: '700' }}>Mes collaborations</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
            Les morceaux des autres auxquels tu as proposé une contribution. Ils restent la création de leur auteur.
          </Text>
          {remoteError ? <Text style={{ color: theme.muted, fontSize: 12 }}>{remoteError}</Text> : null}
          {sent.map(proposal => <Pressable key={proposal.id}
            onPress={() => router.push(proposal.status === 'accepted' || proposal.status === 'published'
              ? { pathname: '/music-collaboration/[id]', params: { id: proposal.trackPublicationId } }
              : { pathname: '/music/[id]', params: { id: proposal.trackPublicationId, from: 'music-tab' } })}
            style={{ padding: 14, borderRadius: 14, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.border, gap: 4 }}>
            <Text style={{ color: theme.foreground, fontWeight: '700' }}>{proposal.trackTitle}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{proposal.description}</Text>
            <Text style={{ color: pink, fontSize: 11 }}>Proposition : {proposal.status}</Text>
            {(proposal.status==='accepted'||proposal.status==='published')?
              <Text style={{fontSize:11,color:theme.muted}}>Ouvrir le dossier partagé</Text>:null}
          </Pressable>)}
          {!sent.length && !remoteError ?
            <Text style={{ color: theme.muted, fontSize: 13 }}>Aucune collaboration envoyée pour le moment.</Text> : null}
        </View> : null}
        {tab === 'saved' ? <View style={{ gap: 8 }}>
          <Text style={{ color: theme.foreground, fontSize: 19, fontWeight: '700' }}>Enregistrés</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
            Les morceaux sauvegardés dans Fire ou repérés pour une collaboration.
          </Text>
          {saved.map(publicCard)}
          {!saved.length ? <Text style={{ color: theme.muted, fontSize: 13 }}>
            Aucun morceau enregistré. Tu peux en garder depuis sa publication publique.
          </Text> : null}
        </View> : null}
        {tab === 'explore' ? <View style={{ gap: 8 }}>
          <Text style={{ color: theme.foreground, fontSize: 19, fontWeight: '700' }}>Découvrir des morceaux</Text>
          {publicMusic.map(publicCard)}
          {!publicMusic.length ? <Text style={{ color: theme.muted }}>Aucun morceau disponible actuellement.</Text> : null}
        </View> : null}
      </ScrollView>
      <Nav/>
    </SafeAreaView>
  );
}
