import React from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';
import Svg, {Defs,LinearGradient,Stop,Rect} from 'react-native-svg';
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
          position:'absolute',top:0,right:0,bottom:0,width:212,
          backgroundColor:theme.dark?'#283039':'#E5E8E9'}}>
          <Svg pointerEvents="none" width="100%" height="100%"
            style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
            <Defs>
              <LinearGradient id="desktop-sidebar-ambient" x1="0%" y1="0%"
                x2="100%" y2="100%">
                <Stop offset="0%" stopColor={theme.dark?'#556984':'#B6D8E8'}
                  stopOpacity=".9"/>
                <Stop offset="37%" stopColor={theme.dark?'#54566C':'#F2DCE7'}
                  stopOpacity=".86"/>
                <Stop offset="75%" stopColor={theme.dark?'#6B5464':'#D3E2E3'}
                  stopOpacity=".86"/>
                <Stop offset="100%" stopColor={theme.dark?'#343F4C':'#F2DECD'}
                  stopOpacity=".85"/>
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#desktop-sidebar-ambient)"/>
          </Svg>
          {image?<Image source={{uri:image}} resizeMode="cover"
            blurRadius={36} style={{position:'absolute',top:-10,left:-10,
              right:-10,bottom:-10,width:232,height:'105%',
              opacity:theme.dark?.65:.66}}/>:null}
          <View style={{position:'absolute',top:0,bottom:0,left:0,right:0,
            backgroundColor:theme.dark?'rgba(16,21,30,.24)':
              'rgba(254,253,251,.30)'}}/>
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
