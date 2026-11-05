import type { DreamPublication, Publication } from '@/domain/publication';

/**
 * Existing read-only Cloudflare Worker backed by D1. This is an explicit beta
 * API contract, NOT a mock fallback for a failed unified API.
 */
export const DEMO_API_BASE = 'https://jenlow-network-demo-api.jenlow-production.workers.dev';

type DemoDream = {
  id: string;
  title: string;
  summary: string | null;
  phase: 'dream' | 'initiation' | 'growth' | 'testimony';
  visibility: string;
  created_by: string;
  cover_asset_key: string | null;
  created_at: string | null;
  testimony_text?: string | null;
};
type DemoUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_asset_key?: string | null;
  dreams: DemoDream[];
};

export function mapDemoDream(dream: DemoDream, user: DemoUser): DreamPublication {
  const phase: DreamPublication['phase'] =
    dream.phase === 'initiation' ? 'Initiation' :
    dream.phase === 'growth' ? 'Croissance' :
    dream.phase === 'testimony' ? 'Témoignage' : 'Rêve';
  return {
    id: dream.id,
    type: 'dream',
    title: dream.title,
    author: user.display_name,
    authorHandle: user.handle,
    category: 'Communauté',
    phase,
    summary: dream.summary || '',
    image: '',
    imageAlt: dream.title,
    motivation: dream.testimony_text || undefined,
    createdAt: dream.created_at?.slice(0, 10),
    needs: [],
  };
}

const makeDemoError = (message: string) => new Error('demo_api: ' + message);

/** Strict: errors propagate to the visible Discovery retry state. */
export async function fetchDemoDiscovery(): Promise<Publication[]> {
  const response = await fetch(DEMO_API_BASE + '/api/demo/users?limit=20');
  if (!response.ok) throw makeDemoError('HTTP ' + response.status);
  const payload = await response.json() as { users?: DemoUser[] };
  if (!Array.isArray(payload.users)) throw makeDemoError('invalid_users_response');
  return payload.users.flatMap(user => (user.dreams || []).map(dream => mapDemoDream(dream, user)))
    .filter(p => p.phase !== 'Rêve');
}

export async function fetchDemoPublication(id: string): Promise<DreamPublication | null> {
  const posts = await fetchDemoDiscovery();
  const selected = posts.find(p => p.id === id);
  return selected?.type === 'dream' ? selected : null;
}
