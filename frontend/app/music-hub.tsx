import { Text } from '@/i18n/LocalizedText';
import React from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { musics } from '@/mocks/publications';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';

/** Same warm editorial shell, header rhythm and actions as the Network views. */
export default function MusicHub() {
  const { t } = useLocale();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: '100%', maxWidth: 860, alignSelf: 'center',
          paddingHorizontal: compact ? 19 : 28,
          paddingTop: compact ? 16 : 30, paddingBottom: 76,
        }}
      >
        <PageHeader />
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
          paddingBottom: 20, borderBottomWidth: 0.5, borderColor: theme.border,
          marginBottom: 19,
        }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{
              fontSize: compact ? 30 : 32, fontWeight:'700',
              lineHeight: compact ? 38 : 41, color: theme.foreground,
            }}>{t('music')}</Text>
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }}>
              Écouter, partager et proposer une collaboration.
            </Text>
          </View>
          
        </View>

        <Pressable
          onPress={() => router.push('/publish/music')}
          accessibilityRole="button"
          style={{
            backgroundColor: theme.dark ? '#ECE9E2' : '#242322',
            paddingHorizontal: 17, paddingVertical: 13, minHeight: 46,
            borderRadius: 10, alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center', gap: 9,
            marginBottom: 34,
          }}
        >
          <Ionicons name="add-circle-outline" color={theme.dark ? '#242322' : '#FFFFFF'} size={19} />
          <Text style={{ color: theme.dark ? '#242322' : '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
            Partager une musique
          </Text>
        </Pressable>

        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground, marginBottom: 12 }}>
          Musiques et collaborations
        </Text>
        {musics.map(m => (
          <Pressable
            key={m.id}
            onPress={() => router.push({ pathname: '/music/[id]', params: { id: m.id, from: 'music-tab' } })}
            accessibilityRole="button"
            style={{
              flexDirection: 'row', paddingVertical: 16, gap: 14,
              alignItems: 'center', borderBottomWidth: 1, borderColor: theme.border,
            }}
          >
            <Image source={{ uri: m.image }} style={{ width: compact ? 68 : 78, height: compact ? 68 : 78, borderRadius: 8 }} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.foreground }}>{m.title}</Text>
              <Text style={{ fontSize: 11, color: theme.muted, lineHeight: 17 }}>
                {m.author} · Proposition d’adaptation disponible
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.muted} />
          </Pressable>
        ))}
        <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: 24 }}>
          Les adaptations se font par des propositions créditées. Aucun téléchargement public de chansons.
        </Text>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
