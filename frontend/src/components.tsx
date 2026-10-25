import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
export function Avatar({size=42}:{size?:number}){return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#e8e8e8',alignItems:'center',justifyContent:'center'}}><Ionicons name="person" color="#777" size={size*.58}/></View>}
export function Pill({text,active=false,onPress}:{text:string,active?:boolean,onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:active?'#000':'#e8e8e8',borderRadius:22,backgroundColor:active?'#000':'#fff'}}><Text style={{color:active?'#fff':'#111',fontSize:12}}>{text}</Text></Pressable>}
export function Nav(){const path=usePathname();const links=[
 {icon:'search' as const,title:'Découvrir',path:'/discover' as const,active:path==='/discover'||path.startsWith('/dream/')||path.startsWith('/bible/')},
 {icon:'leaf-outline' as const,title:'Mes rêves',path:'/my-dreams' as const,active:path.startsWith('/my-dreams')||path.startsWith('/my-dream/')},
 {icon:'calendar-outline' as const,title:'Agenda',path:'/agenda' as const,active:path==='/agenda'||path==='/prayers'},
 {icon:'musical-notes-outline' as const,title:'Musique',path:'/music-hub' as const,active:path.startsWith('/music')||path.startsWith('/publish/')},
 {icon:'chatbubbles-outline' as const,title:'My Space',path:'/space' as const,active:path==='/space'||path.startsWith('/chat/')||path.startsWith('/share/')||path==='/profile'||path.startsWith('/circle')}
 ];return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:'#fff',justifyContent:'space-around',paddingTop:9,paddingBottom:9}}>{links.map((x,i)=><Pressable key={i} accessibilityLabel={x.title} onPress={()=>router.replace(x.path)} style={{minWidth:48,minHeight:35,alignItems:'center',justifyContent:'center'}}><Ionicons name={x.icon} size={24} color={x.active?'#181818':'#aaa'}/></Pressable>)}</View>}
