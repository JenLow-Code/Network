import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
import {useLocale} from './locale';
import {FireIcon} from './FireIcon';
import {View as RNView} from 'react-native';
import {MessageIcon} from './MessageIcon';
export function Avatar({size=42}:{size?:number}){return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#e8e8e8',alignItems:'center',justifyContent:'center'}}><Ionicons name="person" color="#777" size={size*.58}/></View>}
export function Pill({text,active=false,onPress}:{text:string,active?:boolean,onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:active?'#000':'#e8e8e8',borderRadius:22,backgroundColor:active?'#000':'#fff'}}><Text style={{color:active?'#fff':'#111',fontSize:12}}>{text}</Text></Pressable>}
export function TopActions(){return <Pressable accessibilityLabel="Messages" onPress={()=>router.push('/space')} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><MessageIcon size={25}/></Pressable>}
export function Nav(){const path=usePathname();const {t}=useLocale();const links=[
 {icon:'calendar-outline' as const,title:t('agenda'),path:'/agenda' as const,active:path==='/agenda'||path==='/prayers'},
 {icon:'musical-note-outline' as const,title:t('music'),path:'/music-hub' as const,active:path.startsWith('/music')||path.startsWith('/publish/')},
 {icon:'radio-button-off' as const,title:t('discover'),path:'/discover' as const,active:path==='/discover'||path.startsWith('/dream/')||path.startsWith('/bible/')||path.startsWith('/person/')},
 {icon:'flame-outline' as const,title:'Fire',path:'/fire' as const,active:path==='/fire'},
 {icon:'person-circle-outline' as const,title:'Mon espace',path:'/my-space' as const,active:path==='/my-space'||path.startsWith('/my-dream')||path==='/profile'||path==='/settings'||path==='/space'||path.startsWith('/chat/')}
 ];return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:'#fff',justifyContent:'space-around',paddingTop:9,paddingBottom:9}}>{links.map((x,i)=><Pressable key={i} accessibilityLabel={x.title} onPress={()=>router.replace(x.path)} style={{minWidth:48,minHeight:35,alignItems:'center',justifyContent:'center'}}>{x.path==='/fire'?<FireIcon size={24} active={x.active}/>:x.path==='/my-space'?<Avatar size={27}/>:<Ionicons name={x.active?(x.path==='/agenda'?'calendar':x.path==='/my-space'?'person-circle':x.path==='/discover'?'radio-button-on':x.path==='/music-hub'?'musical-note':x.icon):x.path==='/my-dreams'?'ellipse-outline':x.icon} size={24} color="#252525"/>}</Pressable>)}</View>}
