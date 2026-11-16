import type { Publication, DreamPhase } from './publication';

/** Stable permission identifiers; backend can enforce the same policy. */
export type ActionId =
  | 'share-internal'
  | 'share-external'
  | 'fire'
  | 'prayer'
  | 'inspire'
  | 'verse-export'
  | 'encourage'
  | 'same-dream'
  | 'offer-help'
  | 'introduce'
  ;
export const dreamPermissions: Record<DreamPhase, readonly ActionId[]> = {
  Rêve: ['encourage', 'fire', 'prayer'],
  Initiation: ['share-internal', 'prayer', 'offer-help', 'introduce'],
  Croissance: ['prayer', 'encourage'],
  Témoignage: ['share-internal', 'share-external', 'prayer', 'fire', 'inspire'],
};
export function allowedActions(item: Publication): readonly ActionId[] {
  switch (item.type) {
    case 'dream':
      return dreamPermissions[item.phase];
    case 'bible':
      return ['share-internal', 'fire', 'prayer', 'inspire', 'verse-export'];
    case 'talent':
      return ['encourage', 'prayer'];
  }
}
export function can(item: Publication, action: ActionId): boolean {
  return allowedActions(item).includes(action);
}
export const labels: Record<ActionId, string> = {
  'share-internal': 'Partager dans JenLow',
  'share-external': 'Partager à l’extérieur',
  fire: 'Ma liste Fire',
  prayer: 'Ma prière du jour',
  inspire: 'Inspirer mon rêve',
  'verse-export': 'Exporter ce verset',
  encourage: 'Je t’encourage',
  'same-dream': 'Moi aussi',
  'offer-help': 'Proposer mon aide',
  introduce: 'Présenter quelqu’un de mon cercle',
};
/** Permissions: "same Dream" never grants co-ownership or editing rights.
 * Encourage counts are creator-only; "me too" counts are public and server-derived.
 * A collaborator is distinct from a co-owner and must accept an invitation.
 */
export const DOWNLOADABLE_CONTENT_TYPES = ['bible'] as const;
