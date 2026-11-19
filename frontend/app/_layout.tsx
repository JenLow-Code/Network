import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { handwritingFontMap } from '@/theme/handwriting';
import { Provider } from '@/context/AppContext';
import { DreamProvider } from '@/domain/dreamRepository';
import { MusicWorkspaceProvider } from '@/domain/musicWorkspace';
import { LocaleProvider } from '@/i18n/locale';
import { AuthProvider } from '@/context/AuthProvider';
import { AppThemeProvider, useAppTheme } from '@/theme/AppTheme';
import { Nav } from '@/components/navigation/Nav';

function ThemedStack() {
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&width>=1100;
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{flex:1,backgroundColor:theme.background,
        flexDirection:desktop?'row':'column'}}>
        <View style={{flex:1,minWidth:0}}>
          <Stack
            screenOptions={{headerShown:false,
              contentStyle:{backgroundColor:theme.background}}}
          />
        </View>
        {desktop?<Nav placement="desktop"/>:null}
      </View>
    </>
  );
}
export default function Layout() {
  const [loaded, error] = useFonts(handwritingFontMap);
  if (!loaded && !error) return null;
  return (
    <AppThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <Provider>
            <DreamProvider>
              <MusicWorkspaceProvider>
                <ThemedStack />
              </MusicWorkspaceProvider>
            </DreamProvider>
          </Provider>
        </AuthProvider>
      </LocaleProvider>
    </AppThemeProvider>
  );
}
