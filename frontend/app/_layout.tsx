import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Provider } from '@/context';
import { DreamProvider } from '@/domain/dreamRepository';
import { LocaleProvider } from '@/locale';
import { AuthProvider } from '@/auth/AuthProvider';

export default function Layout() {
  const [loaded, error] = useFonts({ Caveat_700Bold });
  if (!loaded && !error) return null;
  return (
    <LocaleProvider><AuthProvider><Provider><DreamProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }} />
    </DreamProvider></Provider></AuthProvider></LocaleProvider>
  );
}
