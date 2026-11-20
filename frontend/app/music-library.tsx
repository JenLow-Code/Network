import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { MusicSongCard } from '@/components/music/MusicSongCard';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { readMusicLibraryLayout, type MusicLibraryLayout } from '@/domain/musicLibraryPreferences';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';

export default function MusicLibrary() {
  const { width } = useWindowDimensions();
  const ws = workspaceLayout(width);
  const compact = width < 630;
  const theme = useAppTheme();
  const { email } = useApp();
  const { items, ready, error } = useMusicWorkspaces();
  const [layout, setLayout] = useState<MusicLibraryLayout>('cards');
  useFocusEffect(useCallback(() => {
    let active = true;
    void readMusicLibraryLayout(email)
      .then(value => { if (active) setLayout(value); }).catch(() => {});
    return () => { active = false; };
  }, [email]));
  const songs = useMemo(() => [...items].sort((a,b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)), [items]);
  const availableWidth = Math.min(width, ws.maxWidth || width) - ws.gutter * 2;
  const columns = compact ? 2 : width < 940 ? 3 : 4;
  const cardWidth = Math.max(140, Math.floor((availableWidth - (columns - 1) * 12) / columns));
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={{
      ...workspaceCanvas(width), paddingTop: 8, paddingBottom: 110, gap: 22,
    }}>
      <PageHeader title="Mes morceaux"/>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            {songs.length} {songs.length === 1 ? 'morceau' : 'morceaux'} · {layout === 'cards' ? 'Cartes' : 'Liste'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/music/new')} accessibilityRole="button"
          accessibilityLabel="Créer un morceau"
          style={{ paddingHorizontal: 13, height: 38, borderRadius: 19, alignItems: 'center',
            flexDirection: 'row', gap: 4, backgroundColor: '#CB245C' }}>
          <Ionicons name="add" color="#FFFFFF" size={20}/>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Créer</Text>
        </Pressable>
      </View>
      {!ready ? <ActivityIndicator color="#CB245C" /> : null}
      {error ? <Text style={{ color: '#B84D63', fontSize: 12 }}>{error}</Text> : null}
      {songs.length ? <View style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12,
      }}>
        {songs.map(song => <MusicSongCard key={song.id} song={song}
          layout={layout} width={layout === 'cards' ? cardWidth : '100%'}/>)}
      </View> : ready ? <Text style={{ color: theme.muted, paddingTop: 18, fontSize: 13 }}>
        Aucun morceau pour le moment.
      </Text> : null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
