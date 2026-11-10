import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';

/** Same understated workspace shortcuts in Semence, Germination and Croissance. */
export default function DreamWorkspaceShortcuts({
  dream, showLibrary = false,
}: { dream: DreamEntry; showLibrary?: boolean }) {
  const theme = useAppTheme();
  const shortcut = (label: string, icon: keyof typeof Ionicons.glyphMap,
    destination: '/my-dream/notes/[id]' | '/my-dream/library/[id]') =>
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={'Ouvrir ' + label}
      onPress={() => router.push({ pathname: destination, params: { id: dream.id } })}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center',
        minHeight: 30, paddingVertical: 5, paddingHorizontal: 3 }}>
      <Ionicons name={icon} size={13} color={theme.muted}/>
      <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '500' }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={13} color={theme.muted}/>
    </Pressable>;
  return <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', gap: 0 }}>
    {shortcut('Notes personnelles','lock-closed-outline','/my-dream/notes/[id]')}
    {showLibrary ? shortcut('Inspirations / Documents','folder-open-outline',
      '/my-dream/library/[id]') : null}
  </View>;
}
