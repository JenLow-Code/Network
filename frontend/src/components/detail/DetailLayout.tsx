import React from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Publication } from '@/domain/publication';
import { publications, personPublications } from '@/mocks/publications';
import { ActionRail } from './ActionRail';
import { DetailHero } from './DetailHero';
import { Nav } from '@/components/navigation/Nav';
import { DetailAuthorHeader } from './DetailAuthorHeader';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * Shared editorial detail layout. The featured image mirrors Discovery,
 * followed by a legible, uncluttered body and the existing reaction actions.
 */
export function DetailLayout({
  item,
  children,
  featured,
  headerIcon,
}: {
  item: Publication;
  children: React.ReactNode;
  featured?: React.ReactNode;
  headerIcon?: React.ReactNode;
}) {
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, 760);
  const heroWidth = Math.max(0, width - 32);
  const heroHeight =
    item.type === 'dream'
      ? Math.min(540, Math.max(305, heroWidth * 0.80))
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
        <DetailAuthorHeader item={item} />

        <View style={{ paddingHorizontal: 16 }}>
          <DetailHero item={item} width={heroWidth} height={heroHeight} />

          <View style={{ paddingTop: item.type === 'music' ? 4 : 22, paddingRight: 0 }}>
            {featured}
            {children}
            <View style={{ alignItems: 'flex-end', paddingTop: 12, paddingBottom: 8 }}>
              <ActionRail item={item} />
            </View>
          </View>
          <View style={{ marginTop: 42, borderTopWidth: 0.5, borderTopColor: theme.border, paddingTop: 21 }}>
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
            <PublicationGallery items={[...publications, ...personPublications].filter(p => p.id !== item.id)} />
          </View>
        </View>
      </ScrollView>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
