import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const files = [
  require('../../../assets/audio/pierre-01-douceur.wav'),
  require('../../../assets/audio/pierre-02-esperance.wav'),
  require('../../../assets/audio/pierre-03-lumiere.wav'),
] as const;
export function MusicWaveform({
  index,
  renderLayout,
}: {
  index: 0 | 1 | 2;
  renderLayout?: (
    button: React.ReactNode,
    wave: React.ReactNode,
    time: number,
    seek: (seconds: number) => void,
    togglePlayback: () => void,
  ) => React.ReactNode;
}) {
  const trackWidth = useRef(0);
  const player = useAudioPlayer(files[index]);
  const status = useAudioPlayerStatus(player);
  const play = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) void player.seekTo(0);
    player.play();
  };
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const time = (n: number) =>
    Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0');
  const button = (
    <Pressable
      onPress={play}
      accessibilityLabel={status.playing ? 'Pause' : 'Écouter'}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#CB245C',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={19} color="#fff" />
    </Pressable>
  );
  const waveform = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      {!renderLayout ? button : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 10, color: '#777' }}>{time(status.currentTime)}</Text>
          <Text style={{ fontSize: 10, color: '#777' }}>{time(status.duration)}</Text>
        </View>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Position de lecture"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          onPress={event => {
            if (status.duration <= 0) return;
            const locationX = event.nativeEvent.locationX;
            const width = trackWidth.current;
            if (width > 0) void player.seekTo(status.duration * Math.min(1, Math.max(0, locationX / width)));
          }}
          onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
          style={{ height: 24, justifyContent: 'center' }}
        >
          <View style={{ height: 2, borderRadius: 2, backgroundColor: '#C6BFC0' }}>
            <View style={{ width: (progress * 100) + '%', height: 2, backgroundColor: '#CB245C', borderRadius: 2 }} />
            <View
              style={{
                position: 'absolute',
                left: (progress * 100) + '%',
                top: -3,
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: '#CB245C',
                marginLeft: -4,
              }}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
  return renderLayout ? (
    <>
      {renderLayout(button, waveform, status.currentTime, (seconds: number) => {
        void player.seekTo(seconds);
      }, play)}
    </>
  ) : (
    waveform
  );
}
