import React from 'react';
import { DetailInfoSection } from '@/components/detail/DetailMoreDrawer';
import { FullMusicLyrics } from '@/components/music/MusicLyrics';
import type { MusicPublication } from '@/domain/publication';

/**
 * Exactly the same "En savoir plus" information whether the listener opens
 * Discovery's side drawer or expands a cassette inline under "Pour moi".
 * Rendering context controls placement; this content never opens a drawer.
 */
export function MusicMoreDetails({item}:{item:MusicPublication}){
  return <>
    <DetailInfoSection title="À propos du morceau" text={item.description}/>
    {!!item.requestedTalents?.length&&
      <DetailInfoSection title="Talents recherchés"
        text={item.requestedTalents.join(' · ')}/>}
    <DetailInfoSection title="Paroles complètes"
      text={item.lyrics?.length?undefined:
        'Paroles non disponibles pour cet enregistrement.'}>
      {!!item.lyrics?.length&&<FullMusicLyrics lines={item.lyrics}/>}
    </DetailInfoSection>
    <DetailInfoSection title="Partitions" text="Aucune partition jointe."/>
  </>;
}
