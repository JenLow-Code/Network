import React from 'react';
import { router } from 'expo-router';
import type { MusicProject } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
import { MusicTile } from './MusicTile';
import type { MusicCollaborator } from './MusicCollaboratorAvatars';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

export function MusicSongCard({ song, layout, width, participants = [] }: {
  song: MusicProject;
  layout: MusicLibraryLayout;
  width?: number | string;
  /** Only confirmed collaborators. A local invitation draft is not a participant. */
  participants?: MusicCollaborator[];
}) {
  const versions = Math.max(musicNextState(song).versions.length, song.versions?.length || 0);
  const details = [
    song.files.length ? `${song.files.length} ${song.files.length === 1 ? 'fichier' : 'fichiers'}` : '',
    versions ? `${versions} ${versions === 1 ? 'version' : 'versions'}` : '',
  ].filter(Boolean).join(' · ') || 'Premières idées';

  return <MusicTile title={song.title} width={typeof width === 'number' ? width : 195}
    mode="draft" layout={layout}
    byline={participants.length ? 'Projet partagé' : 'Mon morceau'}
    detail={details} participants={participants}
    status={participants.length ? 'En collaboration' : undefined}
    onPress={() => router.push({pathname: '/music-workspace/[id]',
      params:{id:song.id}})}/>;
}
