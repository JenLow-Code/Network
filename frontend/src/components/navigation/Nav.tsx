import React from 'react';
import { Image, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';

/** Five durable destinations. Fire and Messages live in the global header. */
export function Nav() {
  const theme = useAppTheme();
  const path = usePathname();
  const { t } = useLocale();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&width>=1100;
  const links = [
    {
      icon: 'calendar-outline' as const, title: t('agenda'),
      path: '/agenda' as const,
      active: path === '/agenda' || path === '/prayers',
    },
    {
      icon: 'musical-note-outline' as const, title: t('music'),
      path: '/music-hub' as const,
      active: path === '/music-hub' || path.startsWith('/publish/music') ||
        path.startsWith('/music-proposal/') || path === '/music/new' || path.startsWith('/music-workspace/') ||
        path.startsWith('/music-collaboration/'),
    },
    {
      icon: 'ellipse-outline' as const, title: t('discover'),
      path: '/discover' as const,
      active: path === '/discover' || path.startsWith('/dream/') ||
        path.startsWith('/bible/') || path.startsWith('/person/') ||
        (path.startsWith('/music/') && path !== '/music/new'),
    },
    {
      icon: 'layers-outline' as const, title: 'Mes rêves',
      path: '/my-space' as const,
      active: path === '/my-space' || path === '/my-dreams' || path.startsWith('/my-dream'),
    },
    {
      icon: 'person-circle-outline' as const, title: 'Mon profil',
      path: '/profile' as const,
      active: path === '/profile' || path === '/settings',
    },
  ];
  const foreground = theme.foreground;
  const webFrost = Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(30px) saturate(190%)', WebkitBackdropFilter: 'blur(30px) saturate(190%)' } as any)
    : {};
  // Desktop navigation is a right-hand dock, never a stretched mobile tab bar.
  // On phones and narrow screens the original bottom navigation remains intact.
  if(desktop)return (
    <View accessibilityRole="navigation" style={{
      position:'absolute',right:18,top:'50%',zIndex:30,
      transform:[{translateY:-227}],
      width:94,borderRadius:27,overflow:'hidden',
      borderWidth:1,
      borderColor:theme.dark?'rgba(221,241,250,.22)':'rgba(255,255,255,.85)',
      backgroundColor:theme.dark?'rgba(28,36,44,.72)':'rgba(245,249,250,.73)',
      paddingVertical:13,paddingHorizontal:9,gap:5,
      shadowColor:theme.dark?'#000000':'#647F86',
      shadowOpacity:.14,shadowRadius:22,
      shadowOffset:{width:-3,height:6},elevation:9,
      ...webFrost,
    }}>
      <BlurView pointerEvents="none" intensity={65}
        tint={theme.dark?'systemUltraThinMaterialDark':'systemUltraThinMaterialLight'}
        style={{position:'absolute',top:0,right:0,left:0,bottom:0}}/>
      {links.map(x=><Pressable key={x.path}
        onPress={()=>router.replace(x.path)}
        accessibilityRole="button" accessibilityLabel={x.title}
        accessibilityState={{selected:x.active}}
        style={{height:75,borderRadius:18,alignItems:'center',
          justifyContent:'center',gap:5,position:'relative',
          backgroundColor:x.active?
            (theme.dark?'rgba(203,36,92,.19)':'rgba(203,36,92,.085)'):
            'transparent'}}>
        {x.active?<View pointerEvents="none" style={{
          position:'absolute',left:0,top:18,bottom:18,width:3,
          backgroundColor:'#CB245C',borderRadius:3}}/>:null}
        {x.path==='/discover'?
          <View style={{width:16,height:16,borderRadius:8,
            borderWidth:x.active?0:2,
            borderColor:theme.foreground,
            backgroundColor:x.active?'#CB245C':'transparent'}}/>:
        x.path==='/profile'?
          <Image source={{uri:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=75'}}
            style={{width:27,height:27,borderRadius:14,
              borderWidth:x.active?2:1,
              borderColor:x.active?'#CB245C':'#B2B8B9'}}/>:
          <Ionicons name={
            x.path==='/agenda'&&x.active?'calendar':
            x.path==='/music-hub'&&x.active?'musical-note':
            x.path==='/my-space'&&x.active?'layers':x.icon
          } size={25} color={x.active?'#CB245C':foreground}/>}
        <Text numberOfLines={1} style={{fontSize:10,
          fontWeight:x.active?'700':'500',
          color:x.active?'#CB245C':theme.muted}}>
          {x.title}
        </Text>
      </Pressable>)}
    </View>
  );
  // A real translucent overlay: the page can remain visible and scroll behind it.
  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 11, paddingBottom: 10,
      minHeight: 60, zIndex: 30,
      overflow: 'hidden',
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      backgroundColor: theme.dark ? 'rgba(18,29,38,0.10)' : 'rgba(239,248,251,0.10)',
      borderTopWidth: 1,
      borderColor: theme.dark ? 'rgba(221,241,250,0.26)' : 'rgba(255,255,255,0.84)',
      shadowColor: theme.dark ? '#A4D5ED' : '#7FB5C9',
      shadowOpacity: 0.21, shadowRadius: 18,
      shadowOffset: { width: 0, height: -5 }, elevation: 8,
      ...webFrost,
    }}>
      <BlurView
        pointerEvents="none"
        intensity={Platform.OS === 'ios' ? 74 : 63}
        tint={theme.dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
        // On Android 12+ native blur requires a BlurTargetView; the web/iOS
        // path blurs content directly while Android keeps a translucent surface.
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}
      />
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
        <Defs>
          <LinearGradient id="nav-water" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={theme.dark ? '#CDEFFA' : '#FFFFFF'} stopOpacity={theme.dark ? .16 : .59} />
            <Stop offset=".22" stopColor={theme.dark ? '#8BBCCB' : '#D7EFF6'} stopOpacity={.11}/>
            <Stop offset=".75" stopColor={theme.dark ? '#304F60' : '#DEEDF0'} stopOpacity={.07}/>
            <Stop offset="1" stopColor={theme.dark ? '#7897AA' : '#B5D9E2'} stopOpacity={.18}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#nav-water)"/>
      </Svg>
      <View pointerEvents="none" style={{
        position: 'absolute', top: 2, left: 24, right: 24, height: 1,
        backgroundColor: theme.dark ? 'rgba(255,255,255,0.27)' : 'rgba(255,255,255,0.85)',
      }} />
      {links.map(x => (
        <Pressable
          key={x.path}
          accessibilityRole="button"
          accessibilityLabel={x.title}
          accessibilityState={{ selected: x.active }}
          onPress={() => router.replace(x.path)}
          style={{ minWidth: 48, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          {x.path === '/discover' ? (
            <View style={{
              width: 15, height: 15, borderRadius: 8,
              borderWidth: x.active ? 0 : 2, borderColor: foreground,
              backgroundColor: x.active ? '#CB245C' : 'transparent',
            }} />
          ) : x.path === '/profile' ? (
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=75' }}
              style={{
                width: 28, height: 28, borderRadius: 14,
                borderWidth: x.active ? 2 : 1, borderColor: x.active ? '#CB245C' : '#B2B8B9',
              }}
            />
          ) : (
            <Ionicons
              name={
                x.path === '/agenda' && x.active ? 'calendar'
                : x.path === '/music-hub' && x.active ? 'musical-note'
                : x.path === '/my-space' && x.active ? 'layers'
                : x.icon
              }
              size={24}
              color={x.active ? '#CB245C' : foreground}
            />
          )}
        </Pressable>
      ))}
    </View>
  );
}
