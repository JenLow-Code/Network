import { DEMO_API_BASE } from '@/lib/api/demo';
import type { MusicPublication } from '@/domain/publication';

/**
 * Real, read-only D1 fixtures served by the dedicated demo Worker.
 * All identities and songs are fictional; never synthesize them into real
 * authenticated proposal data or send user operations for these records.
 */
export type DemoMusicPreview = {
  songs: (MusicPublication & { isDemo: true })[];
  collaborations: {
    id: string;
    trackTitle: string;
    trackPublicationId: string;
    description: string;
    status: 'accepted';
    direction: 'sent';
    isDemo: true;
    publisher: { displayName: string };
    proposer: { displayName: string };
  }[];
};

type DemoMusicResponse = {
  songs: {
    id: string;
    title: string;
    author: string;
    authorHandle?: string;
    requestedTalents: string[];
    sampleAsset?: string | null;
    isDemo: true;
  }[];
  collaborations: {
    id: string;
    trackTitle: string;
    trackPublicationId: string;
    description: string;
    status: 'accepted';
    publisher: { displayName: string };
    proposer: { displayName: string };
    isDemo: true;
  }[];
};

export async function fetchDemoMusicPreview(): Promise<DemoMusicPreview> {
  const res = await fetch(DEMO_API_BASE + '/api/demo/music');
  if (!res.ok) throw new Error('music_preview_http_' + res.status);
  const data: DemoMusicResponse = await res.json();
  if (!Array.isArray(data.songs) || !Array.isArray(data.collaborations))
    throw new Error('music_preview_invalid_response');
  return {
    songs: data.songs.filter(s => s.isDemo === true &&
      s.id.startsWith('demo-music-publication-') &&
      Array.isArray(s.requestedTalents) && s.requestedTalents.length > 0).map(s => ({
      id: s.id,
      type: 'music' as const,
      title: s.title,
      author: s.author,
      authorHandle: s.authorHandle,
      songAuthor: s.author,
      description: 'Exemple de présentation — chanson fictive',
      audioIndex: (s.sampleAsset === 'pierre-02-esperance' ? 1 :
        s.sampleAsset === 'pierre-03-lumiere' ? 2 : 0) as 0 | 1 | 2,
      image: '', imageAlt: 'Cassette de démonstration',
      requestedTalents: Array.isArray(s.requestedTalents) ? s.requestedTalents : [],
      isDemo: true as const,
    })),
    collaborations: data.collaborations.filter(c => c.isDemo === true &&
      c.id.startsWith('demo-music-proposal-') && c.status === 'accepted').map(c => ({
      ...c, direction: 'sent' as const, isDemo: true as const,
    })),
  };
}
