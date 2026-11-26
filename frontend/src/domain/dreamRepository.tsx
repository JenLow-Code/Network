import React, { createContext, useContext } from 'react';
import type { DreamEntry, DreamBlock, DreamResource, DreamHabit, DreamMilestone, FlowerDraft } from './dreamWorkspace';

type Repo = {
  items: DreamEntry[];
  /** True when the availability state is known. */
  ready: boolean;
  storageError: string | null;
  /** Durable, confirmed creation for screens that immediately navigate away. */
  createPersisted: (data: { title: string; summary: string; image: string; needs: string[] }) => Promise<string>;
  /** Saves a new cover only if the account workspace confirms the write. */
  setCoverImage: (dreamId: string, image: string) => Promise<void>;
  personalHabits: DreamHabit[];
  setPersonalHabits: (habits: DreamHabit[]) => void;
  detachHabit: (dreamId: string, habitId: string) => void;
  create: (data: { title: string; summary: string; image: string; needs: string[] }) => string;
  update: (
    id: string,
    field: 'summary' | 'image' | 'needs' | 'motivation' | 'goalDate' | 'resolvedNeeds' | 'paused',
    value: string | string[] | boolean,
  ) => void;
  add: (id: string, text: string, kind: 'notes' | 'additions') => void;
  setFlowerDraft: (id: string, draft: FlowerDraft) => void;
  /** Add only server-verified accepted names to the current unpublished draft. */
  setFlowerVerifiedTalentNames: (id: string, names: Record<string, string>) => void;
  /** Irreversible transition; achievement can precede the public testimony. */
  confirmFlower: (id: string, achievedOn: string) => void;
  advance: (id: string) => void;
  complete: (
    id: string,
    comment: string,
    mediaType: 'audio' | 'photo' | 'video' | 'text',
    mediaUrl?: string,
  ) => void;
  patch: (id: string, changes: Partial<DreamEntry>) => void;
  appendBlock: (id: string, block: DreamBlock) => void;
  setResources: (id: string, resources: DreamResource[]) => void;
  setHabits: (id: string, habits: DreamHabit[]) => void;
  addGrowthLog: (dreamId: string, log: DreamMilestone) => void;
  setGrowthLogPublication: (dreamId: string, logId: string, state: NonNullable<DreamMilestone['publicationState']>, serverEntryId?: string, shareRequestedOverride?: boolean) => void;
  transitionToGrowth: (id: string) => void;
  /** Explicit calendar confirmation records the date and starts Growth atomically. */
  setGoalAndGrow: (id: string, date: string) => void;
  remove: (id: string) => void;
};
const Context = createContext<Repo | null>(null);
// Existing browser data is preserved but never loaded into the production UI.
const unavailable = 'Le serveur des aspirations n’est pas encore disponible.';
const rejectMutation = (): never => { throw new Error(unavailable); };
const rejectAsync = async (): Promise<never> => rejectMutation();
const store: Repo = {
  items: [], ready: true, storageError: unavailable, personalHabits: [],
  createPersisted: rejectAsync, setCoverImage: rejectAsync,
  setPersonalHabits: rejectMutation, detachHabit: rejectMutation,
  create: rejectMutation, update: rejectMutation, add: rejectMutation,
  setFlowerDraft: rejectMutation, setFlowerVerifiedTalentNames: rejectMutation,
  confirmFlower: rejectMutation, advance: rejectMutation, complete: rejectMutation,
  patch: rejectMutation, appendBlock: rejectMutation, setResources: rejectMutation,
  setHabits: rejectMutation, addGrowthLog: rejectMutation,
  setGrowthLogPublication: rejectMutation, transitionToGrowth: rejectMutation,
  setGoalAndGrow: rejectMutation, remove: rejectMutation,
};
export const dreamStorageKey = (email: string) => 'jenlow.network.demo.dream.workspace.v1.' + (email || 'guest').toLowerCase();
export function DreamProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useDreams() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('DreamProvider is required');
  return ctx;
}
