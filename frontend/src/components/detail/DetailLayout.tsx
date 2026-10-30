import React, { useId } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  const fadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isDream = item.type === 'dream';
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, 760);
  const heroWidth = Math.max(0, width - 32);
  const heroHeight =
    item.type === 'dream'
      ? Math.min(580, Math.max(420, heroWidth * 0.88))
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
          <View style={{ position: 'relative' }}>
          {isDream && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: 16, right: 16, bottom: 0, overflow: 'hidden' }]}>
              <Image
                source={{ uri: item.image }}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id={fadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={theme.background} stopOpacity={0.02} />
                    <Stop offset="13%" stopColor={theme.background} stopOpacity={0.18} />
                    <Stop offset="34%" stopColor={theme.background} stopOpacity={0.67} />
                    <Stop offset="65%" stopColor={theme.background} stopOpacity={0.94} />
                    <Stop offset="88%" stopColor={theme.background} stopOpacity={0.985} />
                    <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={'url(#' + fadeId + ')'} />
              </Svg>
            </View>
          )}
          <DetailHero item={item} width={heroWidth} height={heroHeight} onMusicPress={onCoverPress} musicPlaying={musicPlaying} />

          <View style={{ paddingTop: item.type === 'music' ? 4 : item.type === 'dream' ? 0 : 22, paddingRight: 0 }}>
            {featured}
            {isDream ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
                <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
                <View style={{ width: 42, alignSelf: 'flex-end', justifyContent: 'flex-end', paddingBottom: 0 }}>
                  <ActionRail item={item} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 24, alignItems: 'stretch' }}>
                <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
                <View style={{ width: 42, alignSelf: 'flex-end', justifyContent: 'flex-end', paddingBottom: 12 }}>
                  <ActionRail item={item} />
                </View>
              </View>
            )}
          </View>
          </View>
          <View style={{ marginTop: 42, borderTopWidth: isDream ? 0 : 0.5, borderTopColor: theme.border, paddingTop: 21 }}>
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
