import type { DreamPhase, DreamPublication } from './publication';
export type DreamMedia = {
  name: string;
  uri: string;
  kind: 'photo' | 'video' | 'audio' | 'document';
};
export type FlowerDraft = { story: string; attachments: DreamMedia[]; reminderDate?: string };
export type DreamBlock = {
  id: string;
  kind: 'text' | 'quote' | 'callout' | 'image' | 'audio' | 'video' | 'document' | 'link' | 'accordion' | 'collection';
  content: string;
  title?: string;
  size: 'small' | 'wide' | 'featured';
  tone: 'neutral' | 'pink' | 'sage' | 'sand' | 'lavender';
};
export type DreamResource = {
  id: string;
  title: string;
  category: 'person' | 'practical' | 'financial';
  confirmed: boolean;
  linkedBlockId?: string;
  personId?: string;
  amount?: number;
};
export type DreamHabit = {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  completed: string[];
};
export type DreamMilestone = { id: string; title: string; date: string };
export type DreamThought = { id: string; text: string; date: string };
export type DreamChatMessage = { id: string; text: string; createdAt: string };
export type DreamEntry = {
  id: string;
  title: string;
  phase: DreamPhase;
  /** Accepted co-owner names only; never display raw account IDs as names. */
  coOwners?: { userId: string; name: string; accepted: boolean }[];
  /** Populated by a trusted aggregate once social reactions are connected. */
  encouragementCount?: number;
  /** Canonical finished-cover image: same asset the Discovery card should reference. */
  resultImage?: string;
  visibility?: 'private' | 'public';
  blocks?: DreamBlock[];
  resources?: DreamResource[];
  financialNeeded?: boolean;
  habits?: DreamHabit[];
  milestones?: DreamMilestone[];
  thoughts?: DreamThought[];
  growthStartedAt?: string;
  chat?: { id: string; messages: DreamChatMessage[] };
  summary: string;
  image: string;
  needs: string[];
  notes: string[];
  additions: string[];
  motivation?: string;
  goalDate?: string;
  paused?: boolean;
  resolvedNeeds?: string[];
  flowerDraft?: FlowerDraft;
  testimony?: {
    comment: string;
    mediaType: 'audio' | 'photo' | 'video' | 'text';
    mediaUrl?: string;
    mediaItems?: DreamMedia[];
    date: string;
  };
  createdAt: string;
  ownerIds: string[];
};
export const phaseOrder: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];
export function fromDemo(d: DreamPublication): DreamEntry {
  return {
    id: d.id,
    title: d.title,
    phase: d.phase,
    summary: d.summary,
    image: d.image,
    needs: d.needs,
    notes: [],
    additions: [],
    createdAt: new Date().toISOString(),
    ownerIds: ['demo-user'],
  };
}
export function canEditField(
  phase: DreamPhase,
  field:
    | 'title'
    | 'summary'
    | 'image'
    | 'needs'
    | 'notes'
    | 'additions'
    | 'testimony'
    | 'motivation'
    | 'goalDate'
    | 'resolvedNeeds'
    | 'paused',
): boolean {
  if (field === 'title') return false;
  if (
    field === 'image' ||
    field === 'motivation' ||
    field === 'goalDate' ||
    field === 'resolvedNeeds' ||
    field === 'paused'
  )
    return phase !== 'Témoignage';
  if (phase === 'Rêve') return true;
  if (phase === 'Initiation')
    return field === 'additions' || field === 'notes' || field === 'needs';
  if (phase === 'Croissance') return field === 'notes';
  return false;
}
export function canClose(phase: DreamPhase): boolean {
  return phase === 'Croissance';
}
export function nextPhase(phase: DreamPhase): DreamPhase | undefined {
  return phaseOrder[phaseOrder.indexOf(phase) + 1];
}
