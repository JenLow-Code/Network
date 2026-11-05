import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { NetworkMark } from '@/components/brand/NetworkMark';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Nav } from '@/components/navigation/Nav';
import { Pill } from '@/components/ui/Pill';
import { TopActions } from '@/components/navigation/TopActions';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useDiscovery } from '@/lib/api/hooks';
import { people, personPath } from '@/mocks/people';
import { Avatar } from '@/components/ui/Avatar';
import { FireHeader } from '@/components/fire/FireHeader';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
const filters = ['Tout', 'Rêves', 'Musique', 'Bible', 'Talents'] as const;
export default function Discover() {
  const { tr } = useLocale();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [filter, setFilter] = useState<(typeof filters)[number]>(
    params.filter === 'Talents' ? 'Talents' : 'Tout',
  );
  const [query, setQuery] = useState('');
  // Discovery is backed by D1 through the API; there is deliberately no mock fallback.
  const feed = useDiscovery();
  const publications = useMemo(() => feed.items.filter(p => p.type !== 'talent' && (p.type !== 'dream' || p.phase !== 'Rêve')), [feed.items]);
  const personPublications = useMemo(() => feed.items.filter(p => p.type === 'talent'), [feed.items]);
  const items = useMemo(
    () =>
      publications.filter(
        p =>
          (filter === 'Tout' ||
            (filter === 'Rêves' && p.type === 'dream') ||
            (filter === 'Musique' && p.type === 'music') ||
            (filter === 'Bible' && p.type === 'bible')) &&
          [p.title, p.author, p.type, p.type === 'dream' ? p.phase : '']
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [filter, query, publications],
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        scrollEventThrottle={250}
        onScroll={e => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (feed.hasMore && layoutMeasurement.height + contentOffset.y > contentSize.height - 900) void feed.loadMore();
        }}
        contentContainerStyle={{
          paddingHorizontal: 15,
          paddingBottom: 55,
          maxWidth: 920,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ paddingTop: 9, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 34,
              marginBottom: 10,
              paddingBottom: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: theme.dark ? 'rgba(255,255,255,0.32)' : 'rgba(23,23,23,0.30)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <NetworkMark size={24} color={theme.foreground} />
            <Text
              accessibilityLabel="JenLow"
              style={{
                fontSize: 19,
                fontWeight: '900',
                letterSpacing: 2.1,
                fontStyle: 'italic',
                color: theme.foreground,
                transform: [{ scaleX: 1.12 }],
                marginLeft: 5,
              }}
            >
              JENLOW
            </Text>
            </View>
            <TopActions />
          </View>
          <View style={{ alignSelf: 'flex-start', maxWidth: '100%', paddingBottom: 4 }}>
          </View>
        </View>
        <View
          style={{
            height: 39,
            borderWidth: 0,
            backgroundColor: theme.dark ? '#292929' : '#F3ECE2',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            gap: 9,
            marginBottom: 13,
          }}
        >
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            style={{ flex: 1, fontSize: 13, color: '#222' }}
            placeholder={tr('searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingBottom: 17 }}
        >
          {filters.map(f => (
            <Pill
              key={f}
              text={
                f === 'Tout'
                  ? tr('all')
                  : f === 'Rêves'
                    ? tr('dreamsFilter')
                    : f === 'Musique'
                      ? tr('musicFilter')
                      : f === 'Bible'
                        ? tr('bibleFilter')
                        : 'Talents'
              }
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
        <View style={{ marginHorizontal: -15 }}>
        <PublicationGallery
          layout="masonry"
          items={(filter === 'Talents'
            ? personPublications
            : filter === 'Tout'
              ? [...publications, ...personPublications]
              : items
          ).filter(p =>
            [
              p.title,
              p.author,
              p.type,
              ...(p.type === 'talent' ? [p.skill, p.level, ...p.seeking] : []),
            ]
              .join(' ')
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          )}
        />
        </View>
        {feed.state === 'loading' && feed.items.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.foreground} />
        ) : null}
        {feed.state === 'error' ? (
          <View style={{ alignItems: 'center', marginTop: 25, gap: 10 }}>
            <Text style={{ textAlign: 'center', color: '#999' }}>
              Impossible de charger Discovery pour le moment.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void feed.retry()} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: '#D71D77', fontSize: 13 }}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
        {feed.state === 'ready' && filter !== 'Talents' && items.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 25, color: '#999' }}>
            Aucune publication trouvée.
          </Text>
        )}
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
