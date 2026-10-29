import React, { useId, useMemo } from 'react';
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

function MusicPlayback({ index }: { index: 0 | 1 | 2 }) {
  const player = useAudioPlayer(audio[index]);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish) void player.seekTo(0);
      player.play();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause sample' : 'Play 8 second sample'}
      style={styles.play}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color="#FFFFFF" />
    </Pressable>
  );
}

function category(item: Publication) {
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

function excerpt(item: Publication) {
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

type TileSize = 1 | 2 | 4;

type PositionedTile = {
  item: Publication;
  col: number;
  row: number;
  spanX: number;
  spanY: number;
  size: TileSize;
};

/**
 * Every story occupies a whole, non-overlapping rectangle:
 * 1 = one grid cell, 2 = two adjacent cells, 4 = a 2x2 feature.
 * Pack items in data order so the layout still works after filtering.
 */
function arrange(items: Publication[], columns: number): PositionedTile[] {
  const occupied: boolean[][] = [];
  const output: PositionedTile[] = [];

  items.forEach((item, index) => {
    const pattern: TileSize[] = [4, 1, 1, 2, 1, 1, 2, 4, 1, 1, 2, 1];
    const size: TileSize =
      items.length <= 3 ? (index === 0 ? 2 : 1) : pattern[index % pattern.length];
    const spanX = size === 1 ? 1 : 2;
    const spanY = size === 4 ? 2 : 1;

    let placed = false;
    for (let row = 0; !placed; row++) {
      for (let col = 0; col <= columns - spanX; col++) {
        let free = true;
        for (let y = row; y < row + spanY; y++) {
          for (let x = col; x < col + spanX; x++) {
            if (occupied[y]?.[x]) free = false;
          }
        }
        if (!free) continue;

        for (let y = row; y < row + spanY; y++) {
          if (!occupied[y]) occupied[y] = [];
          for (let x = col; x < col + spanX; x++) occupied[y][x] = true;
        }
        output.push({ item, col, row, spanX, spanY, size });
        placed = true;
        break;
      }
    }
  });

  return output;
}

/**
 * All words belonging to one publication stay on its own image. No floating
 * captions, text-first article beside an unrelated image, borders or shadows.
 */
export function PublicationTile({
  item,
  width,
  height,
  size,
}: {
  item: Publication;
  width: number;
  height: number;
  size: TileSize;
}) {
  const shadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isTalent = item.type === 'talent';
  const large = size === 4;
  const double = size === 2;
  const bigText = large || double;
  const caption = excerpt(item);
  const ink = isTalent ? '#24231F' : '#FFFFFF';
  const side = large ? 23 : double ? 18 : 12;

  return (
    <View style={[styles.tile, { width, height }]}>
      <Pressable
        onPress={() => router.push(publicationPath(item) as any)}
        accessibilityRole="button"
        accessibilityLabel={'Open ' + item.title}
        style={[styles.cover, { backgroundColor: isTalent ? '#EAE5DB' : '#262626' }]}
      >
        {isTalent ? (
          <View style={styles.talentArt}>
            <TalentArt
              kind={item.instrument}
              size={Math.min(width * 0.62, height * 0.52, 180)}
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

        {!isTalent && (
          <Svg
            pointerEvents="none"
            width="100%"
            height="100%"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id={shadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000000" stopOpacity={0.08} />
                <Stop offset="35%" stopColor="#000000" stopOpacity={0.08} />
                <Stop offset="60%" stopColor="#000000" stopOpacity={0.36} />
                <Stop offset="80%" stopColor="#000000" stopOpacity={0.70} />
                <Stop offset="100%" stopColor="#000000" stopOpacity={0.91} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + shadeId + ')'} />
          </Svg>
        )}

        <View pointerEvents="none" style={[styles.caption, { left: side, right: side, bottom: side }]}>
          <Text numberOfLines={1} style={[styles.eyebrow, { color: ink }]}>
            {category(item).toUpperCase()}
          </Text>
          <Text
            numberOfLines={large ? 3 : double ? 2 : 3}
            style={[
              styles.headline,
              {
                color: ink,
                fontSize: large ? Math.min(36, Math.max(29, width * 0.075)) : double ? 25 : 17,
                lineHeight: large ? 42 : double ? 30 : 21,
              },
            ]}
          >
            {item.title}
          </Text>
          {large && !isTalent ? (
            <Text numberOfLines={3} style={[styles.description, { color: ink }]}>
              {caption}
            </Text>
          ) : null}
          <View style={styles.signature}>
            <Text numberOfLines={1} style={[styles.author, { color: ink, fontSize: bigText ? 26 : 22 }]}>
              {item.author}
            </Text>
            {isTalent && large ? (
              <Text style={styles.talentLevel}>{item.level}</Text>
            ) : null}
          </View>
        </View>

        {item.type === 'dream' ? (
          <View pointerEvents="none" style={styles.phase}>
            <DreamPhaseIcon phase={item.phase} size={26} />
          </View>
        ) : null}
      </Pressable>

      {/* A SIBLING of the story Pressable, never a nested <button> on web. */}
      {item.type === 'music' ? <MusicPlayback index={item.audioIndex} /> : null}
    </View>
  );
}

/**
 * Edge-to-edge editorial mosaic. The image plus its embedded title and handwritten
 * author form one complete publication; no gutters, borders or outer inset.
 */
export function PublicationGallery({ items }: { items: Publication[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const columns = windowWidth >= 790 ? 4 : windowWidth >= 600 ? 3 : 2;
  // Flush image edges: the gallery expands through Discovery's page padding.
  const contentWidth = Math.max(0, Math.min(windowWidth, 920));
  const cellWidth = contentWidth / columns;
  const cellHeight = Math.round(Math.max(178, Math.min(260, cellWidth * 1.16)));

  const layout = useMemo(() => arrange(items, columns), [items, columns]);
  const rows = layout.reduce((max, tile) => Math.max(max, tile.row + tile.spanY), 0);
  const totalHeight = rows * cellHeight;

  return (
    <View style={{ width: '100%', height: totalHeight }}>
      {layout.map(tile => (
        <View
          key={tile.item.id}
          style={{
            position: 'absolute',
            left: tile.col * cellWidth,
            top: tile.row * cellHeight,
          }}
        >
          <PublicationTile
            item={tile.item}
            size={tile.size}
            width={tile.spanX * cellWidth}
            height={tile.spanY * cellHeight}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'relative', borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  cover: { width: '100%', height: '100%', position: 'relative', borderWidth: 0, borderRadius: 0, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  talentArt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 65 },
  caption: { position: 'absolute', gap: 5 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.1, opacity: 0.91 },
  headline: { fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.5 },
  description: { fontSize: 12, lineHeight: 17, opacity: 0.91, maxWidth: 490, marginTop: 3 },
  signature: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  author: { fontFamily: 'Caveat_700Bold', fontWeight: '400', lineHeight: 30 },
  talentLevel: { fontSize: 11, color: '#69665E' },
  phase: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,252,245,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  play: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
