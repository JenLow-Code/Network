import React from 'react';
import { router } from 'expo-router';
import type { MusicProject } from '@/domain/musicWorkspace';
import { MusicTile } from './MusicTile';
import type { MusicCollaborator } from './MusicCollaboratorAvatars';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

export function MusicSongCard({ song, layout, width, participants = [], pendingCount = 0 }: {
  song: MusicProject;
  layout: MusicLibraryLayout;
  width?: number | string;
  /** Only confirmed collaborators. A local invitation draft is not a participant. */
  participants?: MusicCollaborator[];
  /** Received proposals still awaiting a decision, not confirmed participants. */
  pendingCount?: number;
}) {
  return <MusicTile title={song.title} width={typeof width === 'number' ? width : 195}
    mode="draft" layout={layout}
    byline="" participants={participants}
    status={pendingCount ? pendingCount + ' proposition' + (pendingCount > 1 ? 's' : '') + ' à examiner' : undefined}
    onPress={() => router.push({pathname: '/music-workspace/[id]',
      params:{id:song.id,...(pendingCount ? {tab:'collaborate'} : {})}})}/>;
}
