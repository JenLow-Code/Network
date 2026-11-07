import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TopActions } from './TopActions';
import { useAppTheme } from '@/theme/AppTheme';

/** Shared inside-page navigation. Discovery is the landing page and deliberately has no Back button. */
export function PageHeader({ title, onBack, showFire = true }: {
 title?: string;
 onBack?: () => void;
 showFire?: boolean;
}) {
 const theme = useAppTheme();
 return (
  <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
   <Pressable
    onPress={onBack || (() => router.canGoBack() ? router.back() : router.replace('/discover'))}
    accessibilityRole="button" accessibilityLabel="Retour"
    style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
     <Ionicons name="arrow-back-outline" size={23} color={theme.foreground} />
   </Pressable>
   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
    {title ? <Text numberOfLines={1} style={{
      color: theme.muted, fontWeight: '700', fontSize: 10, letterSpacing: 1.5,
    }}>{title.toUpperCase()}</Text> : null}
   </View>
   <TopActions showFire={showFire}/>
  </View>
 );
}
