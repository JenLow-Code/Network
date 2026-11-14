import { api, ApiRequestError, refreshAccessToken } from '@/lib/api/client';
import { currentAccessToken } from '@/lib/api/session';

export type UploadedMusicAudio = { mediaId: string; url: string | null };

/** Upload a real audio file through JenLow's existing R2 media API.
 * Not a local blob URL: only a confirmed completed upload is persisted. */
export async function uploadMusicAudioFile(file: File, purpose: 'music_audio' | 'music_proposal' = 'music_audio'): Promise<UploadedMusicAudio> {
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' :
    file.name.toLowerCase().endsWith('.wav') ? 'audio/wav' : '');
  if (!['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm'].includes(mimeType))
    throw new Error('Format non pris en charge : importe un fichier audio MP3, WAV, M4A, OGG ou WebM.');
  if (!file.size || file.size > 30 * 1024 * 1024) throw new Error('Le fichier audio doit faire moins de 30 Mo.');
  const started = await api<{
    mediaId: string; upload: { url: string; method: string; headers: Record<string,string> };
  }>('/api/media/uploads', { method: 'POST', auth: 'required',
    body: { purpose, mimeType, bytes: file.size, filename: file.name } });
  const token = currentAccessToken() ?? await refreshAccessToken();
  if (!token) throw new ApiRequestError(401, 'not_authenticated');
  const response = await fetch(started.upload.url, {
    method: 'PUT', headers: { ...started.upload.headers, Authorization: 'Bearer ' + token },
    body: file,
  });
  if (!response.ok) throw new Error('L’envoi de la piste a échoué. Aucun fichier n’a été ajouté au morceau.');
  const done = await api<{ media: { id: string; url: string | null; status: string } }>(
    '/api/media/' + encodeURIComponent(started.mediaId) + '/complete',
    { method: 'POST', auth: 'required', body: {} },
  );
  if (done.media.status !== 'ready') throw new Error('L’audio n’a pas passé la vérification serveur.');
  return { mediaId: done.media.id, url: done.media.url };
}

/** Signed playback URLs expire. Resolve by stable media ID on each opened workspace. */
export async function resolveMusicAudio(mediaId: string): Promise<string | null> {
  const result = await api<{ media: { url: string | null; status: string } }>(
    '/api/media/' + encodeURIComponent(mediaId), { auth: 'required' });
  return result.media.status === 'ready' ? result.media.url : null;
}

export function chooseMusicFile(onSelected: (file: File) => void): void {
  if (typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp3,.wav,.m4a,.aac,.ogg,.webm,audio/*';
  input.onchange = () => { const file = input.files?.[0]; if (file) onSelected(file); };
  input.click();
}
