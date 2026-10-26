import React from 'react';
import {Ionicons} from '@expo/vector-icons';
/** Consistent monochrome outline; magenta fill when prayer is saved. */
export function PrayerIcon({size=24,muted=false,active=false}:{size?:number;muted?:boolean;active?:boolean}){
 return <Ionicons name={active?'heart':'heart-outline'} size={size} color={active?'#CB245C':muted?'#999':'#252525'}/>;
}
