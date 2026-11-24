import React,{useEffect} from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { handwritingFontMap } from '@/theme/handwriting';
import { Provider } from '@/context/AppContext';
import { DreamProvider, useDreams } from '@/domain/dreamRepository';
import { MusicWorkspaceProvider } from '@/domain/musicWorkspace';
import { SharedMusicNavigationProvider } from '@/domain/sharedMusicNavigation';
import { LocaleProvider } from '@/i18n/locale';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { AppThemeProvider, useAppTheme } from '@/theme/AppTheme';
import { Nav,MOBILE_NAV_HEIGHT } from '@/components/navigation/Nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { workspaceLayout } from '@/theme/workspaceLayout';


const PRIVATE_SCREENS=[
  'agenda',
  'bible-library',
  'bible/[reference]',
  'chat/[id]',
  'circle-call/[id]',
  'circle',
  'discover',
  'dream/[id]',
  'fire',
  'import-verse',
  'introduce/[id]',
  'member/[name]',
  'music-collaboration/[id]',
  'music-composer/[id]',
  'music-hub',
  'music-listen/[id]',
  'music-library',
  'music-lyrics/[id]',
  'music-proposal/[id]',
  'music-workspace/[id]',
  'music/[id]',
  'music/new',
  'my-dream-participants/[id]',
  'my-dream/[id]',
  'my-dream/flower/[id]',
  'my-dream/library/[id]',
  'my-dream/new',
  'my-dream/notes/[id]',
  'my-dreams',
  'my-dreams/[phase]',
  'my-space',
  'notifications',
  'person/[name]',
  'prayers',
  'profile-preview',
  'profile',
  'profile-talents',
  'profile-publications',
  'publish/music',
  'semence-share/[id]',
  'settings',
  'share/[id]',
  'space',
  'talent-invitations',
  'verse-export/[id]',
] as const;

function ThemedStack() {
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const path=usePathname();
  const {user,initialized,validationError,revalidate,noteActivity}=useAuth();
  const isAuthRoute=path==='/'||path==='/login'||path==='/auth/callback';
  const locked=(!user||validationError)&&!isAuthRoute;
  const {items:dreams}=useDreams();
  const parts=path.split('/').filter(Boolean);
  const dreamId=parts[0]==='my-dream'?
    (['flower','notes','library'].includes(parts[1])?parts[2]:parts[1]):
    parts[0]==='my-dream-participants'?parts[1]:undefined;
  const image=dreamId?dreams.find(d=>d.id===decodeURIComponent(dreamId))?.image:undefined;
  // Applies to every deep link, direct URL, back/forward navigation and
  // tab route, including Discovery. OAuth/password recovery remain reachable.
  useEffect(()=>{
    if(!initialized)return;
    if((!user||validationError)&&!isAuthRoute){
      router.replace('/login');return;
    }
    if(user&&!validationError&&path==='/login')router.replace('/discover');
  },[initialized,validationError,user,isAuthRoute,path]);
  // Expo's custom HTML may not apply global stylesheet rules during a
  // client-only web navigation. Install the scrollbar rule in the running app
  // as well: every page and modal continues to scroll normally.
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    const id='jenlow-hide-native-scrollbars';
    if(document.getElementById(id))return;
    const style=document.createElement('style');
    style.id=id;
    style.textContent=`
      html, body, #root, #__next, * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar,
      *::-webkit-scrollbar-track,
      *::-webkit-scrollbar-thumb {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    return ()=>{style.remove();};
  },[]);
  if(!initialized)return <View style={{flex:1,
    justifyContent:'center',alignItems:'center',backgroundColor:theme.background}}>
    <ActivityIndicator color="#CB245C"/>
  </View>;
  // Keep the root navigator mounted even while redirecting; Expo Router
  // needs the Stack to resolve its protected-route redirect to Login.
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View onTouchStart={noteActivity} style={{
        // 100dvh follows Android browser toolbars as they appear/disappear.
        // This keeps the root navigation anchored to the *visible* viewport.
        ...(Platform.OS==='web'?
          ({height:'100dvh',maxHeight:'100dvh',overflow:'hidden'} as any):
          {flex:1}),
        backgroundColor:theme.background,
        flexDirection:desktop?'row':'column',
      }}>
        {desktop?<View pointerEvents="none" style={{
          position:'absolute',right:0,top:0,bottom:0,width:236,
          backgroundColor:theme.dark?'#343940':'#E7EAE7'}}>
          {/* Neutral atmospheric underlay. The glass blur belongs to Nav,
              never to a rainbow painted behind it. */}
          {image?<Image source={{uri:image}} resizeMode="cover" blurRadius={22}
            style={{position:'absolute',top:0,right:0,bottom:0,left:0,
              width:236,height:'100%',opacity:theme.dark?.37:.31,
              ...(Platform.OS==='web'?({filter:'grayscale(40%) saturate(.78)'} as any):{})}}/>:null}
          <View style={{position:'absolute',top:0,right:0,bottom:0,left:0,
            backgroundColor:theme.dark?'rgba(26,31,36,.22)':
              'rgba(253,251,248,.35)'}}/>
        </View>:null}
        <View style={{flex:1,minWidth:0,position:'relative'}}>
          <View style={{flex:1,minHeight:0,
            opacity:locked?0:1,
            paddingBottom:desktop?0:(!user||validationError?0:MOBILE_NAV_HEIGHT+insets.bottom)}}>
            <Stack
              screenOptions={{headerShown:false,
                contentStyle:{backgroundColor:theme.background}}}>
              <Stack.Screen name="index"/>
              <Stack.Screen name="login"/>
              <Stack.Screen name="auth/callback"/>
              <Stack.Protected guard={!!user&&!validationError} redirectTo="/login">
                {PRIVATE_SCREENS.map(name=>
                  <Stack.Screen key={name} name={name}/>)}
              </Stack.Protected>
            </Stack>
          </View>
          {!desktop&&!!user&&!validationError?<Nav placement="root"/>:null}
        </View>
        {desktop&&!!user&&!validationError?<Nav placement="desktop"/>:null}
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
                <SharedMusicNavigationProvider><ThemedStack /></SharedMusicNavigationProvider>
              </MusicWorkspaceProvider>
            </DreamProvider>
          </Provider>
        </AuthProvider>
      </LocaleProvider>
    </AppThemeProvider>
  );
}
