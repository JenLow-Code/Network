import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
export default function Index() {
  const { user, initialized } = useAuth();
  const [processing, setProcessing] = useState(
    () =>
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      !!window.location &&
      new URLSearchParams(window.location.search).has('code'),
  );
  const [error, setError] = useState('');
  useEffect(() => {
    // React Native defines a global window, but it does NOT have browser location/history.
    // Never inspect web URL state on Android/iOS: it crashes immediately at launch.
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location || !supabase)
      return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code'),
      oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!code) return;
    let active = true;
    setProcessing(true);
    void supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(e => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setProcessing(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text>Google login: {error}</Text>
      </View>
    );
  if (processing || !initialized)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  return <Redirect href={user ? '/discover' : '/login'} />;
}
