import React, { useId } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import {
  Publication,
  PHASE_COLORS,
  PHASE_LABELS,
  PHASE_SYMBOLS,
  publicationColor,
} from '@/domain/publication';
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
      onPress={toggle}
      accessibilityLabel={status.playing ? 'Pause sample' : 'Play 8 second sample'}
      style={s.play}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={23} color="#fff" />
    </Pressable>
  );
}
export function PublicationTile({ item }: { item: Publication }) {
  const shadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const open = () => router.push(publicationPath(item) as any);
  const bg = publicationColor(item);
  return (
    <Pressable
      onPress={open}
      accessibilityLabel={'Open ' + item.title}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e8e8e8',
        backgroundColor: bg,
      }}
    >
      <View
        style={{
          height: item.type === 'bible' ? 230 : item.type === 'dream' ? 190 : 156,
          position: 'relative',
          margin: 10,
          marginBottom: 0,
          borderRadius: 9,
          overflow: 'hidden',
        }}
      >
        {item.type === 'talent' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <TalentArt kind={item.instrument} size={110} />
          </View>
        ) : (
          <Image
            source={{ uri: item.image }}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        {/* Consistent, top-down image shading on every publication tile.
        Talent illustrations receive a softer tint so the fine line-art remains visible. */}
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id={shadeId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                offset="0%"
                stopColor="#050505"
                stopOpacity={item.type === 'talent' ? 0.23 : 0.76}
              />
              <Stop
                offset="47%"
                stopColor="#050505"
                stopOpacity={item.type === 'talent' ? 0.14 : 0.48}
              />
              <Stop offset="85%" stopColor="#050505" stopOpacity={0.06} />
              <Stop offset="100%" stopColor="#050505" stopOpacity={0} />
            </SvgGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${shadeId})`} />
        </Svg>
        {item.type === 'bible' ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              padding: 13,
              justifyContent: 'center',
            }}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={{
                color: '#fff',
                fontSize: 14,
                lineHeight: 21,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {verseExcerpt(item)}
            </Text>
          </View>
        ) : null}
        {item.type === 'dream' ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 9,
              backgroundColor: PHASE_COLORS[item.phase].background,
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <DreamPhaseIcon phase={item.phase} size={25} />
          </View>
        ) : null}
        {item.type === 'music' ? <MusicCard index={item.audioIndex} /> : null}
      </View>
      <View style={{ padding: 11, gap: 5, minHeight: 66 }}>
        <Text
          numberOfLines={3}
          style={{ fontWeight: '700', fontSize: 14, color: '#202020', letterSpacing: 0.2 }}
        >
          {item.title}
        </Text>
        {/* Replace Caveat with Biro Script Plus after the licensed font is supplied and registered in app/_layout. */}
        <Text
          style={{ fontFamily: 'Caveat_700Bold', fontSize: 17, lineHeight: 22, color: '#565656' }}
        >
          {item.type === 'music' ? item.songAuthor : item.author}
        </Text>
        {item.type === 'talent' ? (
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
            {['#287D58', '#2ECA65', '#EAC000', '#F38A24', '#CB245C'].map((color, i) => (
              <View
                key={i}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor:
                    i <=
                    ({ Débutant: 1, Intermédiaire: 2, Confirmée: 3 } as Record<string, number>)[
                      item.level
                    ]
                      ? color
                      : '#E6E6E6',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
export function PublicationGallery({ items }: { items: Publication[] }) {
  return (
    <View style={s.gallery}>
      {[0, 1].map(col => (
        <View key={col} style={{ flex: 1, gap: 11 }}>
          {items
            .filter((_, i) => i % 2 === col)
            .map(item => (
              <PublicationTile key={item.id} item={item} />
            ))}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  gallery: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  outer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#e9e9e9', position: 'relative' },
  image: { width: '100%', height: '100%', justifyContent: 'space-between' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.44)', borderRadius: 12 },
  top: { padding: 10 },
  type: { fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 0.6 },
  bottom: { padding: 10, gap: 6 },
  phase: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 19 },
  author: { color: '#eee', fontSize: 11 },
  verse: { fontSize: 12, color: '#fff', lineHeight: 18, fontWeight: '500' },
  play: {
    position: 'absolute',
    top: 10,
    right: 9,
    borderRadius: 27,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0,0,0,.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
