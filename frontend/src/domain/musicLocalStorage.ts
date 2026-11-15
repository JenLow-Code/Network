import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Independent local workspace storage. Browser IndexedDB avoids reliance on
 * localStorage, which can be disabled by an embedded host / privacy settings.
 * Existing AsyncStorage workspaces are imported on first read (no destructive migration).
 */
const DB_NAME = 'jenlow-music-local-v2';
const DB_VERSION = 1;
const DATA = 'workspaces';
const AUDIO = 'audio';
type StoreName = typeof DATA | typeof AUDIO;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('indexedDB_unavailable'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('indexedDB_failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA);
      if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO);
    };
    request.onsuccess = () => resolve(request.result);
  });
}
async function access<T>(store: StoreName, mode: IDBTransactionMode,
  action: (s: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      transaction.onerror = () => reject(transaction.error || new Error('storage_transaction_failed'));
      transaction.onabort = () => reject(transaction.error || new Error('storage_transaction_aborted'));
      action(transaction.objectStore(store), resolve, reject);
    });
  } finally { db.close(); }
}
function getStored<T>(store: StoreName, key: string): Promise<T | undefined> {
  return access<T | undefined>(store, 'readonly', (s, resolve, reject) => {
    const r = s.get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
function putStored(store: StoreName, key: string, value: unknown): Promise<void> {
  return access<void>(store, 'readwrite', (s, resolve, reject) => {
    const transaction = s.transaction;
    transaction.oncomplete = () => resolve();
    const r = s.put(value, key);
    r.onerror = () => reject(r.error);
  });
}

/** Metadata: prefer IndexedDB after migration. Fall back to AsyncStorage on native or unsupported browsers. */
export async function readMusicWorkspace(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') return AsyncStorage.getItem(key);
  let indexedDbAccessible = false;
  try {
    const stored = await getStored<string>(DATA, key);
    indexedDbAccessible = true;
    if (stored !== undefined) return stored;
  } catch { /* May still be accessible from old storage. */ }
  try { return await AsyncStorage.getItem(key); }
  catch (e) { if (indexedDbAccessible) return null; throw e; }
}
export async function writeMusicWorkspace(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') return AsyncStorage.setItem(key, value);
  try {
    await putStored(DATA, key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

/** User's audio stays local until explicitly uploaded/published. */
export async function saveDraftAudio(file: File): Promise<string> {
  if (Platform.OS !== 'web') throw new Error('Import audio local indisponible sur cette plateforme.');
  if (file.size > 100 * 1024 * 1024) throw new Error('Fichier trop volumineux (maximum 100 Mo en local).');
  if (!file.size || !(file.type.startsWith('audio/') || /\.(wav|mp3|ogg|m4a|aac|webm)$/i.test(file.name))) {
    throw new Error('Sélectionne un véritable fichier audio.');
  }
  const id = 'local-audio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  try {
    await putStored(AUDIO, id, file);
    return id;
  } catch {
    throw new Error('Le navigateur refuse le stockage de cet audio. Vérifie les permissions et l’espace disque.');
  }
}
export async function getDraftAudio(id: string): Promise<Blob | null> {
  if (Platform.OS !== 'web') return null;
  try { return (await getStored<Blob>(AUDIO, id)) ?? null; } catch { return null; }
}

/** Local PDF/image attachments for individual song sections (not publicly distributed). */
export async function saveDraftAttachment(file: File): Promise<string> {
  if (Platform.OS !== 'web') throw new Error('Pièces jointes locales non disponibles sur cette plateforme.');
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error('La partition doit être un PDF ou une image de 20 Mo maximum.');
  if (!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))
    throw new Error('Formats de partition pris en charge : PDF, JPG, PNG et WebP.');
  const id = 'local-score-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  await putStored(AUDIO,id,file);
  return id;
}
export async function getDraftAttachment(id: string): Promise<Blob | null> {
  return getDraftAudio(id);
}

/** Native attachments remain private and are only available from the originating browser. */
export async function saveMusicWorkspaceFile(file: File): Promise<string> {
  if (Platform.OS !== 'web') throw new Error('L’import de pièces jointes nécessite le navigateur web.');
  const allowed=/\.(docx|txt|md|pdf|png|jpg|jpeg|webp|mp3|m4a|wav|webm|ogg|aac|mid|midi)$/i;
  if(!allowed.test(file.name))throw new Error('Format non reconnu. Utilise DOCX, texte, PDF, image, audio ou MIDI.');
  if(!file.size||file.size>100*1024*1024)throw new Error('Le fichier doit faire au maximum 100 Mo.');
  const id='music-file-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  await putStored(AUDIO,id,file);
  return id;
}
