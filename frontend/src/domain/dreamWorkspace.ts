import type { DreamPhase, DreamPublication } from './publication';
export type DreamMedia = {
  name: string;
  uri: string;
  kind: 'photo' | 'video' | 'audio' | 'document';
};
export type FlowerDraft = { story: string; attachments: DreamMedia[]; reminderDate?: string };
export type DreamEntry = {
  id: string;
  title: string;
  phase: DreamPhase;
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
