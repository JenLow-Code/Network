import React, { useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';
import type { PublishedSemence } from './SemencePublishActions';
import PublishedSemenceCard from './PublishedSemenceCard';

/** Only server-confirmed published snapshots are shown; private local drafts never appear here. */
export default function SemenceSharesFeed({mine=false,handle,publicOnly=false,
  withHeading=false,onCountChange}:{
 mine?:boolean;handle?:string;publicOnly?:boolean;withHeading?:boolean;
 onCountChange?:(count:number)=>void;
}){
 const theme=useAppTheme();
 const {width}=useWindowDimensions();
 const [items,setItems]=useState<PublishedSemence[]>([]);
 useFocusEffect(React.useCallback(()=>{
   let mounted=true;
   const endpoint=mine?'/api/me/semence-shares':
     handle?'/api/users/'+encodeURIComponent(handle)+'/semence-shares':null;
   if(!endpoint)return;
   setItems([]);
   void api<{items:PublishedSemence[]}>(endpoint,{auth:mine?'required':'optional'})
     .then(result=>{if(mounted)setItems(result.items||[]);})
     .catch(()=>{if(mounted)setItems([]);});
   return ()=>{mounted=false;};
 },[mine,handle]));
 const visible=publicOnly?items.filter(x=>x.visibility==='public'):items;
 useEffect(()=>{onCountChange?.(visible.length);},[visible.length,onCountChange]);
 if(!visible.length)return null;
 const contentWidth=Math.min(width-36,860);
 const count=contentWidth<560?2:3;
 const cellWidth=Math.floor((contentWidth-10*(count-1))/count);
 return <View style={{gap:10,marginBottom:14}}>
   {withHeading?<Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>
     Semences publiées
   </Text>:null}
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'flex-start'}}>
     {visible.map(item=><PublishedSemenceCard key={item.id} item={item}
       width={cellWidth} onPress={()=>router.push({pathname:'/semence-share/[id]',
         params:{id:item.id}})}/>)}
   </View>
 </View>;
}
