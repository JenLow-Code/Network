import React from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';

/** Five durable destinations. Fire and Messages live in the global header. */
export function Nav() {
  const theme = useAppTheme();
  const path = usePathname();
  const { t } = useLocale();
  const links = [
    {
      icon: 'calendar-outline' as const, title: t('agenda'),
      path: '/agenda' as const,
      active: path === '/agenda' || path === '/prayers',
    },
    {
      icon: 'musical-note-outline' as const, title: t('music'),
      path: '/music-hub' as const,
      active: path === '/music-hub' || path.startsWith('/publish/music') || path.startsWith('/music-proposal/'),
    },
    {
      icon: 'ellipse-outline' as const, title: t('discover'),
      path: '/discover' as const,
      active: path === '/discover' || path.startsWith('/dream/') ||
        path.startsWith('/bible/') || path.startsWith('/person/') ||
        path.startsWith('/music/'),
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
  const glass = theme.dark ? 'rgba(30,35,39,0.73)' : 'rgba(246,251,252,0.69)';
  const glassEffect = Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' } as any)
    : {};
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: glass,
      borderTopWidth: 0.8, borderTopColor: theme.dark ? 'rgba(255,255,255,0.23)' : 'rgba(255,255,255,0.93)',
      justifyContent: 'space-around',
      paddingTop: 9, paddingBottom: 9,
      shadowColor: theme.dark ? '#9AAAB5' : '#83B5C8', shadowOpacity: 0.14,
      shadowRadius: 12, shadowOffset: { width: 0, height: -5 },
      elevation: 5, zIndex: 20,
      ...glassEffect,
    }}>
      {/* A thin water-like reflection, not a heavy opaque border. */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 2, left: 19, right: 19, height: 1,
        backgroundColor: theme.dark ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.64)',
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
