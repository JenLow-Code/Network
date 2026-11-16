/**
 * Response contracts shared by Discovery, profiles, Fire and details. Every feed item is a
 * discriminated union on `type`; the frontend maps these in one adapter
 * (frontend/src/lib/api/adapters.ts) onto its existing card components.
 */
import type { ActionId } from '../domain/actions';
import type { Phase } from '../domain/phases';
import type { MediaDTO } from '../modules/media';

export type AuthorSummary = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  /** Only when the member chose to show it. Never required. */
  church: string | null;
  isDemo: boolean;
};

export type ViewerState = {
  isOwner: boolean;
  /** Actions this viewer may perform now (empty for anonymous readers). */
  actions: ActionId[];
  fire: boolean;
  prayer: boolean;
};

type Base = {
  id: string;
  author: AuthorSummary;
  createdAt: string | null;
  updatedAt: string | null;
  visibility: 'private' | 'members' | 'public';
  /** True for the owner's own non-public items (shown with a lock, never to others). */
  locked: boolean;
  isDemo: boolean;
};

export type NeedSummary = {
  id: string;
  label: string;
  category: 'person' | 'practical' | 'financial' | 'logistics';
  talent: { id: string; name: string } | null;
  /** Required proficiency for the need (5-dot scale), not Dream progress. */
  requiredLevel: number | null;
  requiredLevelLabel: string | null;
  isRequired: boolean;
  slotsTotal: number;
  slotsFilled: number;
  confirmed: boolean;
  illustration: string | null;
  description: string | null;
  amount: { cents: number; currency: string } | null;
  /** Owners only. */
  pendingOffers?: number;
};

export type DreamCard = Base & {
  type: 'dream';
  dreamId: string;
  phase: Phase;
  phaseLabel: string;
  title: string;
  summary: string;
  category: string | null;
  cover: MediaDTO | null;
  gallery: MediaDTO[];
  motivation: string | null;
  goalDate: string | null;
  paused: boolean;
  startedAt: string | null;
  growingAt: string | null;
  completedAt: string | null;
  needs: NeedSummary[];
  needsProgress: { requiredFilled: number; requiredTotal: number; slotsFilled: number; slotsTotal: number };
  journalPreview: { text: string; date: string | null } | null;
  result: { text: string; media: MediaDTO | null; completedAt: string | null } | null;
  counts: { sameDream: number; inspiredDreams: number; encouragements?: number };
  viewer: ViewerState & { sameDream: boolean; encouraged: boolean };
};

export type BibleCard = Base & {
  type: 'bible';
  title: string;
  reference: {
    label: string;
    edition: { code: string; name: string; attribution: string | null };
    book: { code: string; name: string };
    chapter: number;
    startVerse: number;
    endVerse: number;
  };
  excerpt: string;
  caption: string | null;
  image: MediaDTO | null;
  viewer: ViewerState;
};

export type MusicCard = Base & {
  type: 'music';
  trackId: string;
  title: string;
  description: string | null;
  songAuthor: string | null;
  cover: MediaDTO | null;
  durationMs: number | null;
  playback: { available: boolean; url: string | null; appAsset: string | null; mimeType: string | null };
  credits: { order: number; displayName: string; contribution: string; handle: string | null }[];
  rights: { licenseType: string; attribution: string; adaptationsAllowed: boolean; reviewStatus: string; originalCreator: string; rightsHolder: string; sourceUrl: string | null };
  originalTrackId: string | null;
  downloadable: false;
  viewer: ViewerState;
};

export type TalentCard = Base & {
  type: 'talent';
  talent: { id: string; name: string; slug: string | null; category: string };
  level: number;
  levelLabel: string | null;
  illustration: string | null;
  description: string | null;
  experience: string | null;
  seeking: string[];
  availableForProjects: boolean;
  canTeach: boolean;
  wantsToLearn: boolean;
  wantsTandem: boolean;
  samples: MediaDTO[];
  counts: { encouragements?: number };
  viewer: ViewerState & { encouraged: boolean };
};

export type FeedItem = DreamCard | BibleCard | MusicCard | TalentCard;

export type Page<T> = { items: T[]; nextCursor: string | null };
