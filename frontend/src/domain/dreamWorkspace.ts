import type { DreamPhase, DreamPublication } from './publication';
export type DreamMedia = {
  name: string;
  uri: string;
  kind: 'photo' | 'video' | 'audio' | 'document';
};
export type FlowerDraft = { story: string; attachments: DreamMedia[]; reminderDate?: string };
export type DreamBlockKind =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'quote' | 'callout' | 'bullet' | 'numbered' | 'todo'
  | 'toggle' | 'accordion' | 'divider' | 'spacer'
  | 'image' | 'gallery' | 'audio' | 'music' | 'video'
  | 'document' | 'pdf' | 'bookmark' | 'link' | 'embed'
  | 'code' | 'equation' | 'table' | 'toc' | 'date'
  | 'columns' | 'collection' | 'bible-verse' | 'publication-ref' | 'poem' | 'note';
export type DreamBlock = {
  id: string;
  kind: DreamBlockKind;
  content: string;
  title?: string;
  size: 'small' | 'wide' | 'featured';
  /** Two-column masonry tile dimensions: 1×1 (default), 2×1, 1×2 or 2×2. */
  tileSize?: '1x1' | '2x1' | '1x2' | '2x2';
  /** Structured content for notes shared as inspirations, separate from private notebooks. */
  noteBlocks?: DreamNoteBlock[];
  /** Canvas width (one or two columns); absent on legacy blocks. */
  span?: 1 | 2;
  /** User-adjusted block height in layout points; absent on legacy blocks. */
  height?: number;
  tone: 'neutral' | 'pink' | 'sage' | 'sand' | 'lavender' | 'blue' | 'peach' | 'charcoal' | 'clear';
  font?: 'sans' | 'serif' | 'handwritten' | 'mono';
  align?: 'left' | 'center' | 'right';
  frame?: 'none' | 'soft' | 'outline';
  ink?: 'default' | 'pink' | 'green' | 'muted' | 'white';
  caption?: string;
  icon?: string;
  media?: string[];
  checked?: boolean;
  // Text and styling are stored locally in the dream; no external page is created.
};
/** Private, structured notebook. Formatting belongs to each text block. */
export type DreamNoteBlock = {
  id: string;
  type: 'text' | 'heading' | 'bullet' | 'numbered' | 'checklist' | 'toggle' | 'quote';
  text: string;
  title?: string;
  bold?: boolean;
  italic?: boolean;
  color?: 'default' | 'pink' | 'blue' | 'green' | 'sand';
  checked?: boolean;
  collapsed?: boolean;
  /** Checkbox appearance inside an inspiration note. */
  checkShape?: 'square' | 'circle';
};
/** A private notebook belonging to a dream. Blocks never overlap across books. */
/** Each notebook has a personal color; labels and progression lines share this color. */
export type DreamNotebookColor = 'sand' | 'pink' | 'blue' | 'green' | 'violet' | 'coral';
export type DreamNotebook = {
  id: string;
  title: string;
  color?: DreamNotebookColor;
  blocks: DreamNoteBlock[];
};
export type DreamResource = {
  id: string;
  /** ID of a real server-side need; undefined for local demo dreams. */
  serverNeedId?: string;
  title: string;
  category: 'person' | 'practical' | 'financial';
  confirmed: boolean;
  linkedBlockId?: string;
  personId?: string;
  amount?: number;
  illustration?: NonNullable<DreamPublication['resources']>[number]['illustration'];
  requiredLevel?: string;
  description?: string;
  /** Local intent to request listing in Tools; not a published listing until synced. */
  toolsPublicationRequested?: boolean;
};
/** Documents stay with one dream across its phases.
 * A repeated name adds a revision, never replaces a prior version. */
export type DreamDocumentVersion = {
  id: string;
  uri: string;
  addedAt: string;
  name: string;
  mimeType?: string;
  size?: number;
  source: 'file' | 'link';
};
export type DreamDocument = {
  id: string;
  name: string;
  versions: DreamDocumentVersion[];
};
export type DreamHabit = {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  /** Start of the habit's own schedule, as a calendar-local YYYY-MM-DD. */
  startedAt?: string;
  completed: string[];
  /** Optional measurable target per daily or weekly period. */
  description?: string;
  target?: number;
  unit?: string;
  /** Quantity by local date/week; check marks still remain supported for legacy habits. */
  measurements?: Record<string, number>;
  /** Actual local day when a weekly goal was reached, keyed by week start. */
  achievedOn?: Record<string,string>;
  /** Chosen emoji and one of the calm habit palette colors. */
  emoji?: string;
  color?: string;
};
/** Local audit events produced exclusively by actual Dream resource state changes. */
export type DreamGrowthEvent = {
  id: string;
  date: string;
  kind: 'need_added' | 'need_found' | 'need_lost';
  category: DreamResource['category'];
  title: string;
  needId: string;
};
export type DreamMilestone = {
  id: string;
  title: string;
  date: string;
  /** Exact creation moment for a strict 24-hour edit window. */
  createdAt?: string;
  /** New Growth logs are public by default, but local intent is not public delivery. */
  shareRequested?: boolean;
  serverEntryId?: string;
  publicationState?: 'pending' | 'published' | 'failed';
};
export type DreamThought = { id: string; text: string; date: string };
export type DreamChatMessage = { id: string; text: string; createdAt: string };
export type DreamEntry = {
  id: string;
  /** ID of a synchronized server dream; undefined for local workspaces. */
  serverDreamId?: string;
  /** Role of the current viewer, assigned only from a trusted account membership.
   * Local-only workspaces default to creator when this field is absent.
   * This is display metadata, NEVER an authorization check.
   */
  viewerRole?: 'creator' | 'co_owner' | 'participant';
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
  /** Private, local-first document library, separate from Semence inspiration blocks. */
  documents?: DreamDocument[];
  resources?: DreamResource[];
  /** Previously confirmed need IDs and categories. Used to spot loss during Croissance. */
  foundNeedHistory?: { id:string; title:string; category:DreamResource['category'] }[];

  financialNeeded?: boolean;
  habits?: DreamHabit[];
  milestones?: DreamMilestone[];
  /** Dated events from confirmed state transitions, never illustrative activity. */
  growthEvents?: DreamGrowthEvent[];
  /** Trusted total of prayers for this dream, only when provided by a connected source. */
  prayerCount?: number;
  /** Dated counts from real server events. Never derive a day's activity from totals. */
  socialDailyActivity?: {
    date: string;
    prayers?: number;
    encouragements?: number;
    prayerTotal?: number;
    encouragementTotal?: number;
  }[];
  thoughts?: DreamThought[];
  /** Owner-only freeform diary, stored in the private local Dream workspace. */
  privateDiary?: string;
  /** Owner-only notebook title and rich text blocks, retained across phases. */
  privateNotesTitle?: string;
  privateNotesBlocks?: DreamNoteBlock[];
  /** Private notebook collection. Legacy notes are used as the first notebook until first edit. */
  privateNotebooks?: DreamNotebook[];

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
  /** Inclusive local date through which Germination is frozen. */
  pauseUntil?: string;
  /** Lifetime freezes on this dream, never reset by resuming. */
  pauseCount?: number;
  resolvedNeeds?: string[];
  /** Personal fruit milestone after finishing Floraison. Public phase stays Témoignage/Floraison. */
  fruitAt?: string;
  /** The user entered the private Floraison editor; not yet public or completed. */
  flowerStartedAt?: string;
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
    motivation: d.motivation,
    goalDate: d.goalDate,
    resources: d.resources?.map((resource, index) => ({ ...resource, id: 'demo-' + d.id + '-' + index, category: resource.category || 'practical' })),
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
