import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MusicCassetteDraft } from './MusicCassetteDraft';
import type { MusicProject } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
import { useAppTheme } from '@/theme/AppTheme';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

export function MusicSongCard({ song, layout, width }: {
  song: MusicProject;
  layout: MusicLibraryLayout;
  width?: number | string;
}) {
  const theme = useAppTheme();
  const panel = theme.dark ? '#28242A' : '#FFFCF8';
  const versions = Math.max(musicNextState(song).versions.length, song.versions?.length || 0);
  const open = () => router.push({
    pathname: '/music-workspace/[id]',
    params: { id: song.id },
  });
  const info = [
    song.files.length ? `${song.files.length} ${song.files.length === 1 ? 'fichier' : 'fichiers'}` : '',
    versions ? `${versions} ${versions === 1 ? 'version' : 'versions'}` : '',
  ].filter(Boolean).join(' · ') || 'Premières idées';

  if (layout === 'list') return <Pressable
    accessibilityRole="button" accessibilityLabel={'Ouvrir ' + song.title}
    onPress={open}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10,
      borderBottomWidth: 1, borderColor: theme.border, width: width || '100%' }}>
    <MusicCassetteDraft width={96}/>
    <View style={{ flex: 1, gap: 5 }}>
      <Text numberOfLines={1} style={{ color: theme.foreground, fontSize: 14,
        fontWeight: '700' }}>{song.title}</Text>
      {song.description ? <Text numberOfLines={1} style={{ color: theme.muted,
        fontSize: 12 }}>{song.description}</Text> : null}
      <Text style={{ color: theme.muted, fontSize: 11 }}>{info}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" color={theme.muted} size={17}/>
  </Pressable>;

  return <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + song.title}
    onPress={open} style={{ width: width || 205, padding: 11, borderRadius: 16,
      borderWidth: 1, borderColor: theme.border, backgroundColor: panel,
      gap: 9, overflow: 'hidden' }}>
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 5 }}>
      <MusicCassetteDraft width={Math.max(90, Math.min(280,
        typeof width === 'number' ? width - 24 : 192))}/>
    </View>
    <Text numberOfLines={1} style={{ color: theme.foreground, fontSize: 14,
      fontWeight: '700' }}>{song.title}</Text>
    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>{info}</Text>
    {song.description ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>
      {song.description}
    </Text> : null}
  </Pressable>;
}
