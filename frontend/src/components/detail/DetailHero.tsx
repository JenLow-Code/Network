import React, { useId } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { BibleVerseCard, CassetteArtwork } from '@/components/publication/PublicationGallery';

/**
 * The detail cover is the full-size version of a Discovery publication:
 * no redundant title bar, cards or dummy controls.
 */
export function DetailHero({
  item,
  width,
  height,
}: {
  item: Publication;
  width: number;
  height: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isDream = item.type === 'dream';
  const darkInk = '#26211D';
  const inset = width < 420 ? 20 : 31;
  const titleSize = width < 420 ? 32 : width < 610 ? 39 : 46;

  return (
    <View style={[styles.hero, { width, height, backgroundColor: item.type === 'music' ? 'transparent' : '#F0EAE0' }]}>
      {isDream ? (
        <>
          <Image
            source={{ uri: item.image }}
            accessibilityLabel={item.imageAlt}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000" stopOpacity={0.10} />
                <Stop offset="39%" stopColor="#000" stopOpacity={0.06} />
                <Stop offset="69%" stopColor="#000" stopOpacity={0.46} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.94} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + id + ')'} />
          </Svg>
          <View pointerEvents="none" style={[styles.phaseIcon, { right: inset, top: inset }]}>
            <DreamPhaseIcon phase={item.phase} size={30} />
          </View>
          <Text style={[styles.heroKicker, { color: '#FFFFFF', top: inset + 11, right: inset + 50 }]}>
            {PHASE_LABELS[item.phase].toUpperCase()}
          </Text>
          <View style={[styles.dreamText, { left: inset, right: inset, bottom: inset + 42 }]}>
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.headline,
                {
                  fontSize: titleSize,
                  lineHeight: titleSize + 7,
                  fontFamily: Platform.select({
                    web: 'Georgia, "Times New Roman", serif',
                    ios: 'Georgia',
                    default: 'serif',
                  }),
                },
              ]}
            >
              {item.title}
            </Text>
          </View>
        </>
      ) : item.type === 'bible' ? (
        <BibleVerseCard item={item} width={width} height={height} />
      ) : item.type === 'music' ? (
        <>
          <CassetteArtwork width={width} height={height} title={item.title} artwork={item.coverArt || item.image} transparent />
          <Text style={[styles.heroKicker, { right: inset, top: inset, color: darkInk }]}>MUSIQUE</Text>
        </>
      ) : (
        <>
          <View style={styles.talentArtwork}>
            <TalentArt kind={item.instrument} size={Math.min(220, width * 0.45, height * 0.56)} />
            <TalentLevelDots level={item.level} />
          </View>
          <Text style={[styles.heroKicker, { right: inset, top: inset, color: darkInk }]}>
            {item.skill.toUpperCase()}
          </Text>
        </>
      )}
      {item.type !== 'music' && (
      <Text
        pointerEvents="none"
        numberOfLines={1}
        style={[
          styles.signature,
          {
            right: inset,
            bottom: inset,
            color: isDream ? '#FFFFFF' : darkInk,
          },
        ]}
      >
        {item.author}
      </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden' },
  phaseIcon: {
    position: 'absolute',
    width: 41,
    height: 41,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,252,245,0.94)',
  },
  heroKicker: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  dreamText: { position: 'absolute' },
  headline: { fontWeight: '400', color: '#FFFFFF', letterSpacing: -0.75 },
  signature: {
    position: 'absolute',
    fontFamily: 'Caveat_700Bold',
    fontSize: 29,
    lineHeight: 33,
    textAlign: 'right',
  },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13, paddingBottom: 40 },
});
