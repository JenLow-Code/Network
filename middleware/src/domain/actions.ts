import type { Phase } from './phases';

/**
 * Server-side copy of the V1 action policy (frontend/src/domain/publicationRules.ts and
 * frontend/docs/V1-RULES.md). Mutation endpoints check it; read models expose it so the UI
 * never has to guess. Fire, prayer, share, encourage, "Moi aussi", help and inspire are
 * distinct actions — there is no generic "like".
 */
export type ActionId =
  | 'share-internal' | 'share-external' | 'fire' | 'prayer' | 'inspire' | 'verse-export'
  | 'encourage' | 'same-dream' | 'offer-help' | 'introduce' | 'audio-collab';

export type ContentKind = 'dream' | 'bible' | 'music' | 'talent';

export const DREAM_ACTIONS: Record<Phase, readonly ActionId[]> = {
  // "Moi aussi" is offered in the Semence detail (not on the Discovery card).
  semence: ['encourage', 'fire', 'prayer', 'same-dream'],
  germination: ['share-internal', 'prayer', 'offer-help', 'introduce'],
  croissance: ['prayer', 'encourage'],
  floraison: ['share-internal', 'share-external', 'prayer', 'fire', 'inspire'],
};

export const CONTENT_ACTIONS: Record<Exclude<ContentKind, 'dream'>, readonly ActionId[]> = {
  bible: ['share-internal', 'fire', 'prayer', 'inspire', 'verse-export'],
  music: ['share-internal', 'fire', 'audio-collab', 'inspire'],
  talent: ['encourage', 'prayer'],
};

export function actionsFor(kind: ContentKind, phase?: Phase | null): readonly ActionId[] {
  if (kind === 'dream') return phase ? DREAM_ACTIONS[phase] : [];
  return CONTENT_ACTIONS[kind];
}

export function allows(kind: ContentKind, action: ActionId, phase?: Phase | null): boolean {
  return actionsFor(kind, phase).includes(action);
}

/** Actions that make no sense on your own content. */
const NOT_ON_OWN: readonly ActionId[] = ['encourage', 'same-dream', 'offer-help', 'introduce', 'audio-collab'];

/** What this viewer may actually do now (anonymous viewers can only read). */
export function viewerActions(kind: ContentKind, phase: Phase | null, opts: { authenticated: boolean; isOwner: boolean }): ActionId[] {
  if (!opts.authenticated) return [];
  return actionsFor(kind, phase).filter(a => !(opts.isOwner && NOT_ON_OWN.includes(a)));
}
