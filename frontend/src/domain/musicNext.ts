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
  /** Undoable version edits; stored as metadata snapshots, never overwriting source audio. */
  history?: {id:string; versionId:string; at:string; before:WorkingMusicVersion}[];
};
export function changeWorkingVersion(state:MusicNextState,updated:WorkingMusicVersion):MusicNextState {
  const previous=state.versions.find(v=>v.id===updated.id);
  if(!previous)return state;
  return {...state,versions:state.versions.map(v=>v.id===updated.id?{
    ...updated,updatedAt:new Date().toISOString(),
  }:v),history:[...(state.history||[]),{
    id:newMusicId(),versionId:previous.id,at:new Date().toISOString(),before:previous,
  }]};
}
export function undoWorkingVersion(state:MusicNextState,versionId:string):MusicNextState {
  const entries=state.history||[];
  const index=entries.findLastIndex(e=>e.versionId===versionId);
  if(index===-1)return state;
  const entry=entries[index];
  return {...state,versions:state.versions.map(v=>v.id===versionId?entry.before:v),
    history:entries.filter((_,i)=>i!==index)};
}
export function musicNextState(project:MusicProject):MusicNextState {
  return project.musicNext || {versions:[]};
}
export function makeWorkingVersion(file:MusicProjectFile, ordinal:number):WorkingMusicVersion {
  const now=new Date().toISOString();
  return {
    id:newMusicId(),title:'Version '+ordinal,createdAt:now,updatedAt:now,
    tracks:[makeWorkingTrack(file)],
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

/** MIDI can be part of a working version even before the playback renderer is available. */
export function isMusicTrackCandidate(file:MusicProjectFile) {
  return isPlayableMusicFile(file) ||
    (/\\.(mid|midi)$/i.test(file.originalFilename||'')&&!!file.localFileId);
}
