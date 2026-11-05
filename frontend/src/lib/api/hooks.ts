import { useCallback, useEffect, useRef, useState } from 'react';
import type { Publication } from '@/domain/publication';
import { api, ApiRequestError } from './client';
import { toPublication, toPublications, type ApiFeedItem, type ApiProfile } from './adapters';
import { publications as samplePublications, personPublications as sampleTalents } from '@/mocks/publications';
import { fetchDemoDiscovery, fetchDemoPublication } from './demo';

/**
 * Opt-in local design preview. Only enabled inside Expo development builds.
 * Never silently substitute sample content when a real API request fails.
 */
const previewDiscovery = __DEV__ && process.env.EXPO_PUBLIC_DISCOVERY_SOURCE === 'demo';
// Production beta uses the actually deployed read-only D1 demo Worker until the unified API is ready.
// Set EXPO_PUBLIC_DISCOVERY_SOURCE=unified only after /api/discovery is deployed and verified.
const betaDiscovery = process.env.EXPO_PUBLIC_DISCOVERY_SOURCE !== 'unified';
const demoFeed: Publication[] = [...samplePublications, ...sampleTalents].filter(
  p => p.type !== 'dream' || p.phase !== 'Rêve',
);

/**
 * Interleave the D1-backed demo dreams with music, Scripture and talent previews.
 * Stable order (no random shuffling) keeps the masonry layout predictable.
 */
function interleaveEditorial(dreams: Publication[], editorial: Publication[]): Publication[] {
  const result: Publication[] = [];
  let next = 0;
  for (const dream of dreams) {
    result.push(dream);
    if (next < editorial.length) result.push(editorial[next++]);
    if (result.length % 5 === 0 && next < editorial.length) result.push(editorial[next++]);
  }
  return [...result, ...editorial.slice(next)];
}

/** Items already loaded by a list are reused by detail screens for an instant first paint. */
const cache = new Map<string, Publication>();
export const cachedPublication = (id: string) => cache.get(id);

export type LoadState = 'loading' | 'ready' | 'error';

/** Discovery reads D1 in normal mode; local demo mode is an explicit dev-only opt-in. */
export function useDiscovery(params: { type?: string; q?: string } = {}) {
  const [items, setItems] = useState<Publication[]>(() => previewDiscovery ? demoFeed : []);
  const [state, setState] = useState<LoadState>(previewDiscovery ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.q) query.set('q', params.q);
  const key = query.toString();

  const load = useCallback(async () => {
    if (previewDiscovery) {
      // Local fixtures are deliberately not served from the API and require no network.
      const shown = demoFeed.filter(p =>
        (!params.type || p.type === params.type) &&
        (!params.q || [p.title, p.author].join(' ').toLowerCase().includes(params.q.toLowerCase())),
      );
      setItems(shown);
      setCursor(null);
      setError(null);
      setState('ready');
      return;
    }
    setState('loading');
    setError(null);
    try {
      if (betaDiscovery) {
        const remote = await fetchDemoDiscovery();
        // Music, Bible and Talent are visibly demo previews; D1 currently has only dream data.
        const demoEditorial = demoFeed.filter(p => p.type !== 'dream');
        const mixed = interleaveEditorial(remote, demoEditorial).filter(p =>
          (!params.type || p.type === params.type) &&
          (!params.q || [p.title, p.author].join(' ').toLowerCase().includes(params.q.toLowerCase())),
        );
        mixed.forEach(p => cache.set(p.id, p));
        setItems(mixed);
        setCursor(null);
        setState('ready');
        return;
      }
      const page = await api<{ items: ApiFeedItem[]; nextCursor: string | null }>(`/api/discovery?limit=40${key ? '&' + key : ''}`);
      const mapped = toPublications(page.items);
      mapped.forEach(p => cache.set(p.id, p));
      setItems(mapped);
      setCursor(page.nextCursor);
      setState('ready');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.code : 'request_failed');
      setState('error');
    }
  }, [key]);

  const loadMore = useCallback(async () => {
    if (betaDiscovery || previewDiscovery || !cursor || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await api<{ items: ApiFeedItem[]; nextCursor: string | null }>(`/api/discovery?limit=40&cursor=${encodeURIComponent(cursor)}${key ? '&' + key : ''}`);
      const mapped = toPublications(page.items);
      mapped.forEach(p => cache.set(p.id, p));
      setItems(prev => [...prev, ...mapped.filter(m => !prev.some(p => p.id === m.id))]);
      setCursor(page.nextCursor);
    } catch {
      /* keep what is shown; the next scroll retries */
    } finally {
      loadingMore.current = false;
    }
  }, [cursor, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, state, error, retry: load, loadMore, hasMore: !!cursor };
}

/** One publication (any type) by id, as returned by GET /api/publications/:id. */
export function usePublication(id: string | undefined) {
  const [item, setItem] = useState<Publication | null>(id ? cache.get(id) ?? null : null);
  const [detail, setDetail] = useState<any>(null);
  const [state, setState] = useState<LoadState>(id && cache.get(id) ? 'ready' : 'loading');
  const load = useCallback(async () => {
    if (!id) return;
    if (!cache.get(id)) setState('loading');
    try {
      if (betaDiscovery && id.startsWith('demo-dream-')) {
        const demo = await fetchDemoPublication(id);
        if (demo) cache.set(id, demo);
        setItem(demo);
        setState(demo ? 'ready' : 'error');
        return;
      }
      const res = await api<{ item: ApiFeedItem; dream?: unknown; chapter?: unknown }>(`/api/publications/${encodeURIComponent(id)}`);
      const mapped = toPublication({ ...res.item, ...((res.dream as object) || {}) } as ApiFeedItem);
      if (mapped) cache.set(id, mapped);
      setItem(mapped);
      setDetail(res);
      setState(mapped ? 'ready' : 'error');
    } catch {
      if (!cache.get(id)) setState('error');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  return { item, detail, state, retry: load };
}

/** Public profile by handle plus its one-column publication feed. */
export function useMemberProfile(handle: string | undefined) {
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [posts, setPosts] = useState<Publication[]>([]);
  const [state, setState] = useState<LoadState | 'not_found'>('loading');
  const load = useCallback(async () => {
    if (!handle) return;
    setState('loading');
    try {
      const [p, feed] = await Promise.all([
        api<{ profile: ApiProfile }>(`/api/users/${encodeURIComponent(handle)}`),
        api<{ items: ApiFeedItem[] }>(`/api/users/${encodeURIComponent(handle)}/publications?limit=50`),
      ]);
      const mapped = toPublications(feed.items);
      mapped.forEach(x => cache.set(x.id, x));
      setProfile(p.profile);
      setPosts(mapped);
      setState('ready');
    } catch (e) {
      setState(e instanceof ApiRequestError && e.status === 404 ? 'not_found' : 'error');
    }
  }, [handle]);
  useEffect(() => {
    void load();
  }, [load]);
  return { profile, posts, state, retry: load };
}
