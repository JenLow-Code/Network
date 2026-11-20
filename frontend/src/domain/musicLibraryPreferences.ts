import AsyncStorage from '@react-native-async-storage/async-storage';

export type MusicLibraryLayout = 'cards' | 'list';

/** Per-account local presentation choice. Music contents are stored separately. */
export const musicLibraryLayoutKey = (email: string) =>
  'jenlow.network.music.library-layout.v1.' + (email || 'guest').trim().toLowerCase();

export async function readMusicLibraryLayout(email: string): Promise<MusicLibraryLayout> {
  const value = await AsyncStorage.getItem(musicLibraryLayoutKey(email));
  return value === 'list' ? 'list' : 'cards';
}

export async function writeMusicLibraryLayout(email: string, value: MusicLibraryLayout) {
  await AsyncStorage.setItem(musicLibraryLayoutKey(email), value);
}
