import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

export type MusicCollaborator = {
  displayName?: string;
  avatarUrl?: string | null;
};

/** The two real participants of an accepted collaboration, never stock portraits. */
function Portrait({ person, size, fallback }: {
  person?: MusicCollaborator;
  size: number;
  fallback: string;
}) {
  const theme = useAppTheme();
  const initial = person?.displayName?.trim().charAt(0).toLocaleUpperCase('fr');
  return <View style={{
    width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
    borderWidth: 2, borderColor: theme.surface,
    backgroundColor: theme.dark ? '#44383D' : '#F1E4E8',
    alignItems: 'center', justifyContent: 'center',
  }}>
    {person?.avatarUrl ? <Image source={{ uri: person.avatarUrl }}
      style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
      resizeMode="cover" /> : initial ?
      <Text style={{ color: theme.dark ? '#F9E4EC' : '#994765',
        fontFamily: 'serif', fontStyle: 'italic', fontSize: size * 0.43 }}>
        {initial}
      </Text> :
      <Ionicons name={fallback === 'author' ? 'person-outline' : 'person-add-outline'}
        color={theme.muted} size={size * 0.43} />}
  </View>;
}

export function MusicCollaboratorAvatars({ publisher, proposer, size = 50 }: {
  publisher?: MusicCollaborator;
  proposer?: MusicCollaborator;
  size?: number;
}) {
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Portrait person={publisher} size={size} fallback="author"/>
    <View style={{ marginLeft: -12 }}>
      <Portrait person={proposer} size={size} fallback="collaborator"/>
    </View>
  </View>;
}
