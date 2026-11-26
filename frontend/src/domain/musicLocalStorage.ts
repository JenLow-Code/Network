/**
 * Retired device-only music persistence.
 * Keep the function contracts temporarily for existing editor imports; no
 * IndexedDB or AsyncStorage access and no success without server persistence.
 * Existing device data is not erased or silently migrated.
 */
const unavailable = (): never => {
  throw new Error('Le stockage musical sur le serveur n’est pas encore disponible.');
};
export async function readMusicWorkspace(_key: string): Promise<string | null> { return null; }
export async function writeMusicWorkspace(_key: string, _value: string): Promise<void> { unavailable(); }
export async function saveDraftAudio(_file: File): Promise<string> { return unavailable(); }
export async function getDraftAudio(_id: string): Promise<Blob | null> { return null; }
export async function saveDraftAttachment(_file: File): Promise<string> { return unavailable(); }
export async function getDraftAttachment(_id: string): Promise<Blob | null> { return null; }
export async function saveMusicWorkspaceFile(_file: File): Promise<string> { return unavailable(); }
export async function deleteLocalMusicFile(_id: string): Promise<void> { unavailable(); }
export const deleteUnassignedMusicTake = deleteLocalMusicFile;
