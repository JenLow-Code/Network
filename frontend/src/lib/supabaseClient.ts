import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase is used ONLY for identity, not for JenLow's Dream database.
 * Publishable/anon keys identify a public app, never a privileged server.
 */
const url = (
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ldliraxelqftisjofwgv.supabase.co'
).trim();
const key = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_cpxxQyXcEYEy3mwWAaTG9w_QNFg9tC9'
).trim();
export const authConfigured = Boolean(
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && key && !key.includes('REPLACE_'),
);
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url, key, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

// Set up only once: background tasks must not keep refreshing auth sessions.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
