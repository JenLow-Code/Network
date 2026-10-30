import React, { useId, useState } from 'react';
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
  const inset = width < 420 ? 20 : 31;
  const theme = useAppTheme();
  const pageColor = theme.background;
  // Explicit pixel height avoids percentage-sized image overlays stretching the Dream card.
  // Updated from the measured title + goal; no fixed desktop-sized blank region.
  const [measuredDreamHeight, setMeasuredDreamHeight] = useState(0);
  const dreamHeight = measuredDreamHeight || Math.max(270, Math.min(350, width * 0.86));

  return (
    <View style={[styles.hero, {
      width,
      // The image and its overlays always have the same finite height.
      height: isDream ? dreamHeight : height,
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
          {/* One photo-to-page fade across the ENTIRE image, not a bottom strip.
              Title and goal share the same photographic surface. */}
          <Svg pointerEvents="none" width={width} height={dreamHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={id + '-editorial'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={pageColor} stopOpacity={0.08} />
                <Stop offset="15%" stopColor={pageColor} stopOpacity={0.24} />
                <Stop offset="27%" stopColor={pageColor} stopOpacity={0.76} />
                <Stop offset="43%" stopColor={pageColor} stopOpacity={0.93} />
                <Stop offset="65%" stopColor={pageColor} stopOpacity={0.985} />
                <Stop offset="100%" stopColor={pageColor} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + id + '-editorial)'} />
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
            onLayout={event => {
              const next = Math.ceil(event.nativeEvent.layout.height);
              if (next > 0) {
                setMeasuredDreamHeight(previous => Math.abs(previous - next) > 1 ? next : previous);
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: width < 420 ? 76 : 90,
              paddingHorizontal: inset,
              paddingBottom: width < 420 ? 32 : 40,
            }}
          >
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.headline,
                {
                  color: theme.foreground,
                  fontSize: width < 420 ? 30 : width < 610 ? 35 : 43,
                  lineHeight: width < 420 ? 36 : width < 610 ? 42 : 51,
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
            <View style={{ marginTop: 12, gap: 5, paddingLeft: 4 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.4,
                  color: theme.dark ? '#F5C1D2' : '#B34D74',
                }}
              >
                MON BUT
              </Text>
              <Text
                style={{
                  color: theme.foreground,
                  fontSize: width < 420 ? 15 : 17,
                  lineHeight: width < 420 ? 22 : 25,
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
  headline: { fontWeight: '400', color: '#FFFFFF', letterSpacing: -0.75 },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 18 },
  levelLabel: { fontSize: 9, letterSpacing: 1.4, color: '#8A8076' },
  talentLabel: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: '#26211D', marginTop: 5 },
  cassettePlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -19 }, { translateY: -19 }], width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24,20,20,0.34)', alignItems: 'center', justifyContent: 'center' },
});
