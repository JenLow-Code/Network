import React, { useId } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { ClipPath, Defs, G, Image as SvgImage, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { useAppTheme } from '@/theme/AppTheme';
import { verseExcerpt } from '@/mocks/publications';
import { approvedCassetteImage } from '@/assets/approvedCassette';

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



/**
 * One reusable photographed cassette, not a screenshot of an entire card.
 *
 * Crop the approved image down to its REAL cassette housing: this excludes
 * both the baked-in MUSIQUE heading and the fake play icon. A blank paper
 * label is laid over the original printed one, with the mechanism restored
 * above the user's album image so it stays visibly a cassette.
 *
 * Title, artist and cover artwork all come from the publication data.
 */
function CassetteArtwork({
  width,
  height,
  title,
  author,
  artwork,
}: {
  width: number;
  height: number;
  title: string;
  author: string;
  artwork?: string;
}) {
  const cassetteId = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const clipId = 'cassette-' + cassetteId;
  const reelId = 'reels-' + cassetteId;
  const tiny = width < 225;
  const cassetteWidth = Math.min(width * (tiny ? 0.86 : 0.74), height * 1.30);
  const cassetteHeight = cassetteWidth * (255 / 420);

  return (
    <View style={[styles.musicCanvas, { width, height }]}>
      {/* The ONLY category heading; the image has been cropped below its printed heading. */}
      <Text
        pointerEvents="none"
        style={[styles.musicKicker, { top: tiny ? 19 : 21, right: 60, fontSize: tiny ? 8 : 10 }]}
      >
        MUSIQUE
      </Text>

      <View style={{ width: cassetteWidth, height: cassetteHeight, position: 'relative' }}>
        <Svg width="100%" height="100%" viewBox="0 0 420 255">
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={2} y={2} width={415} height={250} rx={11} />
            </ClipPath>
            <ClipPath id={reelId}>
              <Rect x={91} y={91} width={242} height={84} rx={22} />
            </ClipPath>
          </Defs>
          <G clipPath={'url(#' + clipId + ')'}>
            {/* 480x331 original: the actual shell starts around x=33, y=69. */}
            <SvgImage href={approvedCassetteImage} x={-33} y={-69} width={480} height={331} />
            {/* Neutral, reusable cassette label. No fixed title, author or album art. */}
            <Rect x={29} y={31} width={359} height={120} fill="#F2E7D8" />
            <Rect x={29} y={145} width={359} height={21} fill="#C9847C" />
            {artwork && (
              <SvgImage
                href={artwork}
                x={45}
                y={51}
                width={72}
                height={94}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
            {/* The photographed tape mechanism sits in front of the label. */}
            <SvgImage
              href={approvedCassetteImage}
              x={-33}
              y={-69}
              width={480}
              height={331}
              clipPath={'url(#' + reelId + ')'}
            />
          </G>
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: '34%',
            top: '15%',
            right: '9%',
            height: '25%',
            justifyContent: 'center',
          }}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={2}
            style={{
              fontFamily: 'Caveat_700Bold',
              color: '#28231F',
              fontSize: tiny ? 13 : cassetteWidth < 280 ? 17 : 21,
              lineHeight: tiny ? 14 : cassetteWidth < 280 ? 18 : 22,
            }}
          >
            {title}
          </Text>
        </View>
        <Text
          pointerEvents="none"
          numberOfLines={1}
          style={{
            position: 'absolute',
            right: '8%',
            top: '36%',
            maxWidth: '20%',
            fontFamily: 'Caveat_700Bold',
            fontSize: tiny ? 10 : 15,
            lineHeight: tiny ? 12 : 17,
            color: '#28231F',
          }}
        >
          {author}
        </Text>
      </View>
    </View>
  );
}

function BibleVerseCard({
  item,
  width,
  height,
}: {
  item: Extract<Publication, { type: 'bible' }>;
  width: number;
  height: number;
}) {
  const compact = width < 230;
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: '#F0EAE0',
        paddingHorizontal: compact ? 14 : 26,
        paddingVertical: compact ? 18 : 27,
        justifyContent: 'space-between',
      }}
    >
      <Text style={[styles.bibleReference, { fontSize: compact ? 9 : 11 }]}>
        {item.reference.toUpperCase()}
      </Text>
      <Text
        numberOfLines={compact ? 6 : 9}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontFamily: 'serif',
          fontSize: compact ? 17 : Math.min(32, width * 0.06),
          lineHeight: compact ? 23 : Math.min(42, width * 0.082),
          color: '#29231E',
        }}
      >
        {verseExcerpt(item)}
      </Text>
      <Text style={[styles.handwritten, { color: '#29231E', fontSize: compact ? 23 : 28 }]}>
        {item.author}
      </Text>
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
  const isBible = item.type === 'bible';
  const isMusic = item.type === 'music';
  const illustrated = isTalent || isBible || isMusic;
  const ink = illustrated ? '#26211D' : '#FFFFFF';
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
              backgroundColor: illustrated
                  ? '#F0EAE0'
                  : theme.dark ? '#2B2B2B' : '#E8E2DA',
            },
          ]}
        >
          {isTalent ? (
            <View style={[styles.talentImage, { paddingBottom: small ? 53 : 80 }]}>
              <TalentArt kind={item.instrument} size={Math.min(170, width * 0.60, height * 0.65)} />
            </View>
          ) : isBible ? (
            <BibleVerseCard item={item} width={width} height={height} />
          ) : isMusic ? (
            <CassetteArtwork
              width={width}
              height={height}
              title={item.title}
              author={item.author}
              artwork={item.coverArt || item.image}
            />
          ) : (
            <Image source={{ uri: item.image }} resizeMode="cover" accessibilityLabel={item.imageAlt} style={styles.photo} />
          )}
        </View>
        {!illustrated && (
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
        {!isBible && !isMusic && (
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
        )}
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
  musicCanvas: { backgroundColor: '#F0EAE0', alignItems: 'center', justifyContent: 'center' },
  musicKicker: { position: 'absolute', fontWeight: '600', letterSpacing: 1.1, color: '#34302B' },
  bibleReference: { fontWeight: '600', letterSpacing: 1.2, color: '#6B625B' },
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
