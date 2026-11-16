import type { Publication } from './publication';

export type SavedTalent = { name: string; level?: number; interests?: string[] };
export const profileTalentStorageKey = (email: string) =>
  'jenlow.profile.talents.' + (email || 'guest').toLowerCase();

/**
 * Exact skill-family matching, never a generic popularity recommendation.
 * Accents, feminine/masculine role labels and common instrument names normalize
 * to the same family. Open resources only: a filled role is not a request.
 */
const families: Record<string, string[]> = {
  guitare: ['guitare', 'guitariste', 'guitar', 'guitarrista'],
  batterie: ['batterie', 'batteur', 'batteuse', 'drums', 'drummer'],
  piano: ['piano', 'pianiste', 'keyboard', 'clavier', 'pianist'],
  chant: ['chant', 'chanteur', 'chanteuse', 'voix', 'vocal', 'singer', 'singing'],
  basse: ['basse', 'bassiste', 'bass', 'bassist'],
  photo: ['photo', 'photographe', 'photography', 'camera'],
  violon: ['violon', 'violoniste', 'violin'],
  saxophone: ['saxophone', 'saxo', 'saxophoniste'],
  trompette: ['trompette', 'trompettiste', 'trumpet'],
  danse: ['danse', 'danseur', 'danseuse', 'dance'],
  production: ['production', 'producteur', 'producer', 'beatmaker'],
};
const normalized = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function skillFamily(name: string): string {
  const x = normalized(name);
  for (const [family, words] of Object.entries(families)) {
    if (words.some(word => x.split(' ').includes(normalized(word)))) return family;
  }
  return x;
}
export function requestedSkillMatches(request: string, talents: SavedTalent[]): boolean {
  const wanted = skillFamily(request);
  return !!wanted && talents.some(t => {
    const offered = skillFamily(t.name);
    return !!offered && (wanted === offered || requestedAsPhrase(wanted, offered));
  });
}
function requestedAsPhrase(text: string, candidate: string) {
  return candidate.length >= 4 && text.split(' ').includes(candidate);
}
export function matchesForMe(item: Publication, talents: SavedTalent[]): boolean {
  if (!talents.length) return false;
  if (item.type === 'dream') {
    if (item.phase !== 'Initiation' && item.phase !== 'Croissance') return false;
    const requests = (item.resources || []).filter(r => r.category === 'person' && !r.confirmed);
    return requests.some(r => requestedSkillMatches(r.title, talents));
  }
  if (item.type === 'talent') {
    // The owner explicitly wants tandem/teacher/learner relationships, not a generic profile.
    return item.seeking.length > 0 && requestedSkillMatches(item.skill, talents);
  }
  if (item.type === 'music') {
    return (item.requestedTalents || []).some(request => requestedSkillMatches(request, talents));
  }
  return false;
}
