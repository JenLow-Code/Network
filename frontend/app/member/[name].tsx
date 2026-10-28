import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { people } from '@/mocks/people';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { TalentArt } from '@/components/talent/TalentArt';
import { useAppTheme } from '@/theme/AppTheme';
export default function PublicMemberProfile() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const person = people.find(p => p.name === name);
  const theme = useAppTheme();
  if (!person)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <Text style={{ padding: 24, color: theme.foreground }}>Profil introuvable</Text>
        <Nav />
      </SafeAreaView>
    );
  const female = ['Sarah', 'Esther', 'Helena', 'Léa', 'Mila'].includes(person.name);
  const photo = female
    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&q=80'
    : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&q=80';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: 55,
          maxWidth: 660,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={25} color={theme.foreground} />
          </Pressable>
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.foreground }}>
            Profil public
          </Text>
          <TopActions />
        </View>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
          <Image source={{ uri: photo }} style={{ width: 102, height: 102, borderRadius: 51 }} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.foreground }}>
            {person.name}
          </Text>
          <Text style={{ fontSize: 13, color: theme.muted, textAlign: 'center' }}>
            Découvrir les talents et les projets de {person.name}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground }}>Talents</Text>
        {person.skills.length ? (
          person.skills.map(skill => (
            <Pressable
              key={skill.id}
              onPress={() =>
                router.push({ pathname: '/person/[name]', params: { name: skill.author } })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 13,
                backgroundColor: '#F1F1EF',
                borderRadius: 13,
              }}
            >
              <TalentArt kind={skill.instrument} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700' }}>
                  {skill.title} · {skill.level}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{skill.seeking.join(' · ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#777" />
            </Pressable>
          ))
        ) : (
          <Text style={{ color: theme.muted }}>Aucun talent publié pour le moment.</Text>
        )}
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground }}>
          Publications
        </Text>
        {person.posts.length ? (
          <PublicationGallery items={person.posts} />
        ) : (
          <Text style={{ color: theme.muted }}>Aucune publication pour le moment.</Text>
        )}
        <Text style={{ fontSize: 11, color: theme.muted }}>
          Profil de démonstration. Les données des membres seront connectées ultérieurement.
        </Text>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
