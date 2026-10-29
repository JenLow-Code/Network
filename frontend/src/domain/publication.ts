/**
 * Publication domain types and dream-phase constants.
 *
 * A publication has exactly one content type: a Dream, a Music recording,
 * or a Bible image/reference.
 */
export type DreamPhase = 'Rêve' | 'Initiation' | 'Croissance' | 'Témoignage';

type PublicationBase = {
  id: string;
  title: string;
  author: string;
  /** Optional member-supplied avatar (no synthetic stock replacements). */
  avatar?: string;
  /** Public member church/community, if supplied and verified. */
  church?: string;
  /** Public city, provided by the member (demo entries below use sample cities). */
  location?: string;
  image: string;
  imageAlt: string;
};

export type DreamPublication = PublicationBase & {
  type: 'dream';
  phase: DreamPhase;
  summary: string;
  needs: string[];
  motivation?: string;
  goalDate?: string;
  logs?: string[];
};

export type MusicPublication = PublicationBase & {
  type: 'music';
  /** Optional artwork for the cassette sleeve; omit for a plain, typographic label. */
  coverArt?: string;
  audioIndex: 0 | 1 | 2;
  songAuthor: string;
  lyrics?: { time: number; text: string }[];
  description: string;
};

export type BiblePublication = PublicationBase & {
  type: 'bible';
  reference: string;
  referenceId: 'psalm-150';
  highlightedVerse: number;
};

export type PersonPublication = PublicationBase & {
  type: 'talent';
  talents: string[];
  description: string;
  experience?: string;
  skill: string;
  level: string;
  instrument: 'drums' | 'guitar' | 'camera';
  seeking: string[];
};
export type Publication =
  | DreamPublication
  | MusicPublication
  | BiblePublication
  | PersonPublication;

export const PHASE_LABELS: Record<DreamPhase, string> = {
  Rêve: 'Semence',
  Initiation: 'Germination',
  Croissance: 'Croissance',
  Témoignage: 'Floraison',
};
export const DREAM_PHASES: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];
export const PHASE_COLORS: Record<DreamPhase, { background: string; foreground: string }> = {
  Rêve: { background: '#EADDD1', foreground: '#654B3B' },
  Initiation: { background: '#F4F6D9', foreground: '#526333' },
  Croissance: { background: '#DDEFD7', foreground: '#275C3A' },
  Témoignage: { background: '#F2E0E9', foreground: '#963E67' },
};
/** Shared publication background: identical in Discovery tiles and detail gradients. */
export const NEUTRAL_PUBLICATION_COLOR = '#D0D0CE';
export const publicationColor = (publication: Publication): string =>
  publication.type === 'dream'
    ? PHASE_COLORS[publication.phase].background
    : NEUTRAL_PUBLICATION_COLOR;

export const PHASE_SYMBOLS: Record<DreamPhase, string> = {
  Rêve: '●',
  Initiation: '🌱',
  Croissance: '🌿',
  Témoignage: '🌸',
};
