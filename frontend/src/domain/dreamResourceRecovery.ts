import type { DreamEntry, DreamResource } from './dreamWorkspace';

export type FoundNeed = Pick<DreamResource, 'id' | 'title' | 'category'>;

/** Only a recorded confirmation counts, and a human always requires a real server need. */
export const isNeedFound = (need: DreamResource): boolean =>
  !!need.confirmed && (need.category !== 'person' || !!need.serverNeedId);

/** Remember confirmations even when a resource is subsequently lost. */
export function rememberFoundNeeds(history: FoundNeed[] = [], needs: DreamResource[] = []): FoundNeed[] {
  const seen = new Map(history.map(need => [need.id, need]));
  for (const need of needs) {
    if (isNeedFound(need)) {
      seen.set(need.id, { id: need.id, title: need.title, category: need.category });
    }
  }
  return Array.from(seen.values());
}

/** A need never found is NOT a loss. Deleting a no-longer-required need is NOT a loss. */
export function lostFoundNeeds(dream: DreamEntry): FoundNeed[] {
  const current = new Map((dream.resources || []).map(need => [need.id, need]));
  return (dream.foundNeedHistory || []).filter(previous => {
    const now = current.get(previous.id);
    return !!now && !isNeedFound(now);
  });
}
