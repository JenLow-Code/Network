import React, { useId } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { useAppTheme } from '@/theme/AppTheme';
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
  musicPlaying = false,
}: {
  item: Publication;
  width: number;
  height: number;
  onMusicPress?: () => void;
  musicPlaying?: boolean;
}) {
  const isDream = item.type === 'dream';
  const inset = width < 420 ? 20 : 31;
  const theme = useAppTheme();
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  return (
    <View style={[styles.hero, {
      width,
      height,
      backgroundColor: isDream ? (theme.dark ? '#282729' : '#D7C5B4') : item.type === 'music' ? 'transparent' : '#F0EAE0',
    }]}>
      {isDream ? (
        <>
          {/* The same editorial photograph treatment as Discovery:
              vivid image, restrained dark gradient only where the title sits. */}
          <Image
            source={{ uri: item.image }}
            accessibilityLabel={item.imageAlt}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000" stopOpacity={0.12} />
                <Stop offset="42%" stopColor="#000" stopOpacity={0.03} />
                <Stop offset="61%" stopColor="#000" stopOpacity={0.23} />
                <Stop offset="80%" stopColor="#000" stopOpacity={0.58} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.84} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + gradientId + ')'} />
          </Svg>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: inset,
              right: inset,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text numberOfLines={1} style={[styles.heroKicker, {
              color: '#FFFFFF',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }]}>
              {PHASE_LABELS[item.phase].toUpperCase()}
            </Text>
            <View style={styles.phaseIcon}>
              <DreamPhaseIcon phase={item.phase} size={30} />
            </View>
          </View>

          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: inset, right: inset, bottom: width < 420 ? 22 : 29 }}
          >
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.headline,
                {
                  color: '#FFFFFF',
                  fontSize: width < 420 ? 33 : width < 610 ? 39 : 46,
                  lineHeight: width < 420 ? 39 : width < 610 ? 46 : 53,
                  fontFamily: Platform.select({
                    web: 'Georgia, "Times New Roman", serif',
                    ios: 'Georgia',
                    default: 'serif',
                  }),
                  textShadowColor: 'rgba(0,0,0,0.4)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
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
            <Ionicons name={musicPlaying ? "pause" : "play"} size={21} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : (
        <>
          <View style={styles.talentArtwork}>
            <TalentArt kind={item.instrument} size={Math.min(220, width * 0.45, height * 0.56)} />
            <Text style={styles.talentLabel}>{item.skill.toUpperCase()}</Text>
            <TalentLevelDots level={item.level} />
            <Text style={styles.levelLabel}>{item.level.toLocaleUpperCase('fr')}</Text>
          </View>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden' },
  phaseIcon: {
    width: 41,
    height: 41,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,252,245,0.94)',
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  headline: { fontWeight: '400', color: '#FFFFFF', letterSpacing: -0.75 },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 18 },
  levelLabel: { fontSize: 9, letterSpacing: 1.4, color: '#8A8076' },
  talentLabel: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: '#26211D', marginTop: 5 },
  cassettePlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -19 }, { translateY: -19 }], width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24,20,20,0.34)', alignItems: 'center', justifyContent: 'center' },
});
