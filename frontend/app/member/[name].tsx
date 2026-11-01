import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { people } from '@/mocks/people';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import { TalentArt } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import type { PersonPublication } from '@/domain/publication';

const PIN_KEY = 'jenlow.public-profile.featured.v1.';
export default function PublicMemberProfile() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const person = people.find(p => p.name === name);
  const theme = useAppTheme();
  const app = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedTalent, setSelectedTalent] = useState<PersonPublication | null>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const isOwner = !!person && app.signedIn && app.name === person.name;
  useEffect(() => {
    let active = true;
    setFeaturedId(null);
    if (person) {
      void AsyncStorage.getItem(PIN_KEY + person.name).then(id => { if (active) setFeaturedId(id); }).catch(() => {});
    }
    return () => { active = false; };
  }, [person?.name]);
  const selectFeatured = (id: string | null) => {
    if (!isOwner || !person) return;
    setFeaturedId(id);
    if (id) void AsyncStorage.setItem(PIN_KEY + person.name, id).catch(() => {});
    else void AsyncStorage.removeItem(PIN_KEY + person.name).catch(() => {});
  };
  if (!person) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ padding: 24, color: theme.foreground }}>Profil introuvable</Text>
      <Nav />
    </SafeAreaView>
  );
  const female = ['Sarah', 'Esther', 'Helena', 'Léa', 'Mila'].includes(person.name);
  const photo = female
    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&q=80'
    : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&q=80';
  const width = Math.min(screenWidth - 36, 860);
  const columns = width < 350 ? 2 : 3;
  const gap = 10;
  const tileWidth = Math.floor((width - gap * (columns - 1)) / columns);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 55, maxWidth: 896, width: '100%', alignSelf: 'center', gap: 19 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={theme.foreground} /></Pressable>
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.foreground }}>Profil public</Text>
          <TopActions />
        </View>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
          <Image source={{ uri: photo }} style={{ width: 102, height: 102, borderRadius: 51 }} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.foreground }}>{person.name}</Text>
          {person.bio ? <Text style={{ fontSize: 14, lineHeight: 21, color: theme.muted, textAlign: 'center', maxWidth: 430 }}>{person.bio}</Text> : null}
          <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center' }}>
            {person.church || 'Église non renseignée'}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground }}>Talents</Text>
        {person.skills.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>
            {person.skills.map(skill => (
              <Pressable key={skill.id} accessibilityRole="button" accessibilityLabel={skill.skill + ', ' + skill.level + ', consulter la description'}
                onPress={() => setSelectedTalent(skill)}
                style={{ width: tileWidth, aspectRatio: 1, borderRadius: 8, backgroundColor: theme.dark ? '#25272C' : '#F0EDE8', justifyContent: 'center', alignItems: 'center', padding: 9, gap: 5 }}>
                <TalentArt kind={skill.instrument} size={Math.min(110, tileWidth * 0.64)} />
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.foreground, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>
                  {skill.skill.toLocaleUpperCase('fr')}
                </Text>
                <TalentLevelDots level={skill.level} size={tileWidth < 112 ? 6 : 8} spacing={4} />
              </Pressable>
            ))}
          </View>
        ) : <Text style={{ color: theme.muted }}>Aucun talent publié pour le moment.</Text>}
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground, marginTop: 8 }}>Publications</Text>
        {person.posts.length
          ? <ProfilePublicationFeed items={person.posts} contentWidth={width} featuredId={featuredId} onFeature={isOwner ? selectFeatured : undefined} />
          : <Text style={{ color: theme.muted }}>Aucune publication pour le moment.</Text>}
        <Text style={{ fontSize: 11, color: theme.muted }}>Profil de démonstration. Les données des membres seront connectées ultérieurement.</Text>
      </ScrollView>
      <Modal visible={!!selectedTalent} transparent animationType="fade" onRequestClose={() => setSelectedTalent(null)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 22, gap: 12, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
            <Pressable onPress={() => setSelectedTalent(null)} accessibilityLabel="Fermer" style={{ alignSelf: 'flex-end', padding: 6 }}>
              <Ionicons name="close" size={22} color={theme.foreground} />
            </Pressable>
            {selectedTalent ? <>
              <View style={{ alignSelf: 'center', alignItems: 'center', gap: 9 }}>
                <TalentArt kind={selectedTalent.instrument} size={126} />
                <Text style={{ fontSize: 23, fontWeight: '700', color: theme.foreground }}>{selectedTalent.skill}</Text>
                <TalentLevelDots level={selectedTalent.level} size={10} spacing={6} />
                <Text style={{ fontSize: 12, color: theme.muted }}>Niveau : {selectedTalent.level}</Text>
              </View>
              <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 23 }}>{selectedTalent.description}</Text>
              {selectedTalent.experience ? <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 21 }}>{selectedTalent.experience}</Text> : null}
              {selectedTalent.seeking.length ? <Text style={{ color: theme.muted, fontSize: 12 }}>Recherche : {selectedTalent.seeking.join(' · ')}</Text> : null}
            </> : null}
          </View>
        </View>
      </Modal>
      <Nav />
    </SafeAreaView>
  );
}
