import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { people } from '@/mocks/people';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import { TalentArt } from '@/components/talent/TalentArt';
import { ProfileTalentTile } from '@/components/talent/ProfileTalentTile';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import type { PersonPublication } from '@/domain/publication';
import { useMemberProfile } from '@/lib/api/hooks';
import { profileTalentToPublication } from '@/lib/api/adapters';
import { api } from '@/lib/api/client';

const PIN_KEY = 'jenlow.public-profile.featured.v1.';
export default function PublicMemberProfile() {
  const { name } = useLocalSearchParams<{ name: string }>();
  // Profiles from the API are addressed by handle; the remaining local-demo screens use mock names.
  const mock = people.find(p => p.name === name);
  const remote = useMemberProfile(mock ? undefined : name);
  const apiProfile = remote.profile;
  const person = mock ?? (apiProfile ? {
    name: apiProfile.displayName,
    bio: apiProfile.bio,
    church: apiProfile.church ?? undefined,
    talents: apiProfile.talents.map(t => t.name),
    posts: remote.posts,
    skills: apiProfile.talents.map(t => profileTalentToPublication(apiProfile, t)),
  } : undefined);
  const theme = useAppTheme();
  const app = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedTalent, setSelectedTalent] = useState<PersonPublication | null>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const isOwner = apiProfile ? apiProfile.isSelf : !!person && app.signedIn && app.name === person.name;
  useEffect(() => {
    let active = true;
    setFeaturedId(null);
    if (apiProfile) {
      setFeaturedId(apiProfile.featured?.id ?? null);
    } else if (person) {
      void AsyncStorage.getItem(PIN_KEY + person.name).then(id => { if (active) setFeaturedId(id); }).catch(() => {});
    }
    return () => { active = false; };
  }, [person?.name, apiProfile?.featured?.id]);
  const selectFeatured = (id: string | null) => {
    if (!isOwner || !person) return;
    setFeaturedId(id);
    if (apiProfile) {
      // Server-side featured post: only the owner's own public publication is accepted.
      void (id
        ? api('/api/me/featured-post', { method: 'PUT', body: { publicationId: id }, auth: 'required' })
        : api('/api/me/featured-post', { method: 'DELETE', auth: 'required' })
      ).catch(() => setFeaturedId(apiProfile.featured?.id ?? null));
      return;
    }
    if (id) void AsyncStorage.setItem(PIN_KEY + person.name, id).catch(() => {});
    else void AsyncStorage.removeItem(PIN_KEY + person.name).catch(() => {});
  };
  if (!mock && remote.state === 'loading') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
      <ActivityIndicator color={theme.foreground} />
      <Nav />
    </SafeAreaView>
  );
  if (!person) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ padding: 24, color: theme.foreground }}>Profil introuvable</Text>
      <Nav />
    </SafeAreaView>
  );
  const female = ['Sarah', 'Esther', 'Helena', 'Léa', 'Mila'].includes(person.name);
  // Real members show their own avatar or an initial; stock portraits remain only on mock profiles.
  const photo = apiProfile
    ? apiProfile.avatarUrl
    : female
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
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 102, height: 102, borderRadius: 51 }} />
          ) : (
            <View style={{ width: 102, height: 102, borderRadius: 51, backgroundColor: theme.dark ? '#2A2A2A' : '#EFE8DF', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 38, color: theme.foreground }}>{person.name.trim().slice(0, 1).toLocaleUpperCase('fr')}</Text>
            </View>
          )}
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
              <ProfileTalentTile key={skill.id} title={skill.skill} level={skill.level} art={skill.instrument} width={tileWidth} onPress={() => setSelectedTalent(skill)} />
            ))}
          </View>
        ) : <Text style={{ color: theme.muted }}>Aucun talent publié pour le moment.</Text>}
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground, marginTop: 8 }}>Publications</Text>
        {person.posts.length
          ? <ProfilePublicationFeed items={person.posts} contentWidth={width} featuredId={featuredId} onFeature={isOwner ? selectFeatured : undefined} />
          : <Text style={{ color: theme.muted }}>Aucune publication pour le moment.</Text>}
        {mock ? <Text style={{ fontSize: 11, color: theme.muted }}>Profil de démonstration. Les données des membres seront connectées ultérieurement.</Text> : null}
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
