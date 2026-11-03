/**
 * The single mapping point between the JenLow API contract (middleware/src/contracts/dto.ts)
 * and the existing UI types (src/domain/publication.ts). Components keep their current props;
 * only this file knows both shapes.
 */
import type {
  BiblePublication,
  DreamPhase,
  DreamPublication,
  MusicPublication,
  PersonPublication,
  Publication,
} from '@/domain/publication';

type Media = { url: string | null } | null;
type Author = { id: string; handle: string; displayName: string; avatarUrl: string | null; church: string | null; isDemo: boolean };
type Need = { label: string; category: string; requiredLevelLabel: string | null; confirmed: boolean; illustration: string | null; description: string | null; isRequired: boolean };

export type ApiFeedItem = {
  id: string;
  type: 'dream' | 'bible' | 'music' | 'talent';
  author: Author;
  createdAt: string | null;
  visibility: string;
  locked: boolean;
  // dream
  dreamId?: string;
  phase?: 'semence' | 'germination' | 'croissance' | 'floraison';
  title?: string;
  summary?: string;
  category?: string | null;
  cover?: Media;
  gallery?: { url: string | null }[];
  motivation?: string | null;
  goalDate?: string | null;
  needs?: Need[];
  journalPreview?: { text: string; date: string | null } | null;
  result?: { text: string; media: Media } | null;
  counts?: { sameDream: number; inspiredDreams: number; encouragements?: number };
  // bible
  reference?: { label: string; book: { code: string }; chapter: number; startVerse: number; endVerse: number };
  excerpt?: string;
  caption?: string | null;
  image?: Media;
  // music
  description?: string | null;
  songAuthor?: string | null;
  playback?: { url: string | null; appAsset: string | null };
  lyrics?: { time: number; text: string }[];
  // talent
  talent?: { name: string };
  levelLabel?: string | null;
  illustration?: string | null;
  experience?: string | null;
  seeking?: string[];
  samples?: { url: string | null }[];
  viewer?: { actions: string[]; fire: boolean; prayer: boolean; isOwner: boolean };
};

const PHASE: Record<NonNullable<ApiFeedItem['phase']>, DreamPhase> = {
  semence: 'Rêve',
  germination: 'Initiation',
  croissance: 'Croissance',
  floraison: 'Témoignage',
};
/** Demo audio bundled in the app (assets/audio). */
const APP_AUDIO: Record<string, 0 | 1 | 2> = { 'pierre-01-douceur': 0, 'pierre-02-esperance': 1, 'pierre-03-lumiere': 2 };
const ILLUSTRATIONS = new Set(['drums', 'cello', 'trumpet', 'acoustic-guitar', 'singing', 'bass', 'violin', 'saxophone', 'piano', 'double-bass', 'ukulele', 'electric-guitar', 'guitar', 'cavaquinho', 'viola', 'camera']);

const base = (item: ApiFeedItem) => ({
  id: item.id,
  author: item.author.displayName,
  authorHandle: item.author.handle,
  avatar: item.author.avatarUrl ?? undefined,
  church: item.author.church ?? undefined,
  source: 'api' as const,
});
const url = (m: Media | undefined) => m?.url ?? '';

export function toPublication(item: ApiFeedItem): Publication | null {
  switch (item.type) {
    case 'dream': {
      if (!item.phase) return null;
      const needs = item.needs ?? [];
      const dream: DreamPublication = {
        ...base(item),
        type: 'dream',
        dreamId: item.dreamId,
        title: item.title ?? '',
        phase: PHASE[item.phase],
        summary: item.summary ?? '',
        category: item.category ?? undefined,
        image: url(item.cover) || url(item.result?.media),
        imageAlt: item.title ?? '',
        needs: needs.filter(n => !n.confirmed).map(n => n.label),
        motivation: item.motivation ?? undefined,
        goalDate: item.goalDate ?? undefined,
        galleryImages: (item.gallery ?? []).map(g => g.url).filter((u): u is string => !!u),
        resources: needs.map(n => ({
          title: n.label,
          confirmed: n.confirmed,
          category: n.category === 'financial' ? 'financial' : n.category === 'person' ? 'person' : 'practical',
          illustration: n.illustration && ILLUSTRATIONS.has(n.illustration) ? (n.illustration as never) : undefined,
          requiredLevel: n.requiredLevelLabel ?? undefined,
          description: n.description ?? undefined,
        })),
        resolvedNeeds: needs.filter(n => n.confirmed).map(n => n.label),
        journalEntry: item.journalPreview ? { text: item.journalPreview.text, date: item.journalPreview.date ?? undefined } : undefined,
        createdAt: item.createdAt?.slice(0, 10),
        resultImage: item.result ? url(item.result.media) || undefined : undefined,
      };
      return dream;
    }
    case 'bible': {
      const ref = item.reference;
      if (!ref) return null;
      const bible: BiblePublication = {
        ...base(item),
        type: 'bible',
        title: item.title ?? ref.label,
        reference: ref.label,
        // The in-app reader currently renders Psalm 150 (the only chapter in the seeded edition).
        referenceId: 'psalm-150',
        highlightedVerse: ref.startVerse,
        image: url(item.image),
        imageAlt: ref.label,
      };
      return bible;
    }
    case 'music': {
      const appAsset = item.playback?.appAsset ?? null;
      const music: MusicPublication = {
        ...base(item),
        type: 'music',
        title: item.title ?? '',
        coverArt: url(item.cover) || undefined,
        audioIndex: appAsset && APP_AUDIO[appAsset] !== undefined ? APP_AUDIO[appAsset] : 0,
        audioUrl: appAsset ? undefined : item.playback?.url ?? undefined,
        songAuthor: item.songAuthor || 'Auteur non renseigné',
        lyrics: item.lyrics,
        description: item.description ?? '',
        image: url(item.cover),
        imageAlt: item.title ?? '',
      };
      return music;
    }
    case 'talent': {
      const name = item.talent?.name ?? '';
      const art = item.illustration && ILLUSTRATIONS.has(item.illustration) ? item.illustration : 'guitar';
      const person: PersonPublication = {
        ...base(item),
        type: 'talent',
        title: name,
        talents: [name],
        skill: name,
        level: item.levelLabel ?? '',
        instrument: art as PersonPublication['instrument'],
        seeking: item.seeking ?? [],
        description: item.description ?? '',
        experience: item.experience ?? undefined,
        image: url(item.samples?.[0]) || '',
        imageAlt: name,
      };
      return person;
    }
    default:
      return null;
  }
}

export function toPublications(items: ApiFeedItem[]): Publication[] {
  return items.map(toPublication).filter((p): p is Publication => !!p);
}

export type ApiProfile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  church: string | null;
  bio: string;
  city: string | null;
  isSelf: boolean;
  isDemo: boolean;
  featured: ApiFeedItem | null;
  talents: {
    talentId: string;
    showcaseId: string | null;
    name: string;
    level: number;
    levelLabel: string | null;
    illustration: string | null;
    description: string | null;
    experience: string | null;
    seeking: string[];
  }[];
};

/** Profile talent tiles reuse the talent card shape the profile screens already render. */
export function profileTalentToPublication(profile: ApiProfile, t: ApiProfile['talents'][number]): PersonPublication {
  const art = t.illustration && ILLUSTRATIONS.has(t.illustration) ? t.illustration : 'guitar';
  return {
    id: t.showcaseId ?? `${profile.handle}-${t.talentId}`,
    type: 'talent',
    title: t.name,
    author: profile.displayName,
    authorHandle: profile.handle,
    source: 'api',
    talents: [t.name],
    skill: t.name,
    level: t.levelLabel ?? '',
    instrument: art as PersonPublication['instrument'],
    seeking: t.seeking,
    description: t.description ?? '',
    experience: t.experience ?? undefined,
    image: '',
    imageAlt: t.name,
  };
}
