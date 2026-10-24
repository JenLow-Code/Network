import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
import {colors as c} from './theme';
export function Avatar({size=42}:{size?:number}){return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#E8E8E8',alignItems:'center',justifyContent:'center'}}><Ionicons name="person" color="#777" size={size*.58}/></View>}
export function Pill({text,active=false,onPress}:{text:string,active?:boolean,onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:active?'#000':'#e8e8e8',borderRadius:22,backgroundColor:active?'#000':'#fff'}}><Text style={{color:active?'#fff':'#111',fontSize:12}}>{text}</Text></Pressable>}
export function Nav(){const path=usePathname();
 const links=[{icon:'home' as const,title:'Découvrir',path:'/discover' as const},{icon:'search' as const,title:'Mes rêves',path:'/my-dreams' as const},{icon:'swap-horizontal' as const,title:'My Space',path:'/space' as const},{icon:'person-circle' as const,title:'Profil',path:'/profile' as const}];
 return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:'#fff',justifyContent:'space-around',paddingVertical:13}}>
 {links.map((x,i)=><Pressable key={i} accessibilityLabel={x.title} onPress={()=>router.replace(x.path)} style={{padding:3,alignItems:'center',minWidth:55}}><Ionicons name={x.icon} size={25} color={path===x.path?'#111':'#aaa'}/></Pressable>)}</View>;}
