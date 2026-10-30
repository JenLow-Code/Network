import React, { useId } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { HANDWRITING_FAMILY } from '@/theme/handwriting';

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
      return 'Bible';
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
export function CassetteArtwork({
  width,
  height,
  title,
  artwork,
  transparent = false,
}: {
  width: number;
  height: number;
  title: string;
  artwork?: string;
  transparent?: boolean;
}) {
  const theme = useAppTheme();
  const cassetteId = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const clipId = 'cassette-' + cassetteId;
  const reelId = 'reels-' + cassetteId;
  const tiny = width < 225;
  const cassetteWidth = Math.min(width * (tiny ? 0.86 : 0.74), height * 1.30, 340);
  const cassetteHeight = cassetteWidth * (255 / 420);

  return (
    <View style={[styles.musicCanvas, { width, height, backgroundColor: transparent ? 'transparent' : theme.dark ? '#2C2D33' : '#F0EAE0' }]}>
      <View style={{ width: cassetteWidth, height: cassetteHeight, position: 'relative', transform: [{ translateY: tiny ? 7 : 11 }] }}>
        <Svg width="100%" height="100%" viewBox="0 0 420 255">
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={2} y={2} width={415} height={250} rx={11} />
            </ClipPath>
            <ClipPath id={reelId}>
              <Rect x={94} y={90} width={227} height={68} rx={12} />
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
            top: '13%',
            right: '9%',
            height: '24%',
            justifyContent: 'center',
          }}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={2}
            style={{
              fontFamily: HANDWRITING_FAMILY,
              color: '#28231F',
              fontSize: tiny ? 13 : cassetteWidth < 280 ? 17 : 21,
              lineHeight: tiny ? 14 : cassetteWidth < 280 ? 18 : 22,
            }}
          >
            {title}
          </Text>
          <View style={{ height: 1, backgroundColor: '#8F8276', opacity: 0.75, marginTop: 2 }} />
        </View>
      </View>
    </View>
  );
}

export function BibleVerseCard({
  item,
  width,
  height,
  adaptive = false,
}: {
  item: Extract<Publication, { type: 'bible' }>;
  width: number;
  height: number;
  adaptive?: boolean;
}) {
  const compact = width < 230;
  const theme = useAppTheme();
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: theme.dark ? '#2C2D33' : '#F0EAE0',
        paddingHorizontal: compact ? 14 : 26,
        paddingVertical: compact ? 18 : 27,
        justifyContent: 'center',
      }}
    >
      {/* Reference and verse are one typographic unit: no floating heading. */}
      <View>
        <Text
          numberOfLines={1}
          style={[styles.bibleReference, {
            color: theme.dark ? '#CFC9C4' : '#6B625B',
            fontSize: compact ? 9 : 11,
            marginBottom: compact ? 8 : 10,
          }]}
        >
          {item.reference.toUpperCase()}
        </Text>
        <Text
          numberOfLines={adaptive ? undefined : compact ? 7 : 9}
          adjustsFontSizeToFit={!adaptive}
          minimumFontScale={0.7}
          style={{
            fontFamily: 'serif',
            fontSize: compact ? 17 : Math.min(32, width * 0.06),
            lineHeight: compact ? 23 : Math.min(42, width * 0.082),
            color: theme.dark ? '#FF88B2' : '#CB245C',
          }}
        >
          {verseExcerpt(item)}
        </Text>
      </View>
    </View>
  );
}

/** A talent card communicates the member's intention; identity stays in the detail. */
function talentIntent(item: Extract<Publication, { type: 'talent' }>): string[] {
  const intentions: string[] = [];
  if (item.seeking.includes('Professeur')) intentions.push('Cherche un professeur');
  if (item.seeking.includes('Élèves')) intentions.push('Cherche des élèves');
  if (item.seeking.includes('Tandem')) {
    const partner = item.instrument === 'guitar'
      ? 'un guitariste'
      : item.instrument === 'drums'
        ? 'un batteur'
        : 'un photographe';
    intentions.push('Tandem avec ' + partner);
  }
  return intentions.slice(0, 2);
}

type StoryScale = 'small' | 'featured' | 'wide';

/** Editorial Discovery cover: visual, category and content, with authors shown in the detail header. */
function StoryCover({
  item,
  width,
  height,
  scale,
  adaptive = false,
}: {
  item: Publication;
  width: number;
  height: number;
  scale: StoryScale;
  adaptive?: boolean;
}) {
  const shadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const theme = useAppTheme();
  const isTalent = item.type === 'talent';
  const isBible = item.type === 'bible';
  const isMusic = item.type === 'music';
  const illustrated = isTalent || isBible || isMusic;
  const ink = illustrated ? (theme.dark ? '#ECE7E1' : '#26211D') : '#FFFFFF';
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
                  ? (theme.dark ? '#2C2D33' : '#F0EAE0')
                  : theme.dark ? '#2B2B2B' : '#E8E2DA',
            },
          ]}
        >
          {isTalent ? (
            <View style={[styles.talentImage, { paddingBottom: small ? 55 : 80 }]}>
              <TalentArt
                kind={item.instrument}
                size={Math.min(155, width * 0.54, height * 0.52)}
              />
              <View
                style={styles.talentLevels}
                accessibilityLabel={'Niveau : ' + item.level}
              >
                {['#268B60', '#38C975', '#E8BD11', '#F18A2B', '#CB245C'].map((color, i) => {
                  const level = item.level === 'Débutant' ? 2 : item.level === 'Intermédiaire' ? 3 : 4;
                  return (
                    <View
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: i < level ? color : (theme.dark ? '#64666B' : '#D5D4D1'),
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ) : isBible ? (
            <BibleVerseCard item={item} width={width} height={height} adaptive={adaptive} />
          ) : isMusic ? (
            <CassetteArtwork
              width={width}
              height={height}
              title={item.title}
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
                <Stop offset="45%" stopColor="#000" stopOpacity={0.06} />
                <Stop offset="72%" stopColor="#000" stopOpacity={0.46} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.92} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + shadeId + ')'} />
          </Svg>
        )}
        {/* Consistent taxonomy in the top-right, next to the phase or play control. */}
        {!isBible && (
        <View
          pointerEvents="none"
          style={[
            styles.topMeta,
            {
              top: small ? 19 : 21,
              right: item.type === 'dream' || isMusic ? 58 : inset,
              left: inset,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.kicker, { color: ink, textAlign: 'right', fontSize: small ? 9 : 10 }]}
          >
            {category(item).toUpperCase()}
          </Text>
        </View>
        )}
        {item.type === 'dream' && (
          <View
            pointerEvents="none"
            style={[
              styles.bottomTitle,
              { left: inset, right: inset, bottom: inset },
            ]}
          >
            <Text
              numberOfLines={adaptive ? undefined : 3}
              adjustsFontSizeToFit={!adaptive}
              minimumFontScale={0.8}
              style={[
                styles.storyTitle,
                {
                  color: ink,
                  fontFamily: Platform.select({
                    web: 'Georgia, "Times New Roman", serif',
                    ios: 'Georgia',
                    default: 'serif',
                  }),
                  fontSize: titleSize,
                  lineHeight: titleSize + (small ? 5 : 7),
                  letterSpacing: -0.8,
                },
              ]}
            >
              {item.title}
            </Text>
          </View>
        )}
        {isTalent && (
          <View pointerEvents="none" style={{ position: 'absolute', left: inset, right: inset, bottom: inset, gap: 3 }}>
            {talentIntent(item).map((line, i) => (
              <Text
                key={line}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.73}
                style={{
                  fontSize: small && width < 220 ? 11 : 13,
                  lineHeight: 18,
                  color: theme.dark ? (i === 0 ? '#ECE7E1' : '#B5B0AC') : (i === 0 ? '#26211D' : '#776E64'),
                  fontWeight: i === 0 ? '600' : '400',
                }}
              >
                {line}
              </Text>
            ))}
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
 * One column per card, without featured spans. Only the Discovery screen uses
 * this variation; detail-page related publications retain the editorial gallery.
 * Heights estimate the full copy so long Dreams and Bible verses are not clipped.
 */
function estimatedLines(copy: string, width: number, fontSize: number): number {
  const maxChars = Math.max(8, Math.floor(width / (fontSize * 0.56)));
  let lines = 1;
  let used = 0;
  for (const word of copy.split(/\s+/).filter(Boolean)) {
    const length = word.length;
    if (used > 0 && used + 1 + length > maxChars) {
      lines += 1;
      used = 0;
    }
    if (length > maxChars) {
      lines += Math.floor((length - 1) / maxChars);
      used = length % maxChars || maxChars;
    } else {
      used += (used ? 1 : 0) + length;
    }
  }
  return lines;
}

function adaptiveTileHeight(item: Publication, width: number): number {
  if (item.type === 'bible') {
    const compact = width < 230;
    const fontSize = compact ? 17 : Math.min(32, width * 0.06);
    const lineHeight = compact ? 23 : Math.min(42, width * 0.082);
    const verseWidth = width - (compact ? 28 : 52);
    const lines = estimatedLines(verseExcerpt(item), verseWidth, fontSize);
    return Math.max(160, Math.ceil(lines * lineHeight + (compact ? 94 : 112)));
  }
  if (item.type === 'dream') {
    const fontSize = width < 195 ? 17 : 20;
    const inset = width < 220 ? 11 : 14;
    const lines = estimatedLines(item.title, width - inset * 2, fontSize);
    // Room for the phase badge, readable title, and photography.
    return Math.max(Math.round(width * 1.08), 98 + lines * (fontSize + 6));
  }
  if (item.type === 'music') return Math.max(184, Math.round(width * 1.12));
  return Math.max(190, Math.round(width * 1.17));
}

function MasonryGallery({ items, viewportWidth }: { items: Publication[]; viewportWidth: number }) {
  const columns = viewportWidth >= 1100 ? 4 : viewportWidth >= 700 ? 3 : 2;
  const gap = viewportWidth < 700 ? 12 : viewportWidth < 1100 ? 17 : 19;
  const contentWidth = Math.max(0, Math.min(920, viewportWidth) - 30);
  const columnWidth = Math.max(0, (contentWidth - (columns - 1) * gap) / columns);
  const stacks: Publication[][] = Array.from({ length: columns }, () => []);
  const heights = Array.from({ length: columns }, () => 0);
  for (const item of items) {
    // Balance varying heights while retaining the incoming order inside each column.
    const shortest = heights.indexOf(Math.min(...heights));
    stacks[shortest].push(item);
    heights[shortest] += adaptiveTileHeight(item, columnWidth) + gap;
  }
  return (
    <View style={{ width: '100%', paddingHorizontal: 15, paddingBottom: 18, flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {stacks.map((stack, index) => (
        <View key={'column-' + index} style={{ width: columnWidth, gap }}>
          {stack.map(item => (
            <StoryCover
              key={item.id}
              item={item}
              width={columnWidth}
              height={adaptiveTileHeight(item, columnWidth)}
              scale="small"
              adaptive
            />
          ))}
        </View>
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
export function PublicationGallery({ items, layout = 'editorial' }: { items: Publication[]; layout?: 'editorial' | 'masonry' }) {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 700;
  const contentWidth = Math.max(0, Math.min(920, windowWidth) - 30);
  // Larger gaps between complete stories, small gaps inside each story.
  const gap = compact ? 28 : 36;

  if (!items.length) return null;
  if (layout === 'masonry') return <MasonryGallery items={items} viewportWidth={windowWidth} />;

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
  photoFrame: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  talentImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topMeta: { position: 'absolute', zIndex: 3, alignItems: 'flex-end' },
  bottomTitle: { position: 'absolute', zIndex: 2 },
  talentLevels: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  kicker: { fontWeight: '600', letterSpacing: 1.2, lineHeight: 14 },
  storyTitle: { fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.5 },
  handwritten: { fontFamily: HANDWRITING_FAMILY, lineHeight: 30 },
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
