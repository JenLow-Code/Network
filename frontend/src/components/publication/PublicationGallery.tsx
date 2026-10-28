import React, { useId } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { verseExcerpt } from '@/mocks/publications';
import { useAppTheme } from '@/theme/AppTheme';

const audio = [
  require('../../../assets/audio/pierre-01-douceur.wav'),
  require('../../../assets/audio/pierre-02-esperance.wav'),
  require('../../../assets/audio/pierre-03-lumiere.wav'),
];

export const publicationPath = (p: Publication) =>
  p.type === 'dream'
    ? ({ pathname: '/dream/[id]', params: { id: p.id } } as const)
    : p.type === 'music'
      ? ({ pathname: '/music/[id]', params: { id: p.id } } as const)
      : p.type === 'talent'
        ? ({ pathname: '/person/[name]', params: { name: p.author } } as const)
        : ({
            pathname: '/bible/[reference]',
            params: { reference: p.referenceId, verse: String(p.highlightedVerse) },
          } as const);

function MusicCard({ index }: { index: 0 | 1 | 2 }) {
  const player = useAudioPlayer(audio[index]);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish) void player.seekTo(0);
      player.play();
    }
  };

  return (
    <Pressable
      onPress={event => {
        event.stopPropagation();
        toggle();
      }}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause sample' : 'Play 8 second sample'}
      style={styles.play}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={21} color="#fff" />
    </Pressable>
  );
}

function eyebrow(item: Publication) {
  switch (item.type) {
    case 'dream':
      return PHASE_LABELS[item.phase];
    case 'music':
      return 'Musique';
    case 'bible':
      return item.reference;
    case 'talent':
      return item.skill;
  }
}

function story(item: Publication) {
  switch (item.type) {
    case 'dream':
      return item.summary;
    case 'music':
      return item.description;
    case 'talent':
      return item.description;
    case 'bible':
      return verseExcerpt(item);
  }
}

function Artwork({
  item,
  imageHeight,
  fullBleed = false,
}: {
  item: Publication;
  imageHeight: number;
  fullBleed?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.artwork,
        {
          height: imageHeight,
          backgroundColor:
            item.type === 'talent' ? 'transparent' : theme.dark ? '#262626' : '#E6E2DA',
        },
      ]}
    >
      {item.type === 'talent' ? (
        <View style={styles.talentArtwork}>
          <TalentArt kind={item.instrument} size={Math.min(imageHeight * 0.7, 118)} />
        </View>
      ) : (
        <Image
          source={{ uri: item.image }}
          accessibilityLabel={item.imageAlt}
          resizeMode="cover"
          style={styles.image}
        />
      )}
      {item.type === 'bible' && !fullBleed ? (
        <View style={styles.verseOverlay}>
          <Text numberOfLines={7} style={styles.verse}>
            {verseExcerpt(item)}
          </Text>
        </View>
      ) : null}
      {item.type === 'dream' && (
        <View style={styles.phase}>
          <DreamPhaseIcon phase={item.phase} size={25} />
        </View>
      )}
      {item.type === 'music' && <MusicCard index={item.audioIndex} />}
    </View>
  );
}

/** Unframed type and an actual member signature, never a filled "card". */
function Byline({ item, light = false }: { item: Publication; light?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.byline}>
      <Text
        numberOfLines={1}
        style={[
          styles.author,
          { color: light ? '#FFFFFF' : theme.foreground },
        ]}
      >
        {item.author}
      </Text>
      {item.type === 'talent' ? (
        <View style={styles.dots} accessibilityLabel={item.level}>
          {['#287D58', '#2ECA65', '#EAC000', '#F38A24', '#CB245C'].map((color, i) => (
            <View
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor:
                  i <=
                  ({ Débutant: 1, Intermédiaire: 2, Confirmée: 3 } as Record<string, number>)[
                    item.level
                  ]
                    ? color
                    : theme.dark
                      ? '#505050'
                      : '#DEDCD8',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * ROWSE-inspired editorial cover: a photo as the canvas, not a rounded card.
 * The headline and handwritten member name share the same uninterrupted image.
 */
function LeadStory({ item, width }: { item: Publication; width: number }) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const height = width >= 600 ? 370 : Math.max(290, Math.min(375, width * 0.84));
  return (
    <Pressable
      onPress={() => router.push(publicationPath(item) as any)}
      accessibilityRole="button"
      accessibilityLabel={'Open ' + item.title}
      style={{ width: '100%', marginBottom: 29 }}
    >
      <View style={{ height, backgroundColor: '#171717', overflow: 'hidden' }}>
        <Artwork item={item} imageHeight={height} fullBleed />
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#000" stopOpacity={0.06} />
              <Stop offset="35%" stopColor="#000" stopOpacity={0.04} />
              <Stop offset="68%" stopColor="#000" stopOpacity={0.50} />
              <Stop offset="100%" stopColor="#000" stopOpacity={0.89} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={'url(#' + gradientId + ')'} />
        </Svg>
        <View pointerEvents="box-none" style={styles.leadCopy}>
          <Text style={styles.leadCategory}>{eyebrow(item).toUpperCase()}</Text>
          <Text
            numberOfLines={3}
            style={[styles.leadHeadline, { fontSize: width >= 600 ? 43 : 34 }]}
          >
            {item.title}
          </Text>
          <View style={styles.leadFooter}>
            <Byline item={item} light />
            <Ionicons name="arrow-forward" size={23} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * A magazine story, not a UI tile: no border, box shadow, rounded shell or
 * tinted background. Some stories lead with words rather than photographs.
 */
export function PublicationTile({
  item,
  imageHeight = 170,
  textFirst = false,
}: {
  item: Publication;
  imageHeight?: number;
  textFirst?: boolean;
}) {
  const theme = useAppTheme();
  const secondary = theme.dark ? '#C2C0BC' : '#5D5B56';
  const storyText = story(item);

  return (
    <Pressable
      onPress={() => router.push(publicationPath(item) as any)}
      accessibilityRole="button"
      accessibilityLabel={'Open ' + item.title}
      style={styles.article}
    >
      {!textFirst && <Artwork item={item} imageHeight={imageHeight} />}
      <View style={[styles.copy, textFirst && styles.textLead]}>
        <Text numberOfLines={1} style={[styles.eyebrow, { color: secondary }]}>
          {eyebrow(item).toUpperCase()}
        </Text>
        <Text
          numberOfLines={textFirst ? 4 : 3}
          style={[
            styles.headline,
            {
              color: theme.foreground,
              fontSize: textFirst ? 25 : 19,
              lineHeight: textFirst ? 29 : 24,
            },
          ]}
        >
          {item.title}
        </Text>
        {item.type !== 'bible' && (
          <Text
            numberOfLines={textFirst ? 5 : 3}
            style={[styles.excerpt, { color: secondary }]}
          >
            {storyText}
          </Text>
        )}
        <View style={styles.articleFooter}>
          <Byline item={item} />
          <Ionicons name="arrow-forward" size={17} color={theme.foreground} />
        </View>
      </View>
      {textFirst && <Artwork item={item} imageHeight={Math.round(imageHeight * 0.65)} />}
    </Pressable>
  );
}

/**
 * A lead feature + airy asymmetric magazine columns.
 * No colored blocks or visible card boundaries. Narrow phones keep two columns;
 * larger screens have three. Search and filtering remain controlled by Discovery.
 */
export function PublicationGallery({ items }: { items: Publication[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 3 : 2;
  const gutter = width < 390 ? 14 : 22;
  const contentWidth = Math.max(0, Math.min(width, 920) - 30);
  const columnWidth = Math.max(0, (contentWidth - gutter * (columns - 1)) / columns);
  const lead = items.length >= 4 ? items[0] : null;
  const entries = lead ? items.slice(1) : items;
  const ratios = [1.08, 1.35, 1.2, 1.52, 0.95, 1.28];

  return (
    <View style={styles.gallery}>
      {lead && <LeadStory item={lead} width={contentWidth} />}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: gutter }}>
        {Array.from({ length: columns }, (_, col) => (
          <View key={col} style={{ flex: 1, minWidth: 0, gap: 31 }}>
            {entries
              .filter((_, i) => i % columns === col)
              .map((item, index) => {
                const position = index * columns + col;
                const imageHeight = Math.round(
                  Math.min(285, Math.max(115, columnWidth / ratios[position % ratios.length])),
                );
                return (
                  <PublicationTile
                    key={item.id}
                    item={item}
                    imageHeight={imageHeight}
                    textFirst={position % 5 === 2 && item.type !== 'bible'}
                  />
                );
              })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { width: '100%' },
  article: { backgroundColor: 'transparent', minWidth: 0 },
  artwork: { position: 'relative', width: '100%', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  verse: { fontFamily: 'serif', fontSize: 15, lineHeight: 21, color: '#fff', textAlign: 'center' },
  phase: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(255,252,245,0.91)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadCopy: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  leadCategory: {
    color: 'rgba(255,255,255,0.87)',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  leadHeadline: {
    fontFamily: 'serif',
    color: '#fff',
    fontWeight: '400',
    letterSpacing: -0.9,
    lineHeight: 47,
    maxWidth: 570,
  },
  leadFooter: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: { paddingTop: 11, gap: 7, backgroundColor: 'transparent' },
  textLead: { paddingTop: 3, paddingBottom: 17 },
  eyebrow: { fontSize: 9, lineHeight: 13, letterSpacing: 1.4, fontWeight: '600' },
  headline: { fontFamily: 'serif', letterSpacing: -0.35, fontWeight: '400' },
  excerpt: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  articleFooter: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  byline: { flexDirection: 'row', gap: 7, alignItems: 'center', flexShrink: 1 },
  author: { fontFamily: 'Caveat_700Bold', fontSize: 23, lineHeight: 27 },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
});
