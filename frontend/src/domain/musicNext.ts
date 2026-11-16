import type { MusicProject, MusicProjectFile } from './musicWorkspace';
import { newMusicId } from './musicWorkspace';

/** A new music generation deliberately lives alongside the legacy workspace metadata.
 * Old recordings and published versions are never deleted by a UI migration. */
export type WorkingMusicTrack = {
  id: string;
  sourceFileId: string;
  title: string;
  instrument?: string;
  muted: boolean;
  solo: boolean;
  /** Nondestructive position and trim data; actual DSP is a later engine milestone. */
  offsetSeconds: number;
  trimStartSeconds?: number;
  trimEndSeconds?: number;
};
export type WorkingMusicVersion = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  bpm?: number;
  key?: string;
  meter?: string;
  tracks: WorkingMusicTrack[];
};
export type MusicNextState = {
  versions: WorkingMusicVersion[];
  activeVersionId?: string;
};
export function musicNextState(project:MusicProject):MusicNextState {
  return project.musicNext || {versions:[]};
}
export function makeWorkingVersion(file:MusicProjectFile, ordinal:number):WorkingMusicVersion {
  const now=new Date().toISOString();
  return {
    id:newMusicId(),title:'Version '+ordinal,createdAt:now,updatedAt:now,
    meter:'4/4',tracks:[makeWorkingTrack(file)],
  };
}
export function makeWorkingTrack(file:MusicProjectFile):WorkingMusicTrack {
  return {id:newMusicId(),sourceFileId:file.id,title:file.title,
    instrument:file.instrument,muted:false,solo:false,offsetSeconds:0};
}
export function isPlayableMusicFile(file:MusicProjectFile) {
  return !!file.localFileId &&
    (!!file.mimeType?.startsWith('audio/') ||
      /\.(mp3|m4a|wav|webm|ogg|aac)$/i.test(file.originalFilename||''));
}
export function studioVersionSourceIds(project:MusicProject):Set<string> {
  return new Set(musicNextState(project).versions.flatMap(v=>v.tracks.map(t=>t.sourceFileId)));
}
