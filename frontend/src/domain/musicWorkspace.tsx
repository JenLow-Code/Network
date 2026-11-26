import React, { createContext, useContext } from 'react';
import type { MusicNextState } from './musicNext';
import type { MusicNotationEvent } from './musicNotation';

/** Music workspace contracts. Persistence must be provided by an authenticated API. */
export type MusicSection = {
  id: string;
  title: string;
  startSeconds?: number;
  endSeconds?: number;
  notes?: string;
  scoreUrl?: string;
  scoreLocalId?: string;
  scoreFileName?: string;
  instruments?: string[];
};
export type MusicLyric = {
  id: string;
  language: string;
  text: string;
  updatedAt: string;
  origin: 'written' | 'translated';
  sectionId?: string;
};
export type MusicLayer = {
  id: string;
  title: string;
  role: string;
  audioUrl?: string;
  audioMediaId?: string;
  localAudioId?: string;
  contributor: string;
  sectionId?: string;
  createdAt: string;
  /** Actual file length, not an invented timeline. */
  durationSeconds?: number;
};
export type MusicNeed = {
  id: string;
  kind: 'talent' | 'style';
  label: string;
  level?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  /** Optional local lyric document for a requested translation. */
  sourceFileId?: string;
  /** Empty for the whole song; otherwise the exact requested section. */
  sectionId?: string;
  /** Request brief editable before and after the local selection of audience. */
  description?: string;
  audience?: 'private'|'public'|'contacts'|'direct';
  targetHandle?: string;
  /** References to existing private Capture items, not copies. */
  referenceFileIds?: string[];
};
export type MusicSuggestion = {
  id: string;
  title: string;
  kind: 'track' | 'section' | 'lyrics' | 'style';
  sectionId?: string;
  note: string;
  audioUrl?: string;
  status: 'pending' | 'integrated' | 'archived';
  createdAt: string;
};
export type MusicMessage = { id: string; text: string; createdAt: string; author: string; sectionId?: string };
/** Several arrangements/mixes can coexist without replacing the original song. */
export type MusicVersion = {
  id: string;
  title: string;
  createdAt: string;
  localAudioId?: string;
  audioMediaId?: string;
  audioUrl?: string;
  selectedForPublication: boolean;
  publishedId?: string;
  durationSeconds?: number;
};

/** A document or creative resource, optionally mapped to one or more song sections. */
export type MusicAudioMarker = {
  id: string;
  /** Position relative to the original recording, in seconds. */
  startSeconds: number;
  /** When present and greater than startSeconds, annotates a time range. */
  endSeconds?: number;
  note: string;
  /** Optional pointer to an existing source in Capture; never copies its contents. */
  linkedFileId?: string;
  linkedSectionId?: string;
  /** Exact already-marked lyric excerpt when chosen, not just the parent file. */
  linkedLyricReferenceId?: string;
};
export type MusicLyricReference = {
  id: string;
  sectionId: string;
  /** Text offsets refer to the source lyrics. No generated lyrics or rewrite. */
  start: number;
  end: number;
  text: string;
};
/** Editorial comment pinned to an exact selected lyric range, private in Capture. */
export type MusicLyricComment = {
  id:string;start:number;end:number;text:string;
  comment:string;createdAt:string;
};
export type MusicLyricSegment = { id: string; text: string; sectionIds: string[] };
export type MusicFileRegion = { id: string; sectionId: string; startSeconds: number; endSeconds: number };
export type MusicProjectFile = {
  id: string;
  title: string;
  kind: 'lyrics' | 'audio' | 'track' | 'score' | 'note' | 'idea' | 'document';
  sectionIds: string[];
  /** Original full text; mapped excerpts live in sectionContent. */
  text?: string;
  sectionContent?: Record<string, string>;
  /** Independent editable lyric stanzas. Associating a stanza is optional. */
  lyricSegments?: MusicLyricSegment[];
  /** Optional ranges for audio tracks; segment <-> section mapping without cutting the source file. */
  regions?: MusicFileRegion[];
  markers?: MusicAudioMarker[];
  lyricReferences?: MusicLyricReference[];
  lyricComments?: MusicLyricComment[];
  originalFilename?: string;
  mimeType?: string;
  conversionWarning?: string;
  language?: string;
  /** Links a human translation to its source lyric document without replacing it. */
  translationOfFileId?: string;
  /** A generated WAV associated with, but never replacing, its MIDI source. */
  renderedFromMidiId?:string;
  /** Original musical idea, stored as structured notation, not rendered audio. */
  musicEvents?: MusicNotationEvent[];
  /** Original Audiveris MusicXML to allow faithful later editing/reexport. */
  musicXml?:string;
  /** Independent playable OMR voices/staves; distinct from drum/piano pads. */
  scoreParts?:{id:string;name:string;originalPart:string;
    staff:number;voice:string;clef:'treble'|'bass'|'alto';noteCount:number}[];
  scoreMeasureCount?:number;
  tempoBpm?: number;
  /** Explicit metre: no measure lines are inferred from the tempo. */
  timeSignatureNumerator?: number;
  timeSignatureDenominator?: number;
  /** What to do when an imported instrument sample ends before a held note. */
  instrumentSampleEndMode?: 'fade'|'repeat'|'slow';
  /** Local monitoring preset, independent from the exported MIDI notes. */
  instrumentTone?: string;
  /** Private audio sample attached to a musical sketch on this device. */
  instrumentSampleLocalId?: string;
  instrumentSampleName?: string;
  instrumentSampleRootMidi?: number;
  /** Exact fundamental in Hz, enabling microtuning correction of transposed samples. */
  instrumentSampleRootHz?: number;
  /** Drum pads use individual one-shot recordings (MIDI percussion key -> local audio).
   * These are sound assignments, not separate tracks; the original MIDI notes
   * retain their standard channel-10 values for portability. */
  drumSamples?: Record<string,{localFileId:string;name:string}>;
  scoreClef?: 'treble'|'bass';
  instrument?: string;
  localFileId?: string;
  externalUrl?: string;
  /** Isolated demo fixture audio key; never used for real user recordings. */
  demoAudioAsset?: string;
  durationSeconds?: number;
  createdAt: string;
  /** Human attribution for a Capture resource, never inferred from a public byline. */
  editedBy?: string;
  editedByHandle?:string;
  editedByAvatarUrl?:string;
  editedByDemo?:boolean;
  editedAt?: string;
};
export type MusicProject = {
  /** New Music UI state, retained alongside legacy versions and files. */
  musicNext?: MusicNextState;
  id: string;
  ownerEmail: string;
  ownerName: string;
  title: string;
  description: string;
  originalLanguage: string;
  bpm?: number;
  musicalKey?: string;
  musicalMode?: 'majeur' | 'mineur';
  timeSignature?: string;
  instruments: string[];
  musicStyles?: string[];
  versions: MusicVersion[];
  files: MusicProjectFile[];
  coverUrl?: string;
  coverLocalId?: string;
  coverMediaId?: string;
  masterUrl?: string;
  masterMediaId?: string;
  publishedId?: string;
  createdAt: string;
  updatedAt: string;
  sections: MusicSection[];
  lyrics: MusicLyric[];
  layers: MusicLayer[];
  needs: MusicNeed[];
  suggestions: MusicSuggestion[];
  messages: MusicMessage[];
  archivedRemoteProposals?: string[];
  /** Private invitation drafts; no invitation is delivered until server integration. */
  shareInvitations?: {
    id:string;targetHandle:string;role:'participant'|'co-owner';
    createdAt:string;status:'local-draft';
  }[];
};

export const newMusicId = () => 'music-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
export const musicStorageKey = (email: string) => 'jenlow.network.music.workspaces.v1.' + (email || 'guest').trim().toLowerCase();
export const LYRIC_TEMPLATE = 'Couplet 1\n\nRefrain\n\nCouplet 2\n\nRefrain\n\nPont\n\nRefrain';

export type NewMusicDraft = { title: string; description?: string; originalLanguage: string };
export function makeMusicProject(draft: NewMusicDraft, email: string, name: string): MusicProject {
  const now = new Date().toISOString();
  return {
    id: newMusicId(), title: draft.title.trim(), ownerEmail: email, ownerName: name,
    description: draft.description?.trim() || '', originalLanguage: draft.originalLanguage.trim() || 'Français',
    instruments: [], musicStyles: [], versions: [], files: [],
    createdAt: now, updatedAt: now,
    // An idea begins without an imposed structure or invented duration.
    sections: [],
    lyrics: [], layers: [], needs: [], suggestions: [], messages: [],
  };
}
type EditableProject = Partial<Omit<MusicProject, 'id' | 'ownerEmail' | 'ownerName' | 'createdAt'>>;
type MusicWorkspaceStore = {
  items: MusicProject[];
  ready: boolean;
  error: string | null;
  create: (draft: NewMusicDraft) => string | null;
  patch: (id: string, changes: EditableProject) => void;
  remove: (id: string) => void;
  say: (id: string, text: string) => void;
};

const MusicContext = createContext<MusicWorkspaceStore | null>(null);

// No private workspace API matching this contract is deployed yet. Do not
// read or write a device-only project as though it were a server record.
const unavailable = 'Les espaces de création ne sont pas encore disponibles sur le serveur.';
const rejectMutation = (): never => { throw new Error(unavailable); };
const store: MusicWorkspaceStore = {
  items: [], ready: true, error: unavailable,
  create: () => null, patch: rejectMutation, remove: rejectMutation, say: rejectMutation,
};
export function MusicWorkspaceProvider({ children }: { children: React.ReactNode }) {
  return <MusicContext.Provider value={store}>{children}</MusicContext.Provider>;
}
export function useMusicWorkspaces(): MusicWorkspaceStore {
  const context = useContext(MusicContext);
  if (!context) throw new Error('MusicWorkspaceProvider missing');
  return context;
}
