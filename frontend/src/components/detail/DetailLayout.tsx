import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { publications, personPublications } from '@/mocks/publications';
import { ActionRail } from './ActionRail';
import { DetailHero } from './DetailHero';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
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
        : Math.min(400, Math.max(250, heroWidth * 0.57));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            minHeight: 66,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 0.5,
            borderBottomColor: theme.dark ? '#55575B' : '#B8B0A6',
            marginHorizontal: 16,
            marginBottom: 20,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{ width: 44, justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" color={theme.foreground} size={23} />
          </Pressable>
          <Text
            style={{
              color: theme.foreground,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 2.2,
              flex: 1,
              textAlign: 'center',
            }}
          >
            JENLOW
          </Text>
          <TopActions />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <DetailHero item={item} width={heroWidth} height={heroHeight} />

          {/*
            No repeated author bar: the member signature is already on the
            cover. Restore the original vertical reaction placement alongside
            the article rather than displaying social actions under the image.
          */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: heroWidth < 410 ? 8 : 17,
              paddingTop: 26,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              {featured}
              {children}
            </View>
            <View style={{ width: 45, alignItems: 'center' }}>
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
      <Nav />
    </SafeAreaView>
  );
}
