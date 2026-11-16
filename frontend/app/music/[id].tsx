import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { musics } from '@/mocks/publications';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
import { DetailMoreDrawer, DetailInfoSection } from '@/components/detail/DetailMoreDrawer';
import { MusicWaveform } from '@/components/music/MusicWaveform';
import { MusicLyrics, FullMusicLyrics } from '@/components/music/MusicLyrics';
import { EditorialInline } from '@/components/detail/EditorialInline';
import { usePublication } from '@/lib/api/hooks';
import type { MusicPublication } from '@/domain/publication';
export default function MusicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const local = musics.find(x => x.id === id);
  const remote = usePublication(local ? undefined : id);
  const item = local ?? (remote.item?.type === 'music' ? (remote.item as MusicPublication) : undefined);
  if (!item && remote.state === 'loading')
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (!item)
    return (
      <View style={{ padding: 24 }}>
        <Text>Music not found</Text>
      </View>
    );
  return (
    <MusicWaveform
      index={item.audioIndex}
      uri={item.audioUrl}
      renderLayout={(_button, wave, time, seek, togglePlayback, isPlaying) => (
        <PublicationDetail item={item} onCoverPress={togglePlayback} musicPlaying={isPlaying}>
          <EditorialInline bottomSpace={12}>
            <View style={{ gap: 9 }}>
              <View>{wave}</View>
              <MusicLyrics lines={item.lyrics || []} currentTime={time} onSeek={seek} />
            </View>
          </EditorialInline>
          <DetailMoreDrawer heading={item.title} subtitle={'Musique · ' + item.author}>
            <DetailInfoSection title="À propos du morceau" text={item.description} />
            <DetailInfoSection title="Paroles complètes" text={item.lyrics?.length ? undefined : 'Paroles non disponibles pour cet enregistrement.'} />
            {!!item.lyrics?.length && <FullMusicLyrics lines={item.lyrics} />}
            <DetailInfoSection title="Partitions" text="Aucune partition jointe." />
          </DetailMoreDrawer>
        </PublicationDetail>
      )}
    />
  );
}
