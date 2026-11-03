import type { Locale } from '../http/context';

/**
 * Five self-reported proficiency levels, in order. The frontend's five-dot indicator maps
 * these labels to 1–5 dots (frontend/src/components/talent/TalentLevelDots.tsx). Levels are
 * never inferred or certified by the platform.
 */
export const LEVELS = [1, 2, 3, 4, 5] as const;
export type Level = (typeof LEVELS)[number];

const LEVEL_LABELS: Record<Locale, Record<Level, string>> = {
  fr: { 1: 'Découverte', 2: 'Débutant', 3: 'Intermédiaire', 4: 'Avancé', 5: 'Professionnel' },
  en: { 1: 'Discovery', 2: 'Beginner', 3: 'Intermediate', 4: 'Advanced', 5: 'Professional' },
  de: { 1: 'Entdecker', 2: 'Anfänger', 3: 'Mittelstufe', 4: 'Fortgeschritten', 5: 'Profi' },
  pt: { 1: 'Descoberta', 2: 'Iniciante', 3: 'Intermédio', 4: 'Avançado', 5: 'Profissional' },
};

export function levelLabel(level: number | null | undefined, locale: Locale): string | null {
  if (!level || level < 1 || level > 5) return null;
  return LEVEL_LABELS[locale]?.[level as Level] ?? LEVEL_LABELS.fr[level as Level];
}

/** Parses either a number 1..5 or a French label used by the existing UI ("Intermédiaire"). */
export function parseLevel(input: unknown): Level | null {
  if (typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 5) return input as Level;
  if (typeof input !== 'string') return null;
  const v = input.trim().toLocaleLowerCase('fr');
  if (v.includes('pro')) return 5;
  if (v.includes('avanc') || v.includes('confirm')) return 4;
  if (v.includes('interm')) return 3;
  if (v.includes('début') || v.includes('debut') || v.includes('notion')) return 2;
  if (v.includes('découv') || v.includes('decouv')) return 1;
  return null;
}

/** What the member is looking for, derived from the exchange flags (frontend `seeking`). */
export function seekingFrom(flags: { can_teach: number; wants_to_learn: number; wants_tandem: number }, locale: Locale): string[] {
  const t = {
    fr: { tandem: 'Tandem', teacher: 'Professeur', students: 'Élèves' },
    en: { tandem: 'Tandem', teacher: 'Teacher', students: 'Students' },
    de: { tandem: 'Tandem', teacher: 'Lehrer', students: 'Schüler' },
    pt: { tandem: 'Tandem', teacher: 'Professor', students: 'Alunos' },
  }[locale];
  const out: string[] = [];
  if (flags.wants_tandem) out.push(t.tandem);
  if (flags.wants_to_learn) out.push(t.teacher);
  if (flags.can_teach) out.push(t.students);
  return out;
}

/** Talent artwork that exists in frontend/assets (TalentArt). Unknown values are dropped. */
export const ILLUSTRATIONS = [
  'drums', 'cello', 'trumpet', 'acoustic-guitar', 'singing', 'bass', 'violin', 'saxophone', 'piano',
  'double-bass', 'ukulele', 'electric-guitar', 'guitar', 'cavaquinho', 'viola', 'camera',
] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];
export const asIllustration = (v: unknown): Illustration | null =>
  typeof v === 'string' && (ILLUSTRATIONS as readonly string[]).includes(v) ? (v as Illustration) : null;
