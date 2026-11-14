import type {
  DreamEntry, DreamGrowthEvent, FlowerPersonalMoment,
  FlowerPublishedMoment,
} from './dreamWorkspace';
import { buildGrowthDays } from './growthTimeline';

/** A factual entry generated from recorded activity, never editable as a fact. */
export type FlowerSourceMoment = FlowerPublishedMoment & {
  kind: 'logbook' | 'resource' | 'document';
  source: 'recorded';
};
export type FlowerEditableMoment = FlowerPublishedMoment & {
  kind: 'personal';
  source: 'personal';
};

const cleanDay = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T12:00:00');
  return !Number.isNaN(parsed.getTime()) &&
    [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0')].join('-') === date;
};
export { cleanDay as validFlowerDay };

const personRole = (title: string): string => {
  const role = title.trim().toLowerCase();
  if (/^batterie$/.test(role)) return 'à la batterie';
  if (/^piano$/.test(role)) return 'au piano';
  if (/^chant$/.test(role)) return 'au chant';
  if (/^guitare$/.test(role)) return 'à la guitare';
  if (/^basse$/.test(role)) return 'à la basse';
  if (/^clavier(s)?$/.test(role)) return 'aux claviers';
  return 'en tant que ' + (role || 'collaborateur');
};

const foundResourceLabel = (dream: DreamEntry, event: DreamGrowthEvent): string => {
  const title = event.title.trim() || 'Ressource';
  if (event.category !== 'person') {
    if (title.toLowerCase() === 'batterie') return 'Batterie trouvée';
    if (title.toLowerCase() === 'piano') return 'Piano trouvé';
    return 'Ressource trouvée : ' + title;
  }
  // Real verified names are not available on most resource records.
  // Never interpret an instrument or role as a person's actual name.
  const need = (dream.resources || []).find(r =>
    r.id === event.needId && r.category === 'person' && r.confirmed && !!r.serverNeedId);
  const coOwner = need?.personId
    ? (dream.coOwners || []).find(person =>
        person.accepted && person.userId === need.personId && person.name.trim())
    : undefined;
  const who = coOwner?.name.trim() || 'Une personne';
  return who + ' nous a rejoints ' + personRole(title);
};

export const factualFlowerTitle = (
  dream: DreamEntry, event: DreamGrowthEvent,
): string => {
  if (event.kind === 'need_found') return foundResourceLabel(dream, event);
  if (event.kind === 'need_lost') return 'Ressource devenue indisponible : ' + event.title;
  return 'Nouveau besoin identifié : ' + event.title;
};

/** Structured timeline, dated from original logs and resource transitions. */
export function flowerSourceMoments(dream: DreamEntry): FlowerSourceMoment[] {
  const result = buildGrowthDays(dream).flatMap(day => [
    ...day.notes.map(note => ({
      id: note.id, date: day.date, title: note.title,
      kind: 'logbook' as const, source: 'recorded' as const,
    })),
    ...day.changes.map(event => ({
      id: 'resource:' + event.id, date: day.date,
      title: factualFlowerTitle(dream, event),
      kind: 'resource' as const, source: 'recorded' as const,
    })),
    ...day.documents.map(doc => ({
      id: 'document:' + doc.id, date: day.date,
      title: 'Document ajouté : ' + doc.title,
      kind: 'document' as const, source: 'recorded' as const,
    })),
  ]);
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/** Creator-only memories are authored independently, not mixed into the log. */
export function flowerPersonalMoments(
  personal: FlowerPersonalMoment[] = [],
): FlowerEditableMoment[] {
  return personal.filter(entry => cleanDay(entry.date) && !!entry.title.trim())
    .map(entry => ({
      id: entry.id, date: entry.date, title: entry.title.trim(),
      note: entry.note?.trim() || undefined, kind: 'personal', source: 'personal',
    }));
}

/** Public material is a deliberate snapshot, never a live feed of private notes.
 * Previously hidden moments are excluded even if they were selected earlier.
 */
export function flowerPublicationSnapshot(dream: DreamEntry): FlowerPublishedMoment[] {
  const draft = dream.flowerDraft;
  if (!draft) return [];
  const selected = new Set(draft.highlightIds || []);
  const entries = [
    ...flowerSourceMoments(dream),
    ...flowerPersonalMoments(draft.personalMoments),
  ];
  return entries.filter(moment =>
    selected.has(moment.id) && !draft.momentPresentation?.[moment.id]?.hidden)
    .map(moment => ({
      id: moment.id,
      date: moment.date,
      title: moment.title,
      kind: moment.kind,
      note: moment.source === 'personal'
        ? moment.note || draft.momentPresentation?.[moment.id]?.note?.trim() || undefined
        : draft.momentPresentation?.[moment.id]?.note?.trim() || undefined,
    }));
}
