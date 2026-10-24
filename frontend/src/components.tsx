import React from 'react';
import {Image,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,usePathname} from 'expo-router';
import {colors as c} from './theme';
export function Avatar({size=42}:{size?:number}){return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#E8E8E8',alignItems:'center',justifyContent:'center'}}><Ionicons name="person" color="#777" size={size*.58}/></View>}
export function Pill({text,active=false,onPress}:{text:string,active?:boolean,onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:active?'#000':'#e8e8e8',borderRadius:22,backgroundColor:active?'#000':'#fff'}}><Text style={{color:active?'#fff':'#111',fontSize:12}}>{text}</Text></Pressable>}
export function Nav(){const path=usePathname();return <View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eee',backgroundColor:'#fff',justifyContent:'space-around',paddingVertical:13}}>{([{icon:'home',path:'/space'},{icon:'search',path:'/space'},{icon:'swap-horizontal',path:'/space'},{icon:'person-circle',path:'/profile'}] as const).map((x,i)=><Pressable accessibilityLabel={['Home','Search','My Space','Profile'][i]} key={i} onPress={()=>router.replace(x.path)} style={{padding:3,alignItems:'center',minWidth:55}}><Ionicons name={x.icon} size={25} color={i===2?'#b5b5b5':i===0?'#090909':path===x.path?c.pink:'#121212'}/></Pressable>)}</View>}
