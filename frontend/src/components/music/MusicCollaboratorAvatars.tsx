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

/**
 * Small, overlapping member photos placed directly over a music project.
 * No avatar is invented; initials are used where the profile has no image.
 */
export function MusicParticipantBadges({ people, size = 29, maxVisible = 3 }: {
  people: MusicCollaborator[];
  size?: number;
  maxVisible?: number;
}) {
  const distinct = people.filter((person, index, all) => {
    const key = person.avatarUrl || person.displayName?.trim().toLowerCase();
    return !!key && all.findIndex(other =>
      (other.avatarUrl || other.displayName?.trim().toLowerCase()) === key) === index;
  });
  if (!distinct.length) return null;
  return <View accessibilityLabel={distinct.map(p => p.displayName || 'Musicien').join(', ')}
    style={{flexDirection:'row',alignItems:'center'}}>
    {distinct.slice(0,maxVisible).map((person,i) => <View
      key={(person.avatarUrl || person.displayName || 'person') + i}
      style={{ marginLeft:i ? -9 : 0 }}>
      <Portrait person={person} size={size} fallback="collaborator"/>
    </View>)}
    {distinct.length > maxVisible ? <View accessibilityLabel={'Et ' + (distinct.length-maxVisible) + ' autres collaborateurs'} style={{
      marginLeft:-7,width:size,height:size,borderRadius:size/2,
      backgroundColor:'#CB245C',alignItems:'center',justifyContent:'center',
      borderWidth:2,borderColor:'#FFF',
    }}>
      <Text style={{color:'#FFF',fontSize:10,fontWeight:'700'}}>
        +{distinct.length - maxVisible}
      </Text>
    </View> : null}
  </View>;
}
