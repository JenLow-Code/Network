import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {DetailLayout} from './DetailLayout';
import type {Publication} from './discoveryData';
export function DetailPanel({title,children,foldable=false,defaultOpen=true}:{title:string;children:React.ReactNode;foldable?:boolean;defaultOpen?:boolean}){
 const [open,setOpen]=useState(defaultOpen);
 return <View style={{borderTopWidth:1,borderColor:'rgba(60,60,60,0.13)',paddingVertical:10,paddingLeft:7}}>
  <Pressable disabled={!foldable} onPress={()=>setOpen(v=>!v)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5}}>
   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{fontWeight:'600',fontSize:15,color:'#262626',flexShrink:1}}>{title}</Text>
   {foldable?<Ionicons name={open?'chevron-up':'chevron-down'} size={17} color="#333"/>:null}
  </Pressable>
  {open?<View style={{marginTop:5}}>{children}</View>:null}
 </View>;
}
export function PublicationDetail({item,children,media,headerIcon}:{item:Publication;children:React.ReactNode;media?:React.ReactNode;headerIcon?:React.ReactNode;onImageDoubleTap?:()=>void}){
 return <DetailLayout item={item} featured={media} headerIcon={headerIcon}>{children}</DetailLayout>;
}
