import React,{useEffect,useState} from 'react';
import {Image,Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import {useAppTheme} from '@/theme/AppTheme';
export type MusicMemberIdentity={displayName:string;handle?:string|null;avatarUrl?:string|null;demo?:boolean;self?:boolean};
export function MusicMemberLink({person,size=27,subtitle,width}:{person:MusicMemberIdentity;size?:number;subtitle?:string;width?:number}){
  const theme=useAppTheme();const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[person.avatarUrl]);
  const open=()=>{if(person.self)router.push('/profile');else if(person.handle)router.push({pathname:'/member/[name]',params:{name:person.handle,...(person.demo?{demo:'1'}:{})}});};
  const content=<><View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',flexShrink:0,alignItems:'center',justifyContent:'center',backgroundColor:theme.dark?'#422C36':'#F7E8EF'}}>
    {person.avatarUrl&&!failed?<Image source={{uri:person.avatarUrl}} onError={()=>setFailed(true)} style={{width:size,height:size,borderRadius:size/2}}/>:<Text style={{fontWeight:'700',fontSize:size*.43,color:theme.foreground}}>{person.displayName.trim().charAt(0).toLocaleUpperCase('fr')||'?'}</Text>}
  </View><View style={{flex:1,minWidth:0,gap:3}}><Text numberOfLines={2} style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>{person.displayName}</Text>{subtitle?<Text style={{fontSize:11,color:theme.muted}}>{subtitle}</Text>:null}</View></>;
  const style={width,flexDirection:'row' as const,alignItems:'center' as const,gap:7,minHeight:Math.max(size,34)};
  return person.self||person.handle?<Pressable accessibilityRole="button" accessibilityLabel={'Voir le profil de '+person.displayName} onPress={open} style={style}>{content}</Pressable>:<View style={style}>{content}</View>;
}
