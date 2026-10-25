import React from 'react';
import {Image,View} from 'react-native';
export function FireIcon({size=27}:{size?:number}){
 return <Image source={require('../assets/icons/fire-reference.png')} resizeMode="contain" accessibilityLabel="Fire list" style={{width:size,height:size,borderRadius:size/2}}/>
}
