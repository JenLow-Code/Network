import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dreams } from '@/mocks/publications';
import { DreamPhase } from './publication';
import { DreamEntry, DreamBlock, DreamResource, DreamHabit, DreamMilestone, FlowerDraft, fromDemo, canEditField, nextPhase } from './dreamWorkspace';
import { rememberFoundNeeds } from './dreamResourceRecovery';
import { growthResourceEvents } from './growthTimeline';
import { useApp } from '@/context/AppContext';
import { readDreamWorkspace, persistDreamWorkspace } from './dreamPersistence';
type Repo = {
  items: DreamEntry[];
  /** True only after this account's local workspace has finished loading. */
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
const initial = dreams.map(fromDemo).map(d =>
  d.phase === 'Croissance'
    ? { ...d, foundNeedHistory: rememberFoundNeeds([], d.resources ?? []) }
    : d
);
const KEY_BASE = 'jenlow.network.demo.dream.workspace.v1.';
export const dreamStorageKey = (email: string) => KEY_BASE + (email || 'guest').toLowerCase();
export function DreamProvider({ children }: { children: React.ReactNode }) {
  const { email } = useApp();
  const key = dreamStorageKey(email);
  const personalKey = key + '.personal-habits';
  const [items, setItems] = useState<DreamEntry[]>(initial);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [storageError,setStorageError]=useState<string|null>(null);
  const [personalHabits,setPersonalHabitsState] = useState<DreamHabit[]>([]);
  const [personalHydrated,setPersonalHydrated] = useState(false);
  useEffect(() => {
    let live = true;
    setHydratedKey(null);
    setStorageError(null);
    setItems(initial);
    readDreamWorkspace(key)
      .then(v => {
        if (live && v) {
          try {
            const p = JSON.parse(v);
            if (Array.isArray(p)) setItems(p.map((stored: DreamEntry) => {
              const seed = initial.find(item => item.id === stored.id);
              if (!seed) return stored.phase === 'Croissance' && !stored.foundNeedHistory
                ? { ...stored, foundNeedHistory: rememberFoundNeeds([], stored.resources ?? []) }
                : stored;
              // Fill missing demo metadata without overwriting the person's saved edits.
              return {
                ...stored,
                resources: stored.resources ?? seed.resources,
                foundNeedHistory: stored.foundNeedHistory ??
                  (stored.phase === 'Croissance' ?
                    rememberFoundNeeds([], stored.resources ?? seed.resources ?? []) : undefined),
                goalDate: stored.goalDate ?? seed.goalDate,
                motivation: stored.motivation ?? seed.motivation,
              };
            }));
          } catch {}
        }
      })
      .then(()=>{if(live)setHydratedKey(key);})
      .catch(()=>{if(live)setStorageError('Impossible de charger les rêves enregistrés sur cet appareil. Vérifie le stockage du navigateur.');});
    return () => {
      live = false;
    };
  }, [key]);
  useEffect(() => {
    if (hydratedKey !== key) return;
    void persistDreamWorkspace(key, JSON.stringify(items))
      .then(()=>setStorageError(null))
      .catch(()=>setStorageError('Enregistrement impossible : espace local indisponible. Les dernières modifications ne sont pas sauvegardées.'));
  }, [items, hydratedKey, key]);
  useEffect(() => {
    let live = true;
    setPersonalHydrated(false);
    setPersonalHabitsState([]);
    AsyncStorage.getItem(personalKey).then(value=>{
      if (!live || !value)return;
      try {
        const stored=JSON.parse(value);
        if(Array.isArray(stored))setPersonalHabitsState(
          stored.filter((h:unknown): h is DreamHabit =>
            !!h && typeof h==='object' && 'id' in h && 'title' in h));
      } catch {}
    }).finally(()=>{if(live)setPersonalHydrated(true);});
    return ()=>{live=false;};
  },[personalKey]);
  useEffect(()=>{
    if(personalHydrated)void AsyncStorage.setItem(personalKey,JSON.stringify(personalHabits)).catch(()=>{});
  },[personalKey,personalHabits,personalHydrated]);
  const setPersonalHabits:Repo['setPersonalHabits']=habits=>setPersonalHabitsState(habits);
  const detachHabit:Repo['detachHabit']=(dreamId,habitId)=>{
    const source=items.find(d=>d.id===dreamId&&d.phase==='Croissance'&&!d.flowerStartedAt);
    const habit=source?.habits?.find(h=>h.id===habitId);
    if(!habit)return;
    // Persist as a standalone personal habit before dropping its dream association.
    setPersonalHabitsState(previous=>[
      ...previous.filter(h=>h.id!==habit.id),habit,
    ]);
    setItems(previous=>previous.map(d=>d.id===dreamId?{
      ...d,habits:(d.habits||[]).filter(h=>h.id!==habitId),
    }:d));
  };
  const createPersisted:Repo['createPersisted']=async data=>{
    if(hydratedKey!==key)throw new Error(
      storageError || 'Les rêves de ce compte ne sont pas encore chargés.',
    );
    const id='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
    const entry:DreamEntry={
      ...data,id,phase:'Rêve',visibility:'private',blocks:[],resources:[],
      habits:[],milestones:[],thoughts:[],notes:[],additions:[],
      createdAt:new Date().toISOString(),ownerIds:['demo-user'],
    };
    // Confirm a durable write before navigating away from the creation form.
    await persistDreamWorkspace(key,JSON.stringify([entry,...items]));
    setStorageError(null);
    setItems(previous=>[entry,...previous]);
    return id;
  };
  const setCoverImage:Repo['setCoverImage']=async(dreamId,image)=>{
    if(hydratedKey!==key)throw new Error(
      'Les rêves de ce compte ne sont pas encore chargés.',
    );
    const existing=items.find(d=>d.id===dreamId);
    if(!existing)throw new Error('Ce rêve est introuvable.');
    if(existing.phase==='Témoignage')throw new Error(
      "L'image d'un rêve en Floraison est définitive.",
    );
    if(!image.startsWith('data:image/')&&!/^https:\/\//.test(image))
      throw new Error("Format d'image invalide.");
    const changed=items.map(d=>d.id===dreamId?{...d,image}:d);
    // The cover only changes on screen after the browser confirms persistence.
    await persistDreamWorkspace(key,JSON.stringify(changed));
    setStorageError(null);
    setItems(previous=>previous.map(d=>d.id===dreamId?{...d,image}:d));
  };
  const create: Repo['create'] = data => {
    const id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setItems(p => [
      {
        ...data,
        id,
        phase: 'Rêve',
        visibility: 'private',
        blocks: [], resources: [], habits: [], milestones: [], thoughts: [],
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
    setItems(p => p.map(d =>
      d.id === id && !!d.flowerStartedAt && !d.testimony
        ? { ...d, flowerDraft: draft } : d,
    ));
  const confirmFlower: Repo['confirmFlower'] = (id, achievedOn) =>
    setItems(p => p.map(d =>
      d.id === id && d.phase === 'Croissance' && !d.testimony
        ? {
            ...d,
            phase: 'Témoignage',
            // Croissance is frozen while the flower remains unpublished.
            visibility: 'private',
            flowerStartedAt: d.flowerStartedAt || new Date().toISOString(),
            flowerDraft: {
              ...(d.flowerDraft || { story: '', attachments: [] }),
              achievedOn,
            },
          } : d,
    ));
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
        d.id === id && d.phase === 'Témoignage' && !d.testimony && !!d.flowerDraft?.achievedOn && !!d.flowerDraft?.attachments?.some(a => a.kind === 'photo')
          ? {
              ...d,
              phase: 'Témoignage',
              visibility: 'public',
              fruitAt: d.flowerDraft!.achievedOn! + 'T12:00:00',
              resultImage: d.flowerDraft!.attachments.find(a => a.kind === 'photo')!.uri,
              testimony: {
                comment,
                mediaType,
                mediaUrl,
                mediaItems: d.flowerDraft?.attachments || [],
                highlights: (d.milestones || [])
                  .filter(log => d.flowerDraft?.highlightIds?.includes(log.id))
                  .map(log => ({ id: log.id, title: log.title, date: log.date })),
                date: d.flowerDraft!.achievedOn!,
                publishedAt: new Date().toISOString(),
              },
            }
          : d,
      ),
    );
  const patch: Repo['patch'] = (id, changes) => setItems(previous =>
    previous.map(d => {
      if(d.id !== id)return d;
      // Once the dream reaches Floraison, Croissance is an immutable archive.
      // Continue allowing edits to Floraison presentation and personal notebooks.
      const lockedGrowthFields = new Set<keyof DreamEntry>([
        'habits','milestones','resources','growthEvents','foundNeedHistory',
        'growthStartedAt','goalDate','paused','pauseUntil','pauseCount',
      ]);
      const allowed = d.phase==='Témoignage' || !!d.flowerStartedAt
        ?Object.fromEntries(Object.entries(changes).filter(
          ([key])=>!lockedGrowthFields.has(key as keyof DreamEntry),
        )) as Partial<DreamEntry>
        :changes;
      return { ...d, ...allowed, id:d.id, title:d.title, phase:d.phase };
    }));
  const appendBlock: Repo['appendBlock'] = (id, block) => setItems(p => p.map(d => d.id === id && d.phase === 'Rêve' ? { ...d, blocks: [...(d.blocks || []), block] } : d));
  const setResources: Repo['setResources'] = (id, resources) => setItems(p => p.map(d => {
    if(d.id !== id || (d.phase !== 'Initiation' && d.phase !== 'Croissance') || !!d.flowerStartedAt) return d;
    const changes = d.phase==='Croissance'
      ? growthResourceEvents(d.resources || [], resources) : [];
    const nextEvents = changes.map((change,i)=>({
      ...change,
      id: change.date+':'+change.needId+':'+change.kind+':'+((d.growthEvents||[]).length+i),
    }));
    return {
      ...d, resources,
      growthEvents: nextEvents.length?[...(d.growthEvents||[]),...nextEvents]:d.growthEvents,
      foundNeedHistory: d.phase === 'Croissance'
        ? rememberFoundNeeds(rememberFoundNeeds(d.foundNeedHistory, d.resources || []), resources)
        : d.foundNeedHistory,
    };
  }));
  const setHabits: Repo['setHabits'] = (id, habits) => setItems(p => p.map(d => d.id === id && d.phase === 'Croissance' && !d.flowerStartedAt ? { ...d, habits } : d));
  const addGrowthLog: Repo['addGrowthLog'] = (dreamId, log) => setItems(previous =>
    previous.map(d => d.id === dreamId && d.phase === 'Croissance' && !d.flowerStartedAt
      ? { ...d, milestones: [...(d.milestones || []), log] } : d));
  const setGrowthLogPublication: Repo['setGrowthLogPublication'] = (dreamId, logId, state, serverEntryId, shareRequestedOverride) =>
    setItems(previous => previous.map(d => d.id === dreamId ? {
      ...d, milestones: (d.milestones || []).map(log =>
        log.id === logId ? { ...log, publicationState: state,
          serverEntryId: serverEntryId ?? log.serverEntryId,
          shareRequested: shareRequestedOverride ?? log.shareRequested } : log),
    } : d));
  const transitionToGrowth: Repo['transitionToGrowth'] = id => setItems(p => p.map(d => {
    if (d.id !== id || d.phase !== 'Initiation') return d;
    const resources = d.resources || [];
    const dateValid = !!d.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(d.goalDate) && !Number.isNaN(Date.parse(d.goalDate));
    if (!dateValid || resources.some(r => !r.confirmed)) return d;
    return { ...d, phase: 'Croissance', visibility: 'public',
      foundNeedHistory: rememberFoundNeeds(d.foundNeedHistory, resources),
      growthStartedAt: new Date().toISOString(), chat: d.chat || { id: 'dream-' + d.id, messages: [] } };
  }));
  const setGoalAndGrow: Repo['setGoalAndGrow'] = (id, date) => setItems(previous =>
    previous.map(d => {
      if (d.id !== id || d.phase !== 'Initiation') return d;
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00') : null;
      const valid = parsed && !Number.isNaN(parsed.getTime()) &&
        parsed.getFullYear() + '-' + String(parsed.getMonth() + 1).padStart(2, '0') + '-' +
          String(parsed.getDate()).padStart(2, '0') === date;
      const now = new Date();
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
      const frozen = !!d.paused && !!d.pauseUntil && d.pauseUntil >= today;
      if (!valid || date < today || frozen) return d;
      return {
        ...d,
        goalDate: date,
        phase: 'Croissance' as const,
        visibility: 'public' as const,
        foundNeedHistory: rememberFoundNeeds(d.foundNeedHistory, d.resources || []),
        growthStartedAt: new Date().toISOString(),
        chat: d.chat || { id: 'dream-' + d.id, messages: [] },
      };
    }),
  );
  const remove: Repo['remove'] = id => setItems(p => p.filter(d => d.id !== id));
  return (
    <Context.Provider
      value={{ items, ready:hydratedKey===key, storageError, createPersisted, setCoverImage, personalHabits, setPersonalHabits, detachHabit, create, update, add, setFlowerDraft, confirmFlower, advance, complete, remove, patch, appendBlock, setResources, setHabits, transitionToGrowth, setGoalAndGrow, addGrowthLog, setGrowthLogPublication }}
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
