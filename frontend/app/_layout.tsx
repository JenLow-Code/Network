import React from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { handwritingFontMap } from '@/theme/handwriting';
import { Provider } from '@/context/AppContext';
import { DreamProvider, useDreams } from '@/domain/dreamRepository';
import { MusicWorkspaceProvider } from '@/domain/musicWorkspace';
import { LocaleProvider } from '@/i18n/locale';
import { AuthProvider } from '@/context/AuthProvider';
import { AppThemeProvider, useAppTheme } from '@/theme/AppTheme';
import { Nav } from '@/components/navigation/Nav';
import { workspaceLayout } from '@/theme/workspaceLayout';

function ThemedStack() {
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const path=usePathname();
  const {items:dreams}=useDreams();
  const parts=path.split('/').filter(Boolean);
  const dreamId=parts[0]==='my-dream'?
    (['flower','notes','library'].includes(parts[1])?parts[2]:parts[1]):
    parts[0]==='my-dream-participants'?parts[1]:undefined;
  const image=dreamId?dreams.find(d=>d.id===decodeURIComponent(dreamId))?.image:undefined;
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{flex:1,backgroundColor:theme.background,
        flexDirection:desktop?'row':'column'}}>
        {desktop?<View pointerEvents="none" style={{
          position:'absolute',right:0,top:0,bottom:0,width:212,
          backgroundColor:theme.dark?'#343940':'#E7EAE7'}}>
          {/* Neutral atmospheric underlay. The glass blur belongs to Nav,
              never to a rainbow painted behind it. */}
          {image?<Image source={{uri:image}} resizeMode="cover" blurRadius={22}
            style={{position:'absolute',top:0,right:0,bottom:0,left:0,
              width:212,height:'100%',opacity:theme.dark?.37:.31,
              ...(Platform.OS==='web'?({filter:'grayscale(40%) saturate(.78)'} as any):{})}}/>:null}
          <View style={{position:'absolute',top:0,right:0,bottom:0,left:0,
            backgroundColor:theme.dark?'rgba(26,31,36,.22)':
              'rgba(253,251,248,.35)'}}/>
        </View>:null}
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
