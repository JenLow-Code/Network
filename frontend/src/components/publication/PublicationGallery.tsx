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


type StoryScale = 'small' | 'featured' | 'wide';

/** One story, one cover: only category, title and handwritten member name. */
function StoryCover({
  item,
  width,
  height,
  scale,
}: {
  item: Publication;
  width: number;
  height: number;
  scale: StoryScale;
}) {
  const shadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const theme = useAppTheme();
  const isTalent = item.type === 'talent';
  const ink = isTalent ? '#26211D' : '#FFFFFF';
  const small = scale === 'small';
  const inset = small ? (width < 220 ? 11 : 14) : scale === 'wide' ? 24 : 21;
  const titleSize = small
    ? width < 195 ? 17 : 20
    : scale === 'wide'
      ? width < 480 ? 29 : 37
      : width < 430 ? 30 : 39;

  return (
    <View style={{ width, height, position: 'relative' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Open ' + item.title}
        onPress={() => router.push(publicationPath(item) as any)}
        style={styles.storyLink}
      >
        <View
          style={[
            styles.photoFrame,
            {
              backgroundColor: isTalent
                ? theme.dark ? '#D2CABE' : '#F0EAE0'
                : theme.dark ? '#2B2B2B' : '#E8E2DA',
            },
          ]}
        >
          {isTalent ? (
            <View style={[styles.talentImage, { paddingBottom: small ? 53 : 80 }]}>
              <TalentArt
                kind={item.instrument}
                size={Math.min(170, width * 0.60, height * 0.65)}
              />
            </View>
          ) : (
            <Image
              source={{ uri: item.image }}
              resizeMode="cover"
              accessibilityLabel={item.imageAlt}
              style={styles.photo}
            />
          )}
        </View>
        {!isTalent && (
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={shadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000" stopOpacity={0.02} />
                <Stop offset="45%" stopColor="#000" stopOpacity={0.03} />
                <Stop offset="72%" stopColor="#000" stopOpacity={0.35} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.78} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + shadeId + ')'} />
          </Svg>
        )}
        <View
          pointerEvents="none"
          style={[styles.storyCopy, { left: inset, right: inset, bottom: inset }]}
        >
          <Text numberOfLines={1} style={[styles.kicker, { color: ink, fontSize: small ? 9 : 10 }]}>
            {category(item).toUpperCase()}
          </Text>
          <Text
            numberOfLines={3}
            style={[
              styles.storyTitle,
              { color: ink, fontSize: titleSize, lineHeight: titleSize + (small ? 4 : 5) },
            ]}
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.handwritten, { color: ink, fontSize: small ? 22 : 27 }]}
          >
            {item.author}
          </Text>
        </View>
        {item.type === 'dream' && (
          <View pointerEvents="none" style={styles.phase}>
            <DreamPhaseIcon phase={item.phase} size={25} />
          </View>
        )}
      </Pressable>
      {/* Audio control remains an independent sibling, never a nested button. */}
      <AudioCorner item={item} />
    </View>
  );
}

export function PublicationTile({
  item,
  width,
  imageHeight,
}: {
  item: Publication;
  width: number;
  imageHeight: number;
}) {
  return <StoryCover item={item} width={width} height={imageHeight} scale="small" />;
}

function CoverStory({ item, width, height }: { item: Publication; width: number; height: number }) {
  return <StoryCover item={item} width={width} height={height} scale="featured" />;
}

function WideStory({
  item,
  width,
  compact,
}: {
  item: Publication;
  width: number;
  compact: boolean;
}) {
  const height = compact
    ? Math.max(245, Math.min(320, Math.round(width * 0.76)))
    : Math.min(405, Math.round(width * 0.43));
  return <StoryCover item={item} width={width} height={height} scale="wide" />;
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
  const height = Math.max(200, Math.min(320, Math.round(colWidth * (compact ? 1.2 : 1.0))));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {items.map(item => (
        <PublicationTile key={item.id} item={item} width={colWidth} imageHeight={height} />
      ))}
    </View>
  );
}

/**
 * Deliberate reading rhythm:
 *   featured cover + two smaller image covers;
 *   occasional full-width feature with integrated typography;
 *   otherwise orderly, borderless image-cover pairs/triples.
 *
 * Filtering works at every length without empty cells or anonymous image blocks.
 */
export function PublicationGallery({ items }: { items: Publication[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 700;
  const contentWidth = Math.max(0, Math.min(920, windowWidth) - 30);
  // Larger gaps between complete stories, small gaps inside each story.
  const gap = compact ? 28 : 36;

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
          gap: compact ? 20 : 22,
          alignItems: 'flex-start',
        }}
      >
        <CoverStory
          item={featured}
          width={compact ? contentWidth : contentWidth * 0.56}
          height={compact ? Math.min(390, Math.round(contentWidth * 1.04)) : 488}
        />
        <View
          style={{
            width: compact ? contentWidth : contentWidth * 0.44 - 22,
            flexDirection: compact ? 'row' : 'column',
            alignItems: 'flex-start',
            gap: compact ? 14 : 18,
          }}
        >
          {companions.map(item => (
            <PublicationTile
              key={item.id}
              item={item}
              width={compact ? (contentWidth - 14) / 2 : contentWidth * 0.44 - 22}
              imageHeight={compact ? Math.max(200, Math.round(((contentWidth - 14) / 2) * 1.2)) : 235}
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
  storyLink: { width: '100%', height: '100%', overflow: 'hidden', position: 'relative' },
  photoFrame: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  talentImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  storyCopy: { position: 'absolute', gap: 5 },
  kicker: { fontWeight: '600', letterSpacing: 1.2, lineHeight: 14 },
  storyTitle: { fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.5 },
  handwritten: { fontFamily: 'Caveat_700Bold', lineHeight: 30 },
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
