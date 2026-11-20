import React from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TopActions } from './TopActions';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';

/** Shared inside-page navigation. Discovery is the landing page and deliberately has no Back button. */
export function PageHeader({ title, onBack, showFire = true }: {
 title?: string;
 onBack?: () => void;
 showFire?: boolean;
}) {
 const theme = useAppTheme();
 const {width}=useWindowDimensions();
 const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
 return (
  <View style={{minHeight:desktop?47:44,flexDirection:'row',alignItems:'center',
    justifyContent:'space-between',width:'100%',zIndex:4}}>
   <Pressable
    onPress={onBack || (()=>router.canGoBack()?router.back():router.replace('/discover'))}
    accessibilityRole="button" accessibilityLabel="Retour"
    style={{width:44,height:44,alignItems:'flex-start',justifyContent:'center'}}>
    <Ionicons name="arrow-back-outline" size={23} color={theme.foreground}/>
   </Pressable>
   <View style={{flex:1,minWidth:0,alignItems:'center',justifyContent:'center'}}>
    {title?<Text numberOfLines={1} style={{color:theme.muted,fontWeight:'700',
      fontSize:10,letterSpacing:1.5}}>{title.toUpperCase()}</Text>:null}
   </View>
   <TopActions showFire={showFire}/>
  </View>
 );
}
