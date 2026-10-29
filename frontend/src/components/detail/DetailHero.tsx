import React, { useId } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  onMusicPress,
}: {
  item: Publication;
  width: number;
  height: number;
  onMusicPress?: () => void;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isDream = item.type === 'dream';
  const darkInk = '#26211D';
  const inset = width < 420 ? 20 : 31;
  const titleSize = width < 420 ? 32 : width < 610 ? 39 : 46;
  const pageColor = '#FCF9F3';

  return (
    <View style={[styles.hero, { width, height, backgroundColor: item.type === 'music' ? 'transparent' : item.type === 'talent' ? '#F0EAE0' : '#F0EAE0' }]}>
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
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={id + '-fade'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="58%" stopColor={pageColor} stopOpacity={0} />
                <Stop offset="82%" stopColor={pageColor} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={pageColor} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + id + '-fade)'} />
          </Svg>
          <View pointerEvents="none" style={[styles.phaseIcon, { right: inset, top: inset }]}>
            <DreamPhaseIcon phase={item.phase} size={30} />
          </View>
          <Text style={[styles.heroKicker, { color: '#FFFFFF', top: inset + 11, right: inset + 50 }]}>
            {PHASE_LABELS[item.phase].toUpperCase()}
          </Text>
          <View style={[styles.dreamText, { left: inset, right: inset, bottom: inset + 64 }]}>
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
        <Pressable
          onPress={onMusicPress}
          disabled={!onMusicPress}
          accessibilityRole="button"
          accessibilityLabel={'Écouter ou mettre en pause ' + item.title}
          style={{ width, height }}
        >
          <CassetteArtwork width={width} height={height} title={item.title} artwork={item.coverArt || item.image} transparent />
          <View pointerEvents="none" style={styles.cassettePlay}>
            <Ionicons name="play" size={19} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : (
        <>
          <View style={styles.talentArtwork}>
            <TalentArt kind={item.instrument} size={Math.min(220, width * 0.45, height * 0.56)} />
            <Text style={styles.talentLabel}>{item.skill.toUpperCase()}</Text>
            <TalentLevelDots level={item.level} />
          </View>
        </>
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
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 18 },
  talentLabel: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: '#26211D', marginTop: 5 },
  cassettePlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -17 }, { translateY: -17 }], width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(24,20,20,0.34)', alignItems: 'center', justifyContent: 'center' },
});
