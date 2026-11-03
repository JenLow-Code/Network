import { useCallback, useEffect, useRef, useState } from 'react';
import type { Publication } from '@/domain/publication';
import { api, ApiRequestError } from './client';
import { toPublication, toPublications, type ApiFeedItem, type ApiProfile } from './adapters';

/** Items already loaded by a list are reused by detail screens for an instant first paint. */
const cache = new Map<string, Publication>();
export const cachedPublication = (id: string) => cache.get(id);

export type LoadState = 'loading' | 'ready' | 'error';

/** Discovery feed from D1 via the API. No mock fallback: failures show an error with retry. */
export function useDiscovery(params: { type?: string; q?: string } = {}) {
  const [items, setItems] = useState<Publication[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.q) query.set('q', params.q);
  const key = query.toString();

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
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
    if (!cursor || loadingMore.current) return;
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
