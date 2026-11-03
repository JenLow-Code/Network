import type { Locale } from '../http/context';

/**
 * Single source of truth for Dream phase names.
 *
 * Stored (legacy, unchanged in D1):  dream → initiation → growth → testimony
 * API machine codes:                  semence → germination → croissance → floraison
 * Frontend internal names:            Rêve → Initiation → Croissance → Témoignage (labels Semence…Floraison)
 *
 * "Fruit" is not a phase: it is the count of Dreams a Floraison inspired (dream_lineage).
 */
export type DbPhase = 'dream' | 'initiation' | 'growth' | 'testimony';
export type Phase = 'semence' | 'germination' | 'croissance' | 'floraison';

export const PHASES: readonly Phase[] = ['semence', 'germination', 'croissance', 'floraison'];
export const DB_PHASES: readonly DbPhase[] = ['dream', 'initiation', 'growth', 'testimony'];

const TO_API: Record<DbPhase, Phase> = { dream: 'semence', initiation: 'germination', growth: 'croissance', testimony: 'floraison' };
const TO_DB: Record<Phase, DbPhase> = { semence: 'dream', germination: 'initiation', croissance: 'growth', floraison: 'testimony' };

const LABELS: Record<Locale, Record<Phase, string>> = {
  fr: { semence: 'Semence', germination: 'Germination', croissance: 'Croissance', floraison: 'Floraison' },
  en: { semence: 'Seed', germination: 'Germination', croissance: 'Growth', floraison: 'Bloom' },
  de: { semence: 'Saat', germination: 'Keimung', croissance: 'Wachstum', floraison: 'Blüte' },
  pt: { semence: 'Semente', germination: 'Germinação', croissance: 'Crescimento', floraison: 'Floração' },
};

export function toApiPhase(db: string): Phase {
  const phase = TO_API[db as DbPhase];
  if (!phase) throw new Error('unknown stored phase: ' + db);
  return phase;
}

export function toDbPhase(phase: Phase): DbPhase {
  return TO_DB[phase];
}

/** Accepts API codes, legacy stored codes and French labels (case-insensitive). */
export function parsePhase(input: unknown): Phase | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().toLowerCase();
  if ((PHASES as readonly string[]).includes(v)) return v as Phase;
  if ((DB_PHASES as readonly string[]).includes(v)) return TO_API[v as DbPhase];
  const legacyLabels: Record<string, Phase> = { 'rêve': 'semence', reve: 'semence', 'témoignage': 'floraison', temoignage: 'floraison' };
  return legacyLabels[v] ?? null;
}

export function phaseLabel(phase: Phase, locale: Locale): string {
  return LABELS[locale]?.[phase] ?? LABELS.fr[phase];
}

export function nextPhase(phase: Phase): Phase | null {
  const i = PHASES.indexOf(phase);
  return i >= 0 && i < PHASES.length - 1 ? PHASES[i + 1] : null;
}

/** Fields an accepted owner may edit per phase. Mirrors frontend canEditField(); DB triggers back it up. */
export const EDITABLE_FIELDS: Record<Phase, readonly string[]> = {
  semence: ['summary', 'cover', 'motivation', 'goalDate', 'paused', 'category', 'visibility'],
  germination: ['cover', 'motivation', 'goalDate', 'paused', 'category', 'visibility'],
  croissance: ['cover', 'motivation', 'goalDate', 'paused', 'category', 'visibility'],
  floraison: [],
};

export const ENTRY_TYPES_BY_PHASE: Record<Phase, readonly ('note' | 'addition' | 'progress')[]> = {
  semence: ['note', 'addition'],
  germination: ['note', 'addition'],
  croissance: ['note', 'progress'],
  floraison: [],
};
