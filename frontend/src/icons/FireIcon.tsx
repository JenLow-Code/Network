import React from 'react';
import {Ionicons} from '@expo/vector-icons';
export function FireIcon({size=24,active=false}:{size?:number;active?:boolean}){
 return <Ionicons name={active?'flame':'flame-outline'} size={size} color={active?'#CB245C':'#252525'}/>;
}
