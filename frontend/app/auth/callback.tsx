import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { latestAuthBridgeFailure } from '@/lib/api/client';

/**
 * Google/Apple PKCE web callback.
 *
 * A PKCE authorization code is SINGLE USE. The root AuthProvider may finish
 * restoring the prior session while this page mounts, so do not run the
 * exchange again when "initialized", "validationError", or "user" changes.
 * Google acceptance never bypasses JenLow's independent Worker verification.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const { user, completeOAuthSession, initialized } = useAuth();
  const attempted = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialized) return;
    // AuthProvider only exposes user after Supabase AND JenLow accepted it.
    if (user) {
      router.replace('/discover');
      return;
    }
    if (params.error || params.error_description) {
      setError(params.error_description || params.error || 'Google login failed');
      return;
    }
    const code = params.code;
    if (typeof code !== 'string' || !code) {
      setError('Aucun code de connexion reçu. Réessayez avec Google.');
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    let alive = true;
    void (async () => {
      if (!supabase) {
        if (alive) setError('Le service de connexion n’est pas configuré.');
        return;
      }
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        if (!data.session) throw new Error('session_missing_after_oauth');
        // A successful code exchange is single-use; do not leave the code in
        // browser history or let a later rerender consume it again.
        if (typeof window !== 'undefined') {
          const clean = new URL(window.location.href);
          clean.searchParams.delete('code');
          window.history.replaceState(window.history.state, '', clean.pathname + clean.search + clean.hash);
        }
        // Verify the exact session returned by PKCE. Waiting for the generic
        // revalidate() can join a stale startup validation before the fresh
        // Google session is available, resulting in a false failure.
        const accepted = await completeOAuthSession(data.session);
        if (!accepted && alive) {
          const failure = latestAuthBridgeFailure();
          const detail = failure ? ' (' + failure.code + ', HTTP ' + failure.status + ')' : '';
          setError('Google a reconnu votre compte, mais JenLow n’a pas pu vérifier la session.' + detail);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Échec de la connexion Google.');
      }
    })();
    return () => { alive = false; };
  }, [initialized, user, params.code, params.error, params.error_description, completeOAuthSession]);


  return (
    <View style={{
      flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28,
      backgroundColor: '#fff',
    }}>
      {error ? (
        <>
          <Text style={{ color: '#9e3158', marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
            <Text>Retour à la connexion</Text>
          </Pressable>
        </>
      ) : <ActivityIndicator />}
    </View>
  );
}
