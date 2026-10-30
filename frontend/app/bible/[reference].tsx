import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { biblePosts, psalm150, publications, personPublications } from '@/mocks/publications';
import { DetailAuthorHeader } from '@/components/detail/DetailAuthorHeader';
import { ActionRail } from '@/components/detail/ActionRail';
import { Nav } from '@/components/navigation/Nav';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';

type VersePosition = { y: number; height: number };

/**
 * Read Psalm 150 in one natural flow. All six verses are rendered, with no
 * fixed-height slides, fake verse zero, nested scrolling or blank lead padding.
 * The shared verse stays pink; the verse being read is black; the rest are grey.
 */
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const shared = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const [reading, setReading] = useState(1);
  const positions = useRef<Record<number, VersePosition>>({});
  const chapterStart = useRef(0);
  const theme = useAppTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 500;
  const post = biblePosts.find(p => p.highlightedVerse === shared) || biblePosts[0];

  const focusOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // A reading line near the top, not a huge centered blank region.
    const probe = event.nativeEvent.contentOffset.y + (compact ? 185 : 205) - chapterStart.current;
    let nearest = 1;
    let distance = Infinity;

    for (let n = 1; n <= psalm150.length; n++) {
      const location = positions.current[n];
      if (!location) continue;
      const centre = location.y + location.height / 2;
      const d = Math.abs(centre - probe);
      if (d < distance) {
        nearest = n;
        distance = d;
      }
    }
    setReading(previous => previous === nearest ? previous : nearest);
  };

  const verseColor = (n: number) =>
    n === shared
      ? (theme.dark ? '#FF86AE' : '#CB245C')
      : n === reading
        ? theme.foreground
        : (theme.dark ? '#A39B93' : '#96908A');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEventThrottle={32}
        onScroll={focusOnScroll}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 760,
          alignSelf: 'center',
          paddingBottom: 42,
        }}
      >
        <DetailAuthorHeader item={post} />

        <View style={{ paddingHorizontal: compact ? 23 : 30, paddingTop: 5, paddingBottom: 8 }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: 'serif', fontSize: compact ? 29 : 32, lineHeight: 40, color: theme.foreground }}
          >
            Psaume 150:{shared}
          </Text>
          <Text style={{ fontSize: 10, letterSpacing: 1.4, color: theme.muted }}>
            LOUIS SEGOND 1910
          </Text>
        </View>

        {/* One complete chapter, closely spaced, not three 156px slots. */}
        <View
          onLayout={event => { chapterStart.current = event.nativeEvent.layout.y; }}
          style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: compact ? 18 : 30, paddingTop: 5 }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            {psalm150.map((text, index) => {
              const n = index + 1;
              const current = n === reading;
              return (
                <Pressable
                  key={n}
                  onPress={() => setReading(n)}
                  accessibilityRole="button"
                  accessibilityLabel={'Lire le verset ' + n + (n === shared ? ', partagé' : '')}
                  onLayout={event => { positions.current[n] = event.nativeEvent.layout; }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    paddingVertical: compact ? 9 : 12,
                    gap: compact ? 10 : 15,
                  }}
                >
                  <Text style={{ width: 15, fontSize: 11, lineHeight: 24, color: verseColor(n) }}>
                    {n}
                  </Text>
                  <Text
                    selectable
                    style={{
                      flex: 1,
                      fontFamily: 'serif',
                      fontSize: compact ? 16 : 19,
                      lineHeight: compact ? 23 : 28,
                      fontWeight: current ? '500' : '400',
                      color: verseColor(n),
                    }}
                  >
                    {text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ width: 43, marginLeft: compact ? 5 : 12, paddingBottom: 12, alignItems: 'center' }}>
            <ActionRail item={post} />
          </View>
        </View>

        <View style={{ marginTop: 30, paddingHorizontal: compact ? 18 : 30 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: 'serif',
              fontSize: 25,
              lineHeight: 32,
              color: theme.foreground,
              marginBottom: 18,
            }}
          >
            Continuer l’inspiration
          </Text>
          <PublicationGallery
            items={[...publications, ...personPublications].filter(p => p.id !== post.id)}
          />
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
