import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';
import type { PublishedSemence } from './SemencePublishActions';

export default function SemenceSharesFeed({mine=false,handle,publicOnly=false}:{
 mine?:boolean;handle?:string;publicOnly?:boolean;
}){
 const theme=useAppTheme();
 const [items,setItems]=useState<PublishedSemence[]>([]);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
   let mounted=true;
   const endpoint=mine?'/api/me/semence-shares':
     handle?'/api/users/'+encodeURIComponent(handle)+'/semence-shares':null;
   if(!endpoint)return;
   setItems([]);setFailed(false);
   void api<{items:PublishedSemence[]}>(endpoint,{auth:mine?'required':'optional'})
     .then(result=>{if(mounted)setItems(result.items||[]);})
     .catch(()=>{if(mounted)setFailed(true);});
   return ()=>{mounted=false;};
 },[mine,handle]);
 const visible=publicOnly?items.filter(x=>x.visibility==='public'):items;
 if(!visible.length)return null;
 return <View style={{gap:12,marginVertical:16}}>
   <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>
     Semences publiées
   </Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
     {visible.map(item=><Pressable key={item.id} accessibilityRole="button"
       accessibilityLabel={'Voir la Semence '+item.title}
       onPress={()=>router.push({pathname:'/semence-share/[id]',params:{id:item.id}})}
       style={{width:'48%',minHeight:163,borderRadius:12,overflow:'hidden',
         backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border}}>
       {!!item.coverUrl?<Image source={{uri:item.coverUrl}} resizeMode="cover"
         style={{height:82,width:'100%',opacity:0.76}}/>:
         <View style={{height:64,alignItems:'center',justifyContent:'center'}}>
           <Ionicons name="leaf-outline" size={23} color="#B88962"/>
         </View>}
       <View style={{padding:11,gap:6}}>
         <Text style={{fontSize:13,fontWeight:'700',lineHeight:18,
           color:theme.foreground}} numberOfLines={3}>{item.title}</Text>
         <Text style={{fontSize:10,color:theme.muted}}>
           {item.visibility==='public'?'Public sur mon profil':'Réservé à mes amis'}
         </Text>
       </View>
     </Pressable>)}
   </View>
 </View>;
}
