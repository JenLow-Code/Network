import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { musics } from '@/mocks/publications';
import { PublicationDetail, DetailPanel } from '@/components/publication/PublicationDetail';
import { MusicWaveform } from '@/components/music/MusicWaveform';
import { MusicLyrics, FullMusicLyrics } from '@/components/music/MusicLyrics';
import { EditorialInline } from '@/components/detail/EditorialInline';
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
      renderLayout={(_button, wave, time, seek, togglePlayback, isPlaying) => (
        <PublicationDetail item={item} onCoverPress={togglePlayback} musicPlaying={isPlaying}>
          <EditorialInline bottomSpace={12}>
            <View style={{ gap: 9 }}>
              <View>{wave}</View>
              <MusicLyrics lines={item.lyrics || []} currentTime={time} onSeek={seek} />
            </View>
          </EditorialInline>
          <DetailPanel title="Paroles complètes" foldable defaultOpen={false} hideTopBorder>
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
