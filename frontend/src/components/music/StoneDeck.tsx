import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors as c } from '@/theme/colors';

const sources = [
  require('../../../assets/audio/pierre-01-douceur.wav'),
  require('../../../assets/audio/pierre-02-esperance.wav'),
  require('../../../assets/audio/pierre-03-lumiere.wav'),
];
const names = ['Douceur', 'Espérance', 'Lumière'];
const BARS = Array.from(
  { length: 38 },
  (_, i) => 8 + Math.round(20 * Math.abs(Math.sin(i * 1.74) * 0.7 + Math.cos(i * 0.37) * 0.3)),
);
function durationLabel(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const seconds = Math.floor(sec);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function Stone({
  index,
  active,
  onActivate,
  onClose,
  width,
}: {
  index: number;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  width: number;
}) {
  const player = useAudioPlayer(sources[index]);
  const status = useAudioPlayerStatus(player);
  const [barWidth, setBarWidth] = useState(1);
  useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);
  const duration = status.duration || 8.2;
  const fraction = Math.max(0, Math.min(1, status.currentTime / duration));
  function playPause() {
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish) void player.seekTo(0);
      player.play();
    }
  }
  function activate() {
    onActivate();
    player.play();
  }
  function seek(x: number) {
    void player.seekTo(Math.max(0, Math.min(duration, (x / Math.max(barWidth, 1)) * duration)));
  }
  if (!active)
    return (
      <Pressable
        accessibilityLabel={'Play ' + names[index]}
        onPress={activate}
        style={[s.tile, { marginLeft: index === 0 ? 0 : -9, zIndex: 10 - index }]}
      >
        <Ionicons name="play-circle" size={27} color="#a4a4a4" />
      </Pressable>
    );
  return (
    <View style={[s.expanded, { width }]}>
      <View style={s.header}>
        <Pressable
          accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
          onPress={playPause}
        >
          <Ionicons
            name={status.playing ? 'pause-circle' : 'play-circle'}
            color={c.pink}
            size={32}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{names[index]}</Text>
          <Text style={s.under}>Mes pierres · extrait audio</Text>
        </View>
        <Pressable
          accessibilityLabel="Collapse player"
          onPress={() => {
            player.pause();
            onClose();
          }}
          style={{ padding: 6 }}
        >
          <Ionicons name="chevron-down" size={21} color="#777" />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Seek audio"
        onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
        onPress={e => seek(e.nativeEvent.locationX)}
        style={s.wave}
      >
        {BARS.map((h, i) => (
          <View
            key={i}
            style={{
              width: 4,
              flex: 1,
              maxWidth: 5,
              height: h,
              borderRadius: 2,
              backgroundColor: i / BARS.length <= fraction ? c.pink : '#d9d9d9',
            }}
          />
        ))}
      </Pressable>
      <View style={s.times}>
        <Text style={s.clock}>{durationLabel(status.currentTime)}</Text>
        <Text style={s.clock}>{durationLabel(duration)}</Text>
      </View>
    </View>
  );
}
export function StoneDeck() {
  const [active, setActive] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  return (
    <View style={{ alignItems: 'center', minHeight: active === null ? 54 : 146, marginTop: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ display: active !== null && active !== i ? 'none' : 'flex' }}>
            <Stone
              index={i}
              active={active === i}
              onActivate={() => setActive(i)}
              onClose={() => setActive(null)}
              width={Math.min(width - 50, 346)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  tile: {
    width: 54,
    height: 51,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expanded: {
    minHeight: 133,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfdfdf',
    paddingTop: 11,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  header: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: '#242424' },
  under: { fontSize: 10, color: '#888', marginTop: 2 },
  wave: { height: 37, flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 },
  clock: { fontSize: 10, color: '#999', fontVariant: ['tabular-nums'] },
});
