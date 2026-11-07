import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Publication } from '@/domain/publication';
import { publications, personPublications } from '@/mocks/publications';
import { DreamReactionRail } from './DreamReactionRail';
import { PublicationPrimaryAction } from './PublicationPrimaryAction';
import { DetailHero } from './DetailHero';
import { Nav } from '@/components/navigation/Nav';
import { DetailAuthorHeader } from './DetailAuthorHeader';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';
import { useDiscovery } from '@/lib/api/hooks';

/**
 * Shared editorial detail layout. The featured image mirrors Discovery,
 * followed by a legible, uncluttered body and the existing reaction actions.
 */
export function DetailLayout({
  item,
  children,
  featured,
  headerIcon,
  onCoverPress,
  musicPlaying = false,
}: {
  item: Publication;
  children: React.ReactNode;
  featured?: React.ReactNode;
  headerIcon?: React.ReactNode;
  onCoverPress?: () => void;
  musicPlaying?: boolean;
}) {
  const theme = useAppTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Music opened from Discovery keeps related inspiration. Only the Music tab and Fire list are focused spaces.
  const showRelated = from !== 'music-tab' && from !== 'fire';
  // Related stories use the same source and editorial order as Discovery.
  // This prevents detail pages from silently falling back to an obsolete mock-only feed.
  const relatedFeed = useDiscovery();
  const relatedItems = relatedFeed.state === 'ready' ? relatedFeed.items : [...publications, ...personPublications];
  const isDream = item.type === 'dream';
  const isFloraison = isDream && item.phase === 'Témoignage';
  const isSeed = isDream && item.phase === 'Rêve';
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, 760);
  const heroWidth = Math.max(0, width - 32);
  // Let Floraison photography meet the detail-page edges; other content keeps its insets.
  const coverWidth = isFloraison ? width : heroWidth;
  const heroHeight =
    item.type === 'dream'
      ? Math.min(530, Math.max(280, heroWidth * 0.70))
      : item.type === 'bible'
        ? Math.min(420, Math.max(275, heroWidth * 0.62))
        : Math.min(330, Math.max(210, heroWidth * 0.50));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
      <ScrollView
        contentContainerStyle={{
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
          paddingBottom: 40,
        }}
      >
        <DetailAuthorHeader item={item} flushToImage={isFloraison} />

        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ position: 'relative', marginHorizontal: isFloraison ? -16 : 0 }}>
          <DetailHero item={item} width={coverWidth} height={heroHeight} onMusicPress={onCoverPress} musicPlaying={musicPlaying} />

          <View style={{
            paddingTop: item.type === 'music' ? 4 : item.type === 'dream' ? 0 : 22,
            // Match the Germination detail controls to the talent tiles/title inset.
            paddingHorizontal: isFloraison
              ? (heroWidth < 440 ? 23 : 32) + 16
              : !isSeed ? (heroWidth < 440 ? 23 : 32) : 0,
            marginTop: 0,
            position: 'relative',
            zIndex: 1,
          }}>
            {featured}
            {/* For Floraison, the photograph continues under "En savoir plus"
                and fades out just above the main participation buttons. */}
            <View style={{
              paddingTop: isDream ? 8 : 3,
              marginTop: isFloraison ? -84 : 0,
              position: 'relative',
              zIndex: isFloraison ? 2 : 1,
            }}>
              {children}
            </View>
            {!isSeed && (
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
                {/* Both columns share the same top/bottom; the rail cannot drift above the buttons. */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PublicationPrimaryAction item={item} />
                </View>
                <View style={{ width: 40, paddingTop: 7, justifyContent: 'center' }}>
                  <DreamReactionRail item={item} />
                </View>
              </View>
            )}
          </View>
          </View>
          {showRelated ? (
          <View style={{ marginTop: isDream ? 30 : 42, borderTopWidth: isDream ? 0 : 0.5, borderTopColor: theme.border, paddingTop: 21, width: '100%', alignSelf: 'center' }}>
            <Text
              style={{
                color: theme.foreground,
                fontFamily: 'serif',
                fontSize: 25,
                lineHeight: 32,
                marginBottom: 20,
              }}
            >
              Continuer l’inspiration
            </Text>
            <PublicationGallery layout="masonry" contentWidth={heroWidth} items={relatedItems.filter(p => p.id !== item.id && (p.type !== 'dream' || p.phase !== 'Rêve'))} />
          </View>
          ) : null}
        </View>
      </ScrollView>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
