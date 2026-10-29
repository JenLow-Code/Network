import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { musics } from '@/mocks/publications';
import { PublicationDetail, DetailPanel } from '@/components/publication/PublicationDetail';
import { MusicWaveform } from '@/components/music/MusicWaveform';
import { MusicLyrics, FullMusicLyrics } from '@/components/music/MusicLyrics';
export default function MusicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = musics.find(x => x.id === id);
  if (!item)
    return (
      <View style={{ padding: 24 }}>
        <Text>Music not found</Text>
      </View>
    );
  return (
    <MusicWaveform
      index={item.audioIndex}
      renderLayout={(button, wave, time, seek) => (
        <PublicationDetail item={item}>
          <View style={{ paddingTop: 0, paddingBottom: 12, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {button}
              <View style={{ flex: 1 }}>{wave}</View>
            </View>
            <MusicLyrics lines={item.lyrics || []} currentTime={time} onSeek={seek} />
          </View>
          <DetailPanel title="Paroles complètes" foldable defaultOpen={false}>
            <FullMusicLyrics lines={item.lyrics || []} />
          </DetailPanel>
          <DetailPanel title="Partitions" foldable defaultOpen={false}>
            <Text style={{ fontSize: 13, color: '#666' }}>Aucune partition jointe.</Text>
          </DetailPanel>
          <DetailPanel title="Description" foldable defaultOpen={false}>
            <Text style={{ fontSize: 14, lineHeight: 22, color: '#444' }}>{item.description}</Text>
          </DetailPanel>
        </PublicationDetail>
      )}
    />
  );
}
