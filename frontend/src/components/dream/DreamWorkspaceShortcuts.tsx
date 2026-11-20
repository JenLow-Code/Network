import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';

/** One compact, right-aligned row used across all dream phases. */
export function DreamWorkspaceShortcutRow({
  label, icon, onPress, expanded, highlighted = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  expanded?: boolean;
  highlighted?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={'Ouvrir ' + label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={{
        flexDirection: 'row', gap: 6, alignItems: 'center',
        justifyContent: 'flex-end', minHeight: 32, width: '100%',
        paddingVertical: 6, paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: highlighted ? (theme.dark ? '#432D38' : '#FCECF4') : 'transparent',
      }}>
      <View style={{width:18,alignItems:'center'}}>
        <Ionicons name={icon} size={13}
          color={highlighted ? '#D71D77' : theme.muted}/>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}
        style={{ color: theme.foreground, fontSize: 12, fontWeight: '500',
          flex:1,minWidth:0,textAlign:'right' }}>{label}</Text>
      <View style={{width:18,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={13} color={theme.muted}/>
      </View>
    </Pressable>
  );
}

/** Familiar shortcut placement in Semence, Germination, Croissance and Floraison. */
export default function DreamWorkspaceShortcuts({
  dream, showLibrary = false,
}: { dream: DreamEntry; showLibrary?: boolean }) {
  return (
    <View style={{ alignItems: 'stretch', justifyContent: 'flex-start', gap: 0, width:'100%' }}>
      <DreamWorkspaceShortcutRow label="Notes personnelles"
        icon="lock-closed-outline" onPress={() =>
          router.push({ pathname: '/my-dream/notes/[id]', params: { id: dream.id } })}/>
      {showLibrary ? (
        <DreamWorkspaceShortcutRow label="Documents & Inspirations"
          icon="folder-open-outline" onPress={() =>
            router.push({ pathname: '/my-dream/library/[id]', params: { id: dream.id } })}/>
      ) : null}
    </View>
  );
}
