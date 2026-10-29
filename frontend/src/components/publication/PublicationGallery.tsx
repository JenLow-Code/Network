import React, { useId } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
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

function category(item: Publication): string {
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

function description(item: Publication): string {
  switch (item.type) {
    case 'dream':
      return item.summary;
    case 'music':
      return item.description;
    case 'bible':
      return verseExcerpt(item);
    case 'talent':
      return item.description;
  }
}

function MusicPlayback({ index }: { index: 0 | 1 | 2 }) {
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
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause sample' : 'Play 8 second sample'}
      style={styles.playButton}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={21} color="#FFFFFF" />
    </Pressable>
  );
}

/** Sibling audio control: never nest a button inside the story's Pressable on web. */
function AudioCorner({ item }: { item: Publication }) {
  if (item.type !== 'music') return null;
  return (
    <View style={styles.audioCorner}>
      <MusicPlayback index={item.audioIndex} />
    </View>
  );
}

function Photo({
  item,
  height,
}: {
  item: Publication;
  height: number;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.photoFrame,
        {
          height,
          backgroundColor:
            item.type === 'talent'
              ? theme.dark
                ? '#D2CABE'
                : '#F0EAE0'
              : theme.dark
                ? '#2B2B2B'
                : '#E8E2DA',
        },
      ]}
    >
      {item.type === 'talent' ? (
        <View style={styles.talentImage}>
          <TalentArt kind={item.instrument} size={Math.min(130, height * 0.66)} />
        </View>
      ) : (
        <Image
          source={{ uri: item.image }}
          resizeMode="cover"
          accessibilityLabel={item.imageAlt}
          style={styles.photo}
        />
      )}

      {item.type === 'dream' ? (
        <View pointerEvents="none" style={styles.phase}>
          <DreamPhaseIcon phase={item.phase} size={25} />
        </View>
      ) : null}

    </View>
  );
}

function Byline({ item, inverse = false }: { item: Publication; inverse?: boolean }) {
  const theme = useAppTheme();
  return (
    <Text
      numberOfLines={1}
      style={[styles.handwritten, { color: inverse ? '#FFFFFF' : theme.foreground }]}
    >
      {item.author}
    </Text>
  );
}

function ArticleCopy({
  item,
  prominent = false,
}: {
  item: Publication;
  prominent?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.articleCopy, prominent && styles.prominentCopy]}>
      <Text
        numberOfLines={1}
        style={[styles.kicker, { color: theme.dark ? '#BFB6B3' : '#716B65' }]}
      >
        {category(item).toUpperCase()}
      </Text>
      <Text
        numberOfLines={3}
        style={[
          styles.articleTitle,
          {
            fontSize: prominent ? 29 : 19,
            lineHeight: prominent ? 34 : 24,
            color: theme.foreground,
          },
        ]}
      >
        {item.title}
      </Text>
      <Text
        numberOfLines={prominent ? 4 : 2}
        style={[styles.excerpt, { color: theme.dark ? '#BDBAB6' : '#65615C' }]}
      >
        {description(item)}
      </Text>
      <View style={styles.bylineRow}>
        <Byline item={item} />
        {prominent ? <Ionicons name="arrow-forward" size={19} color={theme.foreground} /> : null}
      </View>
    </View>
  );
}

/** Classic unboxed magazine article: photo above, type below, intact as one unit. */
export function PublicationTile({
  item,
  width,
  imageHeight,
}: {
  item: Publication;
  width: number;
  imageHeight: number;
}) {
  return (
    <View style={{ width, minWidth: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Open ' + item.title}
        onPress={() => router.push(publicationPath(item) as any)}
      >
        <Photo item={item} height={imageHeight} />
        <ArticleCopy item={item} />
      </Pressable>
      <AudioCorner item={item} />
    </View>
  );
}

/**
 * One intentional cover, not a feed of identical dark overlays.
 * The bottom gradient is gentle enough to retain the photography.
 */
function CoverStory({ item, width, height }: { item: Publication; width: number; height: number }) {
  const theme = useAppTheme();
  const shadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isTalent = item.type === 'talent';
  const foreground = isTalent ? '#26211D' : '#FFFFFF';

  return (
    <View style={{ width, height }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Open ' + item.title}
        onPress={() => router.push(publicationPath(item) as any)}
        style={{ flex: 1 }}
      >
        <Photo item={item} height={height} />
        {!isTalent ? (
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={shadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000" stopOpacity={0.04} />
                <Stop offset="49%" stopColor="#000" stopOpacity={0.02} />
                <Stop offset="72%" stopColor="#000" stopOpacity={0.32} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.79} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + shadeId + ')'} />
          </Svg>
        ) : null}
        <View pointerEvents="none" style={styles.coverCopy}>
          <Text style={[styles.coverKicker, { color: foreground }]}>
            {category(item).toUpperCase()}
          </Text>
          <Text
            numberOfLines={3}
            style={[
              styles.coverTitle,
              {
                color: foreground,
                fontSize: width < 430 ? 31 : 39,
                lineHeight: width < 430 ? 36 : 44,
              },
            ]}
          >
            {item.title}
          </Text>
          <View style={styles.coverByline}>
            <Byline item={item} inverse={!isTalent} />
            <Ionicons name="arrow-forward" color={foreground} size={22} />
          </View>
        </View>
      </Pressable>
      <AudioCorner item={item} />
    </View>
  );
}

/**
 * Full-width feature. Keep the image and its typography in the same reading
 * column: the previous horizontal split made it unclear which photo owned
 * the adjacent words.
 */
function WideStory({
  item,
  width,
  compact,
}: {
  item: Publication;
  width: number;
  compact: boolean;
}) {
  const mediaHeight = compact
    ? Math.min(260, Math.round(width * 0.64))
    : Math.min(340, Math.round(width * 0.37));

  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Open ' + item.title}
        onPress={() => router.push(publicationPath(item) as any)}
      >
        <Photo item={item} height={mediaHeight} />
        <View style={{ maxWidth: compact ? width : 680 }}>
          <ArticleCopy item={item} prominent />
        </View>
      </Pressable>
      <AudioCorner item={item} />
    </View>
  );
}

function ArticleRow({
  items,
  width,
  compact,
}: {
  items: Publication[];
  width: number;
  compact: boolean;
}) {
  const gap = compact ? 14 : 22;
  const count = Math.min(compact ? 2 : 3, items.length);
  const colWidth = (width - gap * (count - 1)) / count;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {items.map(item => (
        <PublicationTile
          key={item.id}
          item={item}
          width={colWidth}
          imageHeight={Math.max(140, Math.min(300, Math.round(colWidth * (compact ? 0.92 : 0.80))))}
        />
      ))}
    </View>
  );
}

/**
 * Deliberate reading rhythm:
 *   featured cover + two separately grouped editorial articles;
 *   occasional full-width story with its caption directly below the image;
 *   otherwise orderly, unframed article pairs/triples.
 *
 * Filtering works at every length without empty cells or anonymous image blocks.
 */
export function PublicationGallery({ items }: { items: Publication[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 700;
  const contentWidth = Math.max(0, Math.min(920, windowWidth) - 30);
  // Larger gaps between complete stories, small gaps inside each story.
  const gap = compact ? 38 : 54;

  if (!items.length) return null;

  const sections: React.ReactNode[] = [];
  let index = 0;

  if (items.length >= 4) {
    const featured = items[0];
    const companions = items.slice(1, 3);
    sections.push(
      <View
        key="opening"
        style={{
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 31 : 27,
          alignItems: 'flex-start',
        }}
      >
        <CoverStory
          item={featured}
          width={compact ? contentWidth : contentWidth * 0.56}
          height={compact ? Math.min(350, contentWidth * 0.88) : 488}
        />
        <View
          style={{
            width: compact ? contentWidth : contentWidth * 0.44 - 27,
            flexDirection: compact ? 'row' : 'column',
            alignItems: 'flex-start',
            gap: compact ? 14 : 37,
          }}
        >
          {companions.map((item, i) => (
            <PublicationTile
              key={item.id}
              item={item}
              width={compact ? (contentWidth - 14) / 2 : contentWidth * 0.44 - 27}
              imageHeight={compact ? Math.round((contentWidth - 14) / 2 * 0.96) : 146}
            />
          ))}
        </View>
      </View>,
    );
    index = 3;
  }

  let rowNo = 0;
  while (index < items.length) {
    const remaining = items.length - index;
    const featuredRow = remaining >= 2 && (index === 3 || rowNo === 2);
    if (featuredRow) {
      sections.push(
        <WideStory
          key={'wide-' + items[index].id}
          item={items[index]}
          width={contentWidth}
          compact={compact}
        />,
      );
      index++;
    } else {
      const count = Math.min(compact ? 2 : 3, remaining);
      sections.push(
        <ArticleRow
          key={'row-' + items[index].id}
          items={items.slice(index, index + count)}
          width={contentWidth}
          compact={compact}
         />,
      );
      index += count;
      rowNo++;
    }
  }

  return (
    <View style={{ width: '100%', gap, paddingBottom: 18 }}>
      {sections}
    </View>
  );
}

const styles = StyleSheet.create({
  photoFrame: { width: '100%', overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  talentImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phase: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 33,
    height: 33,
    borderRadius: 18,
    backgroundColor: 'rgba(255,252,245,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleCopy: { paddingTop: 11, paddingHorizontal: 1, gap: 5 },
  prominentCopy: { paddingTop: 14, gap: 11 },
  kicker: { fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '600' },
  articleTitle: { fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.45 },
  excerpt: { fontSize: 12, lineHeight: 17 },
  bylineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handwritten: { fontFamily: 'Caveat_700Bold', fontSize: 23, lineHeight: 28 },
  coverCopy: {
    position: 'absolute',
    left: 21,
    right: 21,
    bottom: 22,
    gap: 9,
  },
  coverKicker: { fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 1.3 },
  coverTitle: { fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.7 },
  coverByline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  audioCorner: { position: 'absolute', top: 9, right: 9, zIndex: 4 },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.63)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
