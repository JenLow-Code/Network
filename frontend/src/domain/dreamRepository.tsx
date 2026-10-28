import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dreams } from '@/mocks/publications';
import { DreamPhase } from './publication';
import { DreamEntry, FlowerDraft, fromDemo, canEditField, nextPhase } from './dreamWorkspace';
import { useApp } from '@/context/AppContext';
type Repo = {
  items: DreamEntry[];
  create: (data: { title: string; summary: string; image: string; needs: string[] }) => string;
  update: (
    id: string,
    field: 'summary' | 'image' | 'needs' | 'motivation' | 'goalDate' | 'resolvedNeeds' | 'paused',
    value: string | string[] | boolean,
  ) => void;
  add: (id: string, text: string, kind: 'notes' | 'additions') => void;
  setFlowerDraft: (id: string, draft: FlowerDraft) => void;
  advance: (id: string) => void;
  complete: (
    id: string,
    comment: string,
    mediaType: 'audio' | 'photo' | 'video' | 'text',
    mediaUrl?: string,
  ) => void;
  remove: (id: string) => void;
};
const Context = createContext<Repo | null>(null);
const initial = dreams.map(fromDemo);
const KEY_BASE = 'jenlow.network.demo.dream.workspace.v1.';
export const dreamStorageKey = (email: string) => KEY_BASE + (email || 'guest').toLowerCase();
export function DreamProvider({ children }: { children: React.ReactNode }) {
  const { email } = useApp();
  const key = dreamStorageKey(email);
  const [items, setItems] = useState<DreamEntry[]>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let live = true;
    setHydrated(false);
    setItems(initial);
    AsyncStorage.getItem(key)
      .then(v => {
        if (live && v) {
          try {
            const p = JSON.parse(v);
            if (Array.isArray(p)) setItems(p);
          } catch {}
        }
      })
      .finally(() => {
        if (live) setHydrated(true);
      });
    return () => {
      live = false;
    };
  }, [key]);
  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated, key]);
  const create: Repo['create'] = data => {
    const id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setItems(p => [
      {
        ...data,
        id,
        phase: 'Rêve',
        notes: [],
        additions: [],
        createdAt: new Date().toISOString(),
        ownerIds: ['demo-user'],
      },
      ...p,
    ]);
    return id;
  };
  const update: Repo['update'] = (id, field, value) =>
    setItems(p =>
      p.map(d => (d.id === id && canEditField(d.phase, field) ? { ...d, [field]: value } : d)),
    );
  const add: Repo['add'] = (id, text, kind) =>
    setItems(p =>
      p.map(d =>
        d.id === id && canEditField(d.phase, kind) ? { ...d, [kind]: [...d[kind], text] } : d,
      ),
    );
  const setFlowerDraft: Repo['setFlowerDraft'] = (id, draft) =>
    setItems(p =>
      p.map(d => (d.id === id && d.phase === 'Croissance' ? { ...d, flowerDraft: draft } : d)),
    );
  const advance: Repo['advance'] = id =>
    setItems(p =>
      p.map(d => {
        const next = nextPhase(d.phase);
        return d.id === id && next && next !== 'Témoignage' ? { ...d, phase: next } : d;
      }),
    );
  const complete: Repo['complete'] = (id, comment, mediaType, mediaUrl) =>
    setItems(p =>
      p.map(d =>
        d.id === id && d.phase === 'Croissance'
          ? {
              ...d,
              phase: 'Témoignage',
              testimony: {
                comment,
                mediaType,
                mediaUrl,
                mediaItems: d.flowerDraft?.attachments || [],
                date: new Date().toISOString(),
              },
            }
          : d,
      ),
    );
  const remove: Repo['remove'] = id => setItems(p => p.filter(d => d.id !== id));
  return (
    <Context.Provider
      value={{ items, create, update, add, setFlowerDraft, advance, complete, remove }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDreams() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('DreamProvider is required');
  return ctx;
}
