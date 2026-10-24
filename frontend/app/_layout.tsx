import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Provider } from '@/context';

export default function Layout() {
  const [loaded, error] = useFonts({ Caveat_700Bold });
  if (!loaded && !error) return null;
  return (
    <Provider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }} />
    </Provider>
  );
}
