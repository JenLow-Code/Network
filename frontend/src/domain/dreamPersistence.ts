import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Durable local Dream workspace storage.
 *
 * AsyncStorage on web uses localStorage, where a couple of images encoded as
 * data URLs can exhaust the small synchronous quota. IndexedDB is used for
 * the full workspace on web. Existing AsyncStorage records are migrated once,
 * and native apps continue using AsyncStorage.
 *
 * This is local, keyed by account email, not server-side account sync.
 */
const DATABASE = 'jenlow.network.dreams';
const STORE = 'workspaces';
const VERSION = 1;
const pendingWrites = new Map<string, Promise<void>>();
let databasePromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onerror = () => reject(request.error || new Error('Dream database unavailable'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
      request.onblocked = () => reject(new Error('Dream database is blocked'));
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function indexedRead(key: string): Promise<string | null> {
  const db = await database();
  return new Promise<string | null>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onerror = () => reject(request.error || new Error('Dream read failed'));
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    transaction.onerror = () => reject(transaction.error || new Error('Dream read failed'));
  });
}

async function indexedWrite(key: string, value: string): Promise<void> {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Dream save failed'));
    transaction.onabort = () => reject(transaction.error || new Error('Dream save interrupted'));
  });
}

const hasIndexedDb = () => Platform.OS === 'web' && typeof indexedDB !== 'undefined';

/** Serialized writes prevent rapid edits from finishing out of order. */
export function persistDreamWorkspace(key: string, value: string): Promise<void> {
  const previous = pendingWrites.get(key) || Promise.resolve();
  const write = previous.catch(() => undefined).then(() =>
    hasIndexedDb() ? indexedWrite(key, value) : AsyncStorage.setItem(key, value),
  );
  pendingWrites.set(key, write);
  void write.finally(() => {
    if (pendingWrites.get(key) === write) pendingWrites.delete(key);
  }).catch(() => undefined);
  return write;
}

export async function readDreamWorkspace(key: string): Promise<string | null> {
  const pending = pendingWrites.get(key);
  if (pending) await pending;
  if (!hasIndexedDb()) return AsyncStorage.getItem(key);

  // Legacy AsyncStorage may already hold the user's existing dreams/images.
  // Once imported, IndexedDB becomes the sole source of truth.
  let stored: string | null;
  try {
    stored = await indexedRead(key);
  } catch {
    // Legacy fallback only when browser IndexedDB is unavailable.
    return AsyncStorage.getItem(key);
  }
  if (stored !== null) return stored;
  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) await persistDreamWorkspace(key, legacy);
  return legacy;
}
