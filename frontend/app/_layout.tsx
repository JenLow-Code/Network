import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Provider } from '@/context/AppContext';
import { DreamProvider } from '@/domain/dreamRepository';
import { LocaleProvider } from '@/i18n/locale';
import { AuthProvider } from '@/context/AuthProvider';
import { AppThemeProvider, useAppTheme } from '@/theme/AppTheme';

function ThemedStack() {
  const theme = useAppTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
      />
    </>
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({ Caveat_700Bold });
  if (!loaded && !error) return null;
  return (
    <AppThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <Provider>
            <DreamProvider>
              <ThemedStack />
            </DreamProvider>
          </Provider>
        </AuthProvider>
      </LocaleProvider>
    </AppThemeProvider>
  );
}
