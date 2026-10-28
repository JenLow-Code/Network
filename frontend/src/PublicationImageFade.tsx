import React,{useEffect,useId,useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import Svg,{Defs,LinearGradient,Rect,Stop} from 'react-native-svg';

/**
 * Soft photographic fade used only by Dreams and Music.
 * The surrounding detail layout always draws its original phase/neutral gradient,
 * so that remains visible while the image loads or if the image cannot be loaded.
 */
export function PublicationImageFade({uri,background}:{uri:string;background:string}){
 const [loaded,setLoaded]=useState(false);
 const gradientId=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 useEffect(()=>{setLoaded(false)},[uri]);
 if(!uri.trim())return null;
 return <View pointerEvents="none" style={styles.layer}>
  <Image source={{uri}} resizeMode="cover" onLoad={()=>setLoaded(true)} onError={()=>setLoaded(false)}
   style={[StyleSheet.absoluteFillObject,{opacity:loaded?0.65:0}]}/>
  {loaded?<Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
   <Defs><LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
    <Stop offset="0%" stopColor={background} stopOpacity={0.23}/>
    <Stop offset="26%" stopColor={background} stopOpacity={0.50}/>
    <Stop offset="55%" stopColor={background} stopOpacity={0.82}/>
    <Stop offset="85%" stopColor={background} stopOpacity={0.98}/>
    <Stop offset="100%" stopColor={background} stopOpacity={1}/>
   </LinearGradient></Defs>
   <Rect width="100%" height="100%" fill={`url(#${gradientId})`}/>
  </Svg>:null}
 </View>;
}
const styles=StyleSheet.create({
 layer:{position:'absolute',top:0,left:0,right:0,height:300,overflow:'hidden'}
});
