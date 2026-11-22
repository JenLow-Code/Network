import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { musics } from '@/mocks/publications';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
import { DetailMoreDrawer, DetailInfoSection } from '@/components/detail/DetailMoreDrawer';
import { MusicWaveform } from '@/components/music/MusicWaveform';
import { MusicLyrics, FullMusicLyrics } from '@/components/music/MusicLyrics';
import { EditorialInline } from '@/components/detail/EditorialInline';
import { usePublication } from '@/lib/api/hooks';
import { fetchDemoMusicPublication } from '@/lib/api/musicPreview';
import { useAppTheme } from '@/theme/AppTheme';
import type { MusicPublication } from '@/domain/publication';

/**
 * Same editorial song detail as Discovery, but launched inside Musique.
 * Real songs use the live publication API; D1-backed fictional previews use
 * the read-only demo endpoint. No demo is allowed to send a real proposal.
 */
export default function MusicDetail() {
  const { id, openMore } = useLocalSearchParams<{ id:string; from?:string; openMore?:string }>();
  const theme = useAppTheme();
  const demoId = !!id && /^demo-music-publication-\d{2}$/.test(id);
  const local = musics.find(x => x.id === id);
  const remote = usePublication(local || demoId ? undefined : id);
  const [demoItem, setDemoItem] = useState<MusicPublication | null>(null);
  const [demoState, setDemoState] = useState<'idle'|'loading'|'ready'|'error'>('idle');

  useEffect(() => {
    if (!demoId || !id) return;
    let alive = true;
    setDemoState('loading');
    setDemoItem(null);
    void fetchDemoMusicPublication(id).then(item => {
      if (!alive) return;
      setDemoItem(item);
      setDemoState(item ? 'ready' : 'error');
    }).catch(() => {
      if (alive) { setDemoItem(null); setDemoState('error'); }
    });
    return () => { alive = false; };
  }, [demoId,id]);

  const item: MusicPublication | undefined = local ??
    (demoId ? demoItem ?? undefined :
      remote.item?.type === 'music' ? remote.item : undefined);
  const loading = demoId ? (demoState === 'idle' || demoState === 'loading') :
    !local && remote.state === 'loading';

  if (!item && loading) return <View style={{flex:1,backgroundColor:theme.background,
    justifyContent:'center',alignItems:'center'}}>
    <ActivityIndicator color="#CB245C"/>
  </View>;
  if (!item) return <View style={{flex:1,backgroundColor:theme.background,
    padding:24,gap:16,justifyContent:'center'}}>
    <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
      Ce morceau n’est pas accessible.
    </Text>
    <Text style={{fontSize:13,color:theme.muted,lineHeight:20}}>
      Impossible de retrouver les détails de ce morceau dans les données disponibles.
    </Text>
    <Pressable onPress={() => router.replace('/music-hub')}
      accessibilityRole="button" accessibilityLabel="Retour à Musique"
      style={{paddingVertical:12}}>
      <Text style={{color:'#CB245C',fontWeight:'700'}}>Retour à Musique</Text>
    </Pressable>
  </View>;

  return <MusicWaveform index={item.audioIndex} uri={item.audioUrl}
    renderLayout={(_button, wave, time, seek, togglePlayback, isPlaying) => (
      <PublicationDetail item={item} onCoverPress={togglePlayback}
        musicPlaying={isPlaying} previewOnly={demoId}>
        <EditorialInline bottomSpace={12}>
          <View style={{gap:9}}>
            <View>{wave}</View>
            <MusicLyrics lines={item.lyrics || []} currentTime={time} onSeek={seek}/>
          </View>
        </EditorialInline>
        <DetailMoreDrawer key={item.id} heading={item.title} subtitle={'Musique · ' + item.author}
          defaultOpen={openMore === '1'}>
          <DetailInfoSection title="À propos du morceau" text={item.description}/>
          {!!item.requestedTalents?.length && <DetailInfoSection
            title="Talents recherchés" text={item.requestedTalents.join(' · ')}/>}
          <DetailInfoSection title="Paroles complètes"
            text={item.lyrics?.length ? undefined : 'Paroles non disponibles pour cet enregistrement.'}/>
          {!!item.lyrics?.length && <FullMusicLyrics lines={item.lyrics}/>}
          <DetailInfoSection title="Partitions" text="Aucune partition jointe."/>
        </DetailMoreDrawer>
      </PublicationDetail>
    )}
  />;
}
