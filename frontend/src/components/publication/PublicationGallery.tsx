import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { Publication, PHASE_LABELS } from '@/domain/publication';
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

function editorialCategory(item: Publication) {
  switch (item.type) {
    case 'dream':
      return 'RÊVE  /  ' + PHASE_LABELS[item.phase].toUpperCase();
    case 'music':
      return 'MUSIQUE';
    case 'bible':
      return 'BIBLE  /  ' + item.reference;
    case 'talent':
      return 'TALENT  /  ' + item.level.toUpperCase();
  }
}

function editorialExcerpt(item: Publication) {
  switch (item.type) {
    case 'dream':
      return item.summary;
    case 'music':
      return item.description;
    case 'talent':
      return item.description;
    case 'bible':
      return '';
  }
}

/**
 * Borderless editorial tile: image, story, then the member's handwritten name.
 * Phase illustrations and audio playback stay interactive and accessible.
 */
export function PublicationTile({
  item,
  imageHeight = 170,
}: {
  item: Publication;
  imageHeight?: number;
}) {
  const theme = useAppTheme();
  const excerpt = editorialExcerpt(item);
  const ink = theme.foreground;
  const secondary = theme.dark ? '#C6C2BE' : '#68645F';

  return (
    <Pressable
      onPress={() => router.push(publicationPath(item) as any)}
      accessibilityRole="button"
      accessibilityLabel={'Open ' + item.title}
      style={styles.tile}
    >
      <View
        style={[
          styles.imageFrame,
          {
            height: imageHeight,
            backgroundColor:
              item.type === 'talent'
                ? theme.dark
                  ? '#D6D0C6'
                  : '#F0ECE5'
                : theme.dark
                  ? '#2B2C30'
                  : '#EAE7E0',
          },
        ]}
      >
        {item.type === 'talent' ? (
          <View style={styles.talentArtwork}>
            <TalentArt kind={item.instrument} size={Math.min(112, imageHeight * 0.72)} />
          </View>
        ) : (
          <Image
            source={{ uri: item.image }}
            accessibilityLabel={item.imageAlt}
            resizeMode="cover"
            style={styles.image}
          />
        )}

        {item.type === 'bible' && (
          <View style={styles.verseOverlay}>
            <Text numberOfLines={7} style={styles.verse}>
              {verseExcerpt(item)}
            </Text>
          </View>
        )}

        {item.type === 'dream' && (
          <View style={styles.phaseMark}>
            <DreamPhaseIcon phase={item.phase} size={27} />
          </View>
        )}

        {item.type === 'music' && <MusicCard index={item.audioIndex} />}
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={2}
          style={[styles.category, { color: theme.dark ? '#C5AAB5' : '#9D526C' }]}
        >
          {editorialCategory(item)}
        </Text>
        <Text numberOfLines={3} style={[styles.headline, { color: ink }]}>
          {item.title}
        </Text>
        {excerpt ? (
          <Text numberOfLines={2} style={[styles.excerpt, { color: secondary }]}>
            {excerpt}
          </Text>
        ) : null}
        <View style={styles.signature}>
          {/* Keep the existing handwritten member name, including on music posts. */}
          <Text numberOfLines={1} style={[styles.author, { color: ink }]}>
            {item.author}
          </Text>
          {item.type === 'talent' && (
            <View style={styles.levelDots} accessibilityLabel={item.level}>
              {['#287D58', '#2ECA65', '#EAC000', '#F38A24', '#CB245C'].map((color, i) => (
                <View
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor:
                      i <=
                      ({ Débutant: 1, Intermédiaire: 2, Confirmée: 3 } as Record<
                        string,
                        number
                      >)[item.level]
                        ? color
                        : theme.dark
                          ? '#505050'
                          : '#DFDFDF',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Two readable columns on phones, three on wider screens. Images keep a
 * restrained editorial rhythm instead of turning the feed into a photo wall.
 */
export function PublicationGallery({ items }: { items: Publication[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 3 : 2;
  const gutter = width < 390 ? 12 : 17;
  const availableWidth = Math.min(width, 920) - 30;
  const columnWidth = (availableWidth - gutter * (columns - 1)) / columns;
  const ratios = [1.16, 0.98, 1.34, 1.1, 1.04, 1.26];

  return (
    <View style={{ flexDirection: 'row', gap: gutter, alignItems: 'flex-start' }}>
      {Array.from({ length: columns }, (_, col) => (
        <View key={col} style={{ flex: 1, minWidth: 0, gap: 24 }}>
          {items
            .filter((_, i) => i % columns === col)
            .map((item, index) => {
              const originalIndex = index * columns + col;
              const imageHeight = Math.max(
                124,
                Math.min(272, Math.round(columnWidth / ratios[originalIndex % ratios.length])),
              );
              return <PublicationTile key={item.id} item={item} imageHeight={imageHeight} />;
            })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: 'transparent', minWidth: 0 },
  imageFrame: { position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 2 },
  image: { width: '100%', height: '100%' },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  verse: {
    fontFamily: 'serif',
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  phaseMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFCF5',
  },
  play: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { paddingTop: 9, paddingHorizontal: 1, gap: 5 },
  category: { fontSize: 9, lineHeight: 13, fontWeight: '700', letterSpacing: 1.05 },
  headline: {
    fontFamily: 'serif',
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.45,
  },
  excerpt: { fontSize: 12, lineHeight: 17, letterSpacing: 0.05 },
  signature: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 9 },
  author: { fontFamily: 'Caveat_700Bold', fontSize: 21, lineHeight: 25, fontWeight: '400' },
  levelDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
