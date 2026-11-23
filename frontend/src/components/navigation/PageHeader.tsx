import React from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TopActions } from './TopActions';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout,DESKTOP_PAGE_CONTENT_INSET,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';

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
    style={{width:44,height:44,alignItems:'center',justifyContent:'center',
      position:'absolute',left:desktop?-DESKTOP_PAGE_CONTENT_INSET:0,
      top:desktop?2:0,zIndex:6}}>
    <Ionicons name="arrow-back-outline" size={23} color={theme.foreground}/>
   </Pressable>
   {desktop&&center
    ? <View pointerEvents="box-none" style={{
        position:'absolute',left:0,right:0,top:0,bottom:0,
        alignItems:'center',justifyContent:'center'}}>
        {center}
      </View>
    : <View style={{flex:1,minWidth:0,justifyContent:'center',
          paddingLeft:desktop?0:52,paddingRight:12}}>
        {title?<Text numberOfLines={1} style={{color:theme.foreground,fontWeight:'700',
          fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,
          letterSpacing:-0.35}}>{title}</Text>:null}
        {center||null}
      </View>}
   {/* Preserve the right-side actions in the normal row flow while the
       desktop tabs are centered independently in an absolute overlay. */}
   {desktop&&center?<View style={{flex:1,minWidth:0}}/>:null}
   <TopActions showFire={showFire}/>
  </View>
 );
}
