import React from 'react';
import {Image,Pressable,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
import {useLocale} from '@/i18n/locale';
import {useAppTheme} from '@/theme/AppTheme';

/** Bottom tab bar shown on the main screens. */
export function Nav(){const theme=useAppTheme();const path=usePathname();const {t}=useLocale();const links=[
 {icon:'calendar-outline' as const,title:t('agenda'),path:'/agenda' as const,active:path==='/agenda'||path==='/prayers'},
 {icon:'musical-note-outline' as const,title:t('music'),path:'/music-hub' as const,active:path.startsWith('/music')||path.startsWith('/publish/')},
 {icon:'ellipse-outline' as const,title:t('discover'),path:'/discover' as const,active:path==='/discover'||path.startsWith('/dream/')||path.startsWith('/bible/')||path.startsWith('/person/')},
 {icon:'flame-outline' as const,title:'Fire',path:'/fire' as const,active:path==='/fire'},
 {icon:'person-circle-outline' as const,title:'Mon espace',path:'/my-space' as const,active:path==='/my-space'||path.startsWith('/my-dream')||path==='/profile'||path==='/settings'||path==='/space'||path.startsWith('/chat/')}
 ];return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:theme.surface,justifyContent:'space-around',paddingTop:9,paddingBottom:9}}>{links.map((x,i)=><Pressable key={i} accessibilityLabel={x.title} onPress={()=>router.replace(x.path)} style={{minWidth:48,minHeight:35,alignItems:'center',justifyContent:'center'}}>{x.path==='/fire'?<Ionicons name={x.active?'flame':'flame-outline'} size={24} color={x.active?'#CB245C':theme.foreground}/>:x.path==='/discover'?<View style={{width:15,height:15,borderRadius:8,borderWidth:x.active?0:2,borderColor:theme.foreground,backgroundColor:x.active?'#CB245C':'transparent'}}/>:x.path==='/my-space'?<Image source={{uri:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=75'}} style={{width:28,height:28,borderRadius:14,borderWidth:x.active?2:1,borderColor:x.active?'#CB245C':'#bbb'}}/>:<Ionicons name={x.path==='/agenda'&&x.active?'calendar':x.path==='/music-hub'&&x.active?'musical-note':x.icon} size={24} color={x.active?'#CB245C':theme.foreground}/>}</Pressable>)}</View>}
