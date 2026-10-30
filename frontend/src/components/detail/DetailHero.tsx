import React, { useId } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isDream = item.type === 'dream';
  const darkInk = '#26211D';
  const inset = width < 420 ? 20 : 31;
  const titleSize = width < 420 ? 32 : width < 610 ? 39 : 46;
  const theme = useAppTheme();
  const pageColor = theme.background;

  return (
    <View style={[styles.hero, {
      width,
      // Dreams grow with the actual title and goal instead of reserving a tall empty canvas.
      ...(isDream ? { minHeight: 220 } : { height }),
      backgroundColor: isDream ? pageColor : item.type === 'music' ? 'transparent' : '#F0EAE0',
    }]}>
      {isDream ? (
        <>
          <Image
            source={{ uri: item.image }}
            accessibilityLabel={item.imageAlt}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          {/* Darken the whole photograph so title and goal use the same legible ink. */}
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000000" stopOpacity={0.23} />
                <Stop offset="45%" stopColor="#000000" stopOpacity={0.56} />
                <Stop offset="100%" stopColor="#000000" stopOpacity={0.68} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + id + ')'} />
          </Svg>
          {/* Fade ONLY at the bottom of the photo — never through the heading or goal. */}
          <Svg
            pointerEvents="none"
            width="100%"
            height={92}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          >
            <Defs>
              <LinearGradient id={id + '-fade'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={pageColor} stopOpacity={0} />
                <Stop offset="40%" stopColor={pageColor} stopOpacity={0.23} />
                <Stop offset="75%" stopColor={pageColor} stopOpacity={0.83} />
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
          {/* One content-sized photographic card: title, MON BUT and goal are inseparable. */}
          <View
            pointerEvents="none"
            style={{
              paddingTop: width < 420 ? 82 : 92,
              paddingHorizontal: inset,
              paddingBottom: 98,
            }}
          >
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.headline,
                {
                  fontSize: width < 420 ? 30 : width < 610 ? 35 : 43,
                  lineHeight: width < 420 ? 36 : width < 610 ? 42 : 51,
                  fontFamily: Platform.select({
                    web: 'Georgia, "Times New Roman", serif',
                    ios: 'Georgia',
                    default: 'serif',
                  }),
                  textShadowColor: 'rgba(0,0,0,0.57)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                },
              ]}
            >
              {item.title}
            </Text>
            <View style={{ marginTop: 12, gap: 5, paddingLeft: 4 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.4,
                  color: '#F5C1D2',
                }}
              >
                MON BUT
              </Text>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: width < 420 ? 15 : 17,
                  lineHeight: width < 420 ? 22 : 25,
                  textShadowColor: 'rgba(0,0,0,0.57)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {item.summary}
              </Text>
            </View>
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
  levelLabel: { fontSize: 9, letterSpacing: 1.4, color: '#8A8076' },
  talentLabel: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: '#26211D', marginTop: 5 },
  cassettePlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -19 }, { translateY: -19 }], width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24,20,20,0.34)', alignItems: 'center', justifyContent: 'center' },
});
