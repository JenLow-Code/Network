import type { MusicProject, MusicProjectFile, MusicAudioMarker } from './musicWorkspace';
import { newMusicId } from './musicWorkspace';

/** A new music generation deliberately lives alongside the legacy workspace metadata.
 * Old recordings and published versions are never deleted by a UI migration. */
export type WorkingMusicTrack = {
  id: string;
  sourceFileId: string;
  title: string;
  /** User-chosen visual track marker; never inferred from audio. */
  emoji?: string;
  instrument?: string;
  muted: boolean;
  solo: boolean;
  /** Nondestructive position and trim data; actual DSP is a later engine milestone. */
  offsetSeconds: number;
  trimStartSeconds?: number;
  trimEndSeconds?: number;
  /** Optional annotations for this particular arranged track, independent of the source file. */
  markers?: MusicAudioMarker[];
};
/** Manually timed lyrics; no automatic voice recognition is implied. */
export type TimedLyricCue = {
  id:string;
  sourceFileId?:string;
  text:string;
  startSeconds:number;
  endSeconds:number;
};
export type WorkingMusicVersion = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  bpm?: number;
  metronomeMuted?: boolean;
  snapToBeat?: boolean;
  lyricCues?: TimedLyricCue[];
  /** The song's musical structure, positioned on this version's timeline.
   * Key: project section ID, value: start in seconds (not an audio trim). */
  sectionMarkers?: Record<string,number>;
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
    (file.kind==='score'&&!!file.musicEvents?.length) ||
    (/\.(mid|midi)$/i.test(file.originalFilename||'')&&!!file.localFileId);
}

/** Effective length for audio as well as editable MIDI notation sources. */
export function musicSourceDuration(file?:MusicProjectFile):number{
  if(!file)return 0;
  if(file.durationSeconds&&file.durationSeconds>0)return file.durationSeconds;
  if(file.musicEvents?.length){
    const beats=Math.max(...file.musicEvents.map(e=>e.startBeats+e.lengthBeats));
    return Math.max(.1,beats*60/(file.tempoBpm||100));
  }
  return 0;
}
