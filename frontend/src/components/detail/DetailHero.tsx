import React, { useId, useState } from 'react';
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
  const [dreamTextHeight, setDreamTextHeight] = useState(0);
  const textTop = width < 420 ? Math.max(112, height * 0.27) : Math.max(148, height * 0.26);
  // Keep the entire title + description above the page-color fade, including
  // when accessibility font scaling or unusually long dream summaries grow.
  const heroHeight = isDream
    ? Math.max(height, Math.ceil((textTop + dreamTextHeight + 24) / 0.76))
    : height;

  return (
    <View style={[styles.hero, {
      width,
      height: heroHeight,
      backgroundColor: isDream ? theme.background : item.type === 'music' ? 'transparent' : '#F0EAE0',
    }]}>
      {isDream ? (
        <>
          {/* A vivid photographic cover with two controlled fades:
              a dark reading veil behind the white text, then a gentle blend
              into the actual theme background below the description. */}
          <Image
            source={{ uri: item.image }}
            accessibilityLabel={item.imageAlt}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <Svg pointerEvents="none" width={width} height={heroHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={gradientId + '-ink'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000000" stopOpacity={0.19} />
                <Stop offset="22%" stopColor="#000000" stopOpacity={0.06} />
                <Stop offset="43%" stopColor="#000000" stopOpacity={0.25} />
                <Stop offset="68%" stopColor="#000000" stopOpacity={0.58} />
                <Stop offset="77%" stopColor="#000000" stopOpacity={0.58} />
                <Stop offset="90%" stopColor="#000000" stopOpacity={0.18} />
                <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={gradientId + '-paper'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={theme.background} stopOpacity={0} />
                <Stop offset="76%" stopColor={theme.background} stopOpacity={0} />
                <Stop offset="83%" stopColor={theme.background} stopOpacity={0.13} />
                <Stop offset="91%" stopColor={theme.background} stopOpacity={0.66} />
                <Stop offset="98%" stopColor={theme.background} stopOpacity={0.99} />
                <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-ink)'} />
            <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-paper)'} />
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
            onLayout={(event) => {
              const measured = Math.ceil(event.nativeEvent.layout.height);
              if (measured > 0) {
                setDreamTextHeight(old => Math.abs(old - measured) > 1 ? measured : old);
              }
            }}
            style={{ position: 'absolute', top: textTop, left: inset, right: inset }}
          >
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.headline,
                {
                  color: '#FFFFFF',
                  fontSize: width < 420 ? 32 : width < 610 ? 39 : 46,
                  lineHeight: width < 420 ? 39 : width < 610 ? 46 : 53,
                  fontFamily: Platform.select({
                    web: 'Georgia, "Times New Roman", serif',
                    ios: 'Georgia',
                    default: 'serif',
                  }),
                  textShadowColor: 'rgba(0,0,0,0.42)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: width < 420 ? 15 : 17,
                lineHeight: width < 420 ? 22 : 25,
                marginTop: width < 420 ? 12 : 15,
                paddingRight: 2,
                textShadowColor: 'rgba(0,0,0,0.48)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {item.summary}
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
