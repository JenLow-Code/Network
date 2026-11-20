import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MusicFolderCover } from './MusicFolderCover';
import type { MusicProject } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
import { useAppTheme } from '@/theme/AppTheme';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

const PINK = '#CB245C';

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
  const talents = (song.needs || []).filter(need => need.kind === 'talent');
  const info = `${song.files.length} ${song.files.length === 1 ? 'fichier' : 'fichiers'}` +
    (versions ? ` · ${versions} ${versions === 1 ? 'version' : 'versions'}` : '');

  if (layout === 'list') return <Pressable
    accessibilityRole="button" accessibilityLabel={'Ouvrir ' + song.title}
    onPress={open}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10,
      borderBottomWidth: 1, borderColor: theme.border, width: width || '100%' }}>
    <MusicFolderCover project={song} size={64}/>
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
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 7 }}>
      <MusicFolderCover project={song} size={106}/>
    </View>
    <Text numberOfLines={1} style={{ color: theme.foreground, fontSize: 14,
      fontWeight: '700' }}>{song.title}</Text>
    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>{info}</Text>
    {talents.length ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name="people-outline" color={PINK} size={13}/>
      <Text numberOfLines={1} style={{ color: PINK, fontSize: 11, flex: 1 }}>
        {talents.map(need => need.label).join(', ')}
      </Text>
    </View> : <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>
      {song.description || 'Mon espace de création'}
    </Text>}
  </Pressable>;
}
