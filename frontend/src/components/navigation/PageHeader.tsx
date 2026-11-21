import React from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TopActions } from './TopActions';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';

/** Shared inside-page navigation. Discovery is the landing page and deliberately has no Back button. */
export function PageHeader({ title, center, onBack, showFire = true }: {
 title?: string;
 center?: React.ReactNode;
 onBack?: () => void;
 showFire?: boolean;
}) {
 const theme = useAppTheme();
 const {width}=useWindowDimensions();
 const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
 return (
  <View style={{minHeight:desktop?48:44,flexDirection:'row',alignItems:'center',
    width:'100%',zIndex:4,position:'relative'}}>
   <Pressable
    onPress={onBack || (()=>router.canGoBack()?router.back():router.replace('/discover'))}
    accessibilityRole="button" accessibilityLabel="Retour"
    style={{width:44,height:44,alignItems:'flex-start',justifyContent:'center'}}>
    <Ionicons name="arrow-back-outline" size={23} color={theme.foreground}/>
   </Pressable>
   {desktop&&center
    ? <View pointerEvents="box-none" style={{
        position:'absolute',left:0,right:0,top:0,bottom:0,
        alignItems:'center',justifyContent:'center'}}>
        {center}
      </View>
    : <View style={{flex:1,minWidth:0,justifyContent:'center',paddingRight:12}}>
        {title?<Text numberOfLines={1} style={{color:theme.foreground,fontWeight:'700',
          fontSize:desktop?24:21,lineHeight:desktop?32:28,letterSpacing:-0.4}}>{title}</Text>:null}
        {center||null}
      </View>}
   <TopActions showFire={showFire}/>
  </View>
 );
}
