import { DEMO_API_BASE } from '@/lib/api/demo';
import type { MusicPublication } from '@/domain/publication';

/**
 * Real, read-only D1 fixtures served by the dedicated demo Worker.
 * All identities and songs are fictional; never synthesize them into real
 * authenticated proposal data or send user operations for these records.
 */
export type DemoMusicPreview = {
  songs: (MusicPublication & { isDemo: true })[];
  /** All existing fictional tracks for Continue discovering / mobile swiping.
   * Only songs with an open talent request belong on the Pour moi shelf. */
  catalog: (MusicPublication & { isDemo: true })[];
  collaborations: {
    id: string;
    trackTitle: string;
    trackPublicationId: string;
    description: string;
    createdAt?: string | null;
    contribution?: string | null;
    audioAsset?: string | null;
    mimeType?: string | null;
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
    createdAt?: string | null;
    contribution?: string | null;
    audioAsset?: string | null;
    mimeType?: string | null;
    status: 'accepted';
    publisher: { displayName: string };
    proposer: { displayName: string };
    isDemo: true;
  }[];
};

const isFictionalSong = (song: DemoMusicResponse['songs'][number]) =>
  song.isDemo === true && song.id.startsWith('demo-music-publication-');

function toDemoPublication(song: DemoMusicResponse['songs'][number]): MusicPublication & {isDemo:true} {
  return {
    id: song.id,
    type: 'music',
    title: song.title.replace(/^\[Démo\]\s*/i, ''),
    author: song.author,
    authorHandle: song.authorHandle,
    songAuthor: song.author,
    description: 'Aperçu d’un morceau fictif dans JenLow Network.',
    audioIndex: (song.sampleAsset === 'pierre-02-esperance' ? 1 :
      song.sampleAsset === 'pierre-03-lumiere' ? 2 : 0) as 0 | 1 | 2,
    image: '', imageAlt: 'Cassette de démonstration',
    requestedTalents: Array.isArray(song.requestedTalents) ? song.requestedTalents : [],
    isDemo: true,
  };
}

async function loadDemoMusicData(): Promise<DemoMusicResponse> {
  const res = await fetch(DEMO_API_BASE + '/api/demo/music');
  if (!res.ok) throw new Error('music_preview_http_' + res.status);
  const data: DemoMusicResponse = await res.json();
  if (!Array.isArray(data.songs) || !Array.isArray(data.collaborations))
    throw new Error('music_preview_invalid_response');
  return data;
}

export async function fetchDemoMusicPreview(): Promise<DemoMusicPreview> {
  const data = await loadDemoMusicData();
  return {
    catalog:data.songs.filter(isFictionalSong).map(toDemoPublication),
    // Only open calls appear in Pour moi; other demo songs can still be
    // inspected from their existing shared-project tile via the same detail.
    songs: data.songs.filter(song => isFictionalSong(song) &&
      Array.isArray(song.requestedTalents) && song.requestedTalents.length > 0)
      .map(toDemoPublication),
    collaborations: data.collaborations.filter(c => c.isDemo === true &&
      c.id.startsWith('demo-music-proposal-') && c.status === 'accepted').map(c => ({
      ...c, direction: 'sent' as const, isDemo: true as const,
    })),
  };
}

/** A direct deep link must work too: re-fetch the D1 record, never trust URL titles. */
export async function fetchDemoMusicPublication(id:string):Promise<MusicPublication|null> {
  if (!/^demo-music-publication-\d{2}$/.test(id)) return null;
  const data = await loadDemoMusicData();
  const song = data.songs.find(s => s.id === id && isFictionalSong(s));
  return song ? toDemoPublication(song) : null;
}
