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

/**
 * Editorial fixtures for fictional D1 demo dreams only.
 * The read-only demo Worker currently exposes no needs or media endpoints;
 * these do NOT represent confirmed participants or uploaded user photographs.
 * Remove this fixture layer once the unified API supplies these fields.
 */
type IllustratedTalent = {
  title: string;
  illustration: NonNullable<DreamPublication['resources']>[number]['illustration'];
  requiredLevel: string;
};
const talent = (
  title: string,
  illustration: IllustratedTalent['illustration'],
  requiredLevel = 'Intermédiaire',
): IllustratedTalent => ({ title, illustration, requiredLevel });

const demoTalentRequests: Record<string, IllustratedTalent[]> = {
  'demo-dream-01-2': [talent('Chanteur', 'singing'), talent('Guitariste', 'acoustic-guitar'), talent('Batteur', 'drums'), talent('Pianiste', 'piano')],
  'demo-dream-02-3': [talent('Pianiste', 'piano', 'Avancé'), talent('Technicien piano', 'piano', 'Confirmé')],
  'demo-dream-04-1': [talent('Batteur', 'drums'), talent('Bassiste', 'bass'), talent('Chanteur', 'singing'), talent('Guitariste', 'electric-guitar')],
  'demo-dream-05-2': [talent('Photographe', 'camera', 'Confirmé'), talent('Formateur photo', 'camera', 'Avancé')],
  'demo-dream-06-3': [talent('Chanteur', 'singing'), talent('Batteur', 'drums'), talent('Guitariste', 'acoustic-guitar'), talent('Bassiste', 'bass')],
  'demo-dream-08-1': [talent('Choriste', 'singing'), talent('Pianiste', 'piano'), talent('Chef de chœur', 'singing', 'Avancé')],
  'demo-dream-09-2': [talent('Chanteur', 'singing'), talent('Pianiste', 'piano'), talent('Batteur', 'drums')],
  'demo-dream-10-3': [talent('Technicien son', 'electric-guitar'), talent('Guitariste', 'acoustic-guitar'), talent('Batteur', 'drums')],
};

/** Established Unsplash identifiers already used by this app's demo artwork. */
const demoCover: Record<string, string> = {
  'demo-dream-02-1': 'photo-1511379938547-c1f69419868d', // studio
  'demo-dream-03-2': 'photo-1510915361894-db8b60106cb1', // guitar
  'demo-dream-04-3': 'photo-1493225457124-a3eb161ffa5f', // musicians
  'demo-dream-06-1': 'photo-1520523839897-bd0b52f945a0', // instrument
  'demo-dream-07-2': 'photo-1416879595882-3373a0480b5b', // garden
  'demo-dream-08-3': 'photo-1516280440614-37939bbacd81', // live audio
  'demo-dream-10-1': 'photo-1520523839897-bd0b52f945a0', // instrument
};

export function mapDemoDream(dream: DemoDream, user: DemoUser): DreamPublication {
  const phase: DreamPublication['phase'] =
    dream.phase === 'initiation' ? 'Initiation' :
    dream.phase === 'growth' ? 'Croissance' :
    dream.phase === 'testimony' ? 'Témoignage' : 'Rêve';
  const requested = demoTalentRequests[dream.id] || [];
  const artwork = demoCover[dream.id];
  const photo = artwork ? 'https://images.unsplash.com/' + artwork + '?w=1000&q=82' : '';
  return {
    id: dream.id,
    type: 'dream',
    title: dream.title,
    author: user.display_name,
    authorHandle: user.handle,
    category: 'Communauté',
    phase,
    summary: dream.summary || '',
    image: photo,
    resultImage: phase === 'Témoignage' ? photo : undefined,
    imageAlt: dream.title,
    motivation: dream.testimony_text || undefined,
    createdAt: dream.created_at?.slice(0, 10),
    needs: requested.map(r => r.title),
    resources: requested.map(r => ({ ...r, category: 'person' as const, confirmed: false })),
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
