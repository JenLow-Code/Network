import React from 'react';
import {Text,View} from 'react-native';
/** Familiar and restrained prayer symbol. Active state uses full color. */
export function PrayerIcon({size=26,muted=false}:{size?:number;muted?:boolean}){
 return <View accessibilityLabel="Prière" style={{width:size,height:size,alignItems:'center',justifyContent:'center',opacity:muted ? 0.5 : 1}}><Text style={{fontSize:size*.8,lineHeight:size}}>{'🙏'}</Text></View>;
}
