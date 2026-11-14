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

/** Talent names are derived from the requested role, never from equipment. */
const personRole = (title: string): string => {
  const role = title.trim().toLocaleLowerCase('fr-FR');
  if (/^(batterie|batteur|batteriste|drums)$/.test(role)) return 'batteur';
  if (/^batteuse$/.test(role)) return 'batteuse';
  if (/^(piano|pianiste)$/.test(role)) return 'pianiste';
  if (/^(chant|chanteur|voix)$/.test(role)) return 'chanteur';
  if (/^chanteuse$/.test(role)) return 'chanteuse';
  if (/^(guitare|guitariste)$/.test(role)) return 'guitariste';
  if (/^(basse|bassiste)$/.test(role)) return 'bassiste';
  if (/^(clavier|claviers|claviériste)$/.test(role)) return 'claviériste';
  return role || 'musicien';
};

const foundResourceLabel = (dream: DreamEntry, event: DreamGrowthEvent): string => {
  const title = event.title.trim() || 'Ressource';
  if (event.category !== 'person') {
    if (title.toLowerCase() === 'batterie') return 'Nous avons trouvé une batterie';
    if (title.toLowerCase() === 'piano') return 'Nous avons trouvé un piano';
    if (title.toLowerCase() === 'chant') return 'Une solution trouvée pour le chant';
    return 'Une ressource trouvée : ' + title;
  }
  // A joining person has a different story from acquiring an instrument.
  // The name comes from the actual accepted invitation, snapshotted when
  // the person joins. Never replace a historical name with a guessed one.
  const archivedName = event.personName?.trim();
  const matchingNeed = (dream.resources || []).find(r =>
    r.id === event.needId && r.category === 'person' &&
    r.confirmed && !!r.serverNeedId);
  const acceptedName = matchingNeed?.acceptedPersonName?.trim();
  const coOwner = matchingNeed?.personId
    ? (dream.coOwners || []).find(p => p.accepted &&
        p.userId === matchingNeed.personId && p.name.trim())
    : undefined;
  const name = archivedName || acceptedName || coOwner?.name.trim() ||
    '[Nom de la personne]';
  return name + ' nous a rejoint en tant que ' + personRole(title);
};

export const factualFlowerTitle = (
  dream: DreamEntry, event: DreamGrowthEvent,
): string => {
  if (event.kind === 'need_found') return foundResourceLabel(dream, event);
  if (event.kind === 'need_lost') {
    const item = event.title.toLowerCase();
    if (item === 'batterie') return 'La batterie n’était plus disponible';
    if (item === 'piano') return 'Le piano n’était plus disponible';
    return 'Une ressource nous a manqué : ' + event.title;
  }
  return 'Un nouveau besoin est apparu : ' + event.title;
};

/** Structured timeline, dated from original logs and resource transitions. */
export function flowerSourceMoments(
  dream: DreamEntry,
  verifiedTalentNames: Record<string, string> = {},
): FlowerSourceMoment[] {
  const verifiedNameFor = (event: DreamGrowthEvent): string | undefined => {
    if (event.personName?.trim()) return event.personName.trim();
    if (event.category !== 'person') return undefined;
    const need = (dream.resources || []).find(resource =>
      resource.id === event.needId && resource.serverNeedId);
    return need?.serverNeedId ?
      verifiedTalentNames[need.serverNeedId]?.trim() || undefined : undefined;
  };
  const result = buildGrowthDays(dream).flatMap(day => [
    ...day.notes.map(note => ({
      id: note.id, date: day.date, title: note.title,
      kind: 'logbook' as const, source: 'recorded' as const,
    })),
    ...day.changes.map(event => ({
      id: 'resource:' + event.id, date: day.date,
      title: factualFlowerTitle(dream, {
        ...event, personName: verifiedNameFor(event),
      }),
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
      note: entry.note?.trim() || undefined,
      emoji: entry.emoji, kind: 'personal', source: 'personal',
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
    ...flowerSourceMoments(dream, draft.verifiedTalentNames),
    ...flowerPersonalMoments(draft.personalMoments),
  ];
  return entries.filter(moment =>
    selected.has(moment.id) && !draft.momentPresentation?.[moment.id]?.hidden)
    .map(moment => ({
      id: moment.id,
      date: moment.date,
      title: moment.title,
      kind: moment.kind,
      emoji: draft.momentPresentation?.[moment.id]?.emoji || moment.emoji,
      note: moment.source === 'personal'
        ? moment.note || draft.momentPresentation?.[moment.id]?.note?.trim() || undefined
        : draft.momentPresentation?.[moment.id]?.note?.trim() || undefined,
    }));
}
