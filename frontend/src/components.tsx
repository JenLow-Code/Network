import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
import {colors as c} from './theme';
export function Avatar({size=42}:{size?:number}){return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#E8E8E8',alignItems:'center',justifyContent:'center'}}><Ionicons name="person" color="#777" size={size*.58}/></View>}
export function Pill({text,active=false,onPress}:{text:string,active?:boolean,onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:active?'#000':'#e8e8e8',borderRadius:22,backgroundColor:active?'#000':'#fff'}}><Text style={{color:active?'#fff':'#111',fontSize:12}}>{text}</Text></Pressable>}
export function Nav(){const path=usePathname();
 const links=[
 {icon:'search' as const,title:'Découvrir',path:'/discover' as const,active:path==='/discover'||path.startsWith('/dream/')||path.startsWith('/music/')||path.startsWith('/bible/')},
 {icon:'leaf-outline' as const,title:'Mes rêves',path:'/my-dreams' as const,active:path.startsWith('/my-dreams')||path.startsWith('/my-dream/')},
 {icon:'chatbubbles-outline' as const,title:'My Space',path:'/space' as const,active:path==='/space'||path.startsWith('/chat/')||path==='/agenda'},
 {icon:'person-circle-outline' as const,title:'Profil',path:'/profile' as const,active:path==='/profile'}
 ];
 return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:'#fff',justifyContent:'space-around',paddingTop:10,paddingBottom:9}}>
 {links.map((x,i)=><Pressable key={i} accessibilityLabel={x.title} accessibilityRole="button" onPress={()=>router.replace(x.path)} style={{minWidth:55,minHeight:36,alignItems:'center',justifyContent:'center'}}><Ionicons name={x.icon} size={26} color={x.active?'#171717':'#aaa'}/></Pressable>)}</View>;
}
