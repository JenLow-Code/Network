import React,{useState} from 'react';
import {Image,View,StyleSheet,Text} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Rect,Path,Circle} from 'react-native-svg';
export function OfflineDreamImage({uri,height=190,label='Dream image',radius=12}:{uri?:string;height?:number;label?:string;radius?:number}){
 const [failed,setFailed]=useState(false);
 return <View style={{height,borderRadius:radius,overflow:'hidden',backgroundColor:'#e8e9e7'}}>
  <Svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
   <Defs><LinearGradient id="offlineGradient" x1="0" x2="1" y1="0" y2="1"><Stop offset="0" stopColor="#dbe5dc"/><Stop offset=".48" stopColor="#f0e9e0"/><Stop offset="1" stopColor="#e7d5de"/></LinearGradient></Defs>
   <Rect width="320" height="190" fill="url(#offlineGradient)"/>
   <Circle cx="246" cy="43" r="26" fill="#ffffff" opacity=".45"/>
   <Path d="M0 161 Q60 101 134 153 Q220 96 320 151 L320 190 L0 190Z" fill="#94b69b" opacity=".30"/>
  </Svg>
  {uri&&!failed?<Image source={{uri}} onError={()=>setFailed(true)} resizeMode="cover" accessibilityLabel={label} style={StyleSheet.absoluteFillObject}/>:null}
 </View>;
}
