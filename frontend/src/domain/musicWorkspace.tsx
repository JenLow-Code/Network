import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { readMusicWorkspace, writeMusicWorkspace } from './musicLocalStorage';
import { useApp } from '@/context/AppContext';

/**
 * Local-first music workspaces. These are PRIVATE ON THIS DEVICE until an explicit
 * server publication succeeds. No local note, chat or proposal is a remote message.
 */
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
};
export type MusicNeed = {
  id: string;
  kind: 'talent' | 'style';
  label: string;
  level?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
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
};
export type MusicProject = {
  id: string;
  ownerEmail: string;
  ownerName: string;
  title: string;
  description: string;
  originalLanguage: string;
  bpm?: number;
  musicalKey?: string;
  timeSignature?: string;
  instruments: string[];
  versions: MusicVersion[];
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
};

export const newMusicId = () => 'music-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
export const musicStorageKey = (email: string) => 'jenlow.network.music.workspaces.v1.' + (email || 'guest').trim().toLowerCase();
export const LYRIC_TEMPLATE = 'Couplet 1\n\nRefrain\n\nCouplet 2\n\nRefrain\n\nPont\n\nRefrain';

export type NewMusicDraft = { title: string; originalLanguage: string };
export function makeMusicProject(draft: NewMusicDraft, email: string, name: string): MusicProject {
  const now = new Date().toISOString();
  return {
    id: newMusicId(), title: draft.title.trim(), ownerEmail: email, ownerName: name,
    description: '', originalLanguage: draft.originalLanguage.trim() || 'Français',
    instruments: [], versions: [], timeSignature: '4/4',
    createdAt: now, updatedAt: now,
    sections: [
      { id: newMusicId(), title: 'Intro' },
      { id: newMusicId(), title: 'Couplet 1' },
      { id: newMusicId(), title: 'Refrain' },
    ],
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

export function MusicWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { email, name } = useApp();
  const key = musicStorageKey(email);
  const [items, setItems] = useState<MusicProject[]>([]);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setReadyKey(null);
    setItems([]);
    setError(null);
    void readMusicWorkspace(key)
      .then(raw => {
        if (!live) return;
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((x: unknown): x is MusicProject =>
            !!x && typeof x === 'object' && typeof (x as MusicProject).id === 'string' &&
            typeof (x as MusicProject).title === 'string' &&
            (x as MusicProject).ownerEmail?.toLowerCase() === email.toLowerCase()
          ).map(project => ({
            ...project, originalLanguage: project.originalLanguage || 'Français',
            instruments: project.instruments || [],
            versions: project.versions?.length ? project.versions : project.masterMediaId || project.masterUrl
              ? [{ id:'legacy-'+project.id,title:'Version originale',createdAt:project.createdAt,
                audioMediaId:project.masterMediaId,audioUrl:project.masterUrl,
                selectedForPublication:false,publishedId:project.publishedId }] : [],
            sections: project.sections || [], lyrics: project.lyrics || [],
            layers: project.layers || [], needs: project.needs || [],
            suggestions: project.suggestions || [], messages: project.messages || [],
          })));
        }
      })
      .catch(() => { if (live) setError('Impossible de charger les morceaux enregistrés sur cet appareil.'); })
      .finally(() => { if (live) setReadyKey(key); });
    return () => { live = false; };
  }, [key, email]);

  useEffect(() => {
    if (readyKey !== key) return;
    void writeMusicWorkspace(key, JSON.stringify(items))
      .then(() => setError(null))
      .catch(() => setError('Les modifications de tes morceaux ne peuvent pas être enregistrées sur cet appareil.'));
  }, [key, readyKey, items]);

  const store = useMemo<MusicWorkspaceStore>(() => ({
    items, ready: readyKey === key, error,
    create: draft => {
      if (readyKey !== key || !draft.title.trim()) return null;
      const project = makeMusicProject(draft, email, name);
      setItems(old => [project, ...old]);
      return project.id;
    },
    patch: (id, changes) => {
      if (readyKey !== key) return;
      setItems(old => old.map(x => x.id === id && x.ownerEmail.toLowerCase() === email.toLowerCase()
        ? { ...x, ...changes, id: x.id, ownerEmail: x.ownerEmail, ownerName: x.ownerName,
          createdAt: x.createdAt, updatedAt: new Date().toISOString() } : x));
    },
    remove: id => {
      if (readyKey !== key) return;
      setItems(old => old.filter(x => x.id !== id || x.ownerEmail.toLowerCase() !== email.toLowerCase()));
    },
    say: (id, text) => {
      if (readyKey !== key || !text.trim()) return;
      setItems(old => old.map(x => x.id === id && x.ownerEmail.toLowerCase() === email.toLowerCase()
        ? { ...x, updatedAt: new Date().toISOString(), messages: [
          ...x.messages, { id: newMusicId(), text: text.trim(), author: name, createdAt: new Date().toISOString() }
        ] } : x));
    },
  }), [items, readyKey, key, error, email, name]);
  return <MusicContext.Provider value={store}>{children}</MusicContext.Provider>;
}
export function useMusicWorkspaces(): MusicWorkspaceStore {
  const context = useContext(MusicContext);
  if (!context) throw new Error('MusicWorkspaceProvider missing');
  return context;
}
