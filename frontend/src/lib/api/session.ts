import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Session storage for the JenLow API.
 *
 * - The access token (15 min) lives in memory only.
 * - The rotating refresh token is persisted so a reload restores the session:
 *   web → sessionStorage (survives reload, cleared when the tab closes, never shared across sites);
 *   iOS/Android → AsyncStorage. Move it to expo-secure-store (Keychain/Keystore) in the next
 *   native build; that needs a new dependency and an EAS rebuild (see middleware/DECISIONS.md).
 * Tokens are never logged.
 */
const KEY = 'jenlow.network.session.v1';

export type StoredUser = { id: string; email: string; displayName: string; handle?: string };
type Stored = { refreshToken: string; user: StoredUser };

let accessToken: string | null = null;
let accessExpiresAt = 0;

export function setAccessToken(token: string | null, expiresInSeconds = 900): void {
  accessToken = token;
  accessExpiresAt = token ? Date.now() + (expiresInSeconds - 30) * 1000 : 0;
}

export function currentAccessToken(): string | null {
  return accessToken && Date.now() < accessExpiresAt ? accessToken : null;
}

function webStore(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<Stored | null> {
  try {
    const raw = Platform.OS === 'web' ? webStore()?.getItem(KEY) ?? null : await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.refreshToken === 'string' && parsed.user?.id ? (parsed as Stored) : null;
  } catch {
    return null;
  }
}

export async function saveSession(value: Stored | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const store = webStore();
      if (!store) return;
      if (value) store.setItem(KEY, JSON.stringify(value));
      else store.removeItem(KEY);
      return;
    }
    if (value) await AsyncStorage.setItem(KEY, JSON.stringify(value));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the session simply will not survive a reload */
  }
}
