import React from 'react';
import Svg,{Circle,Path} from 'react-native-svg';
/** Kneeling/praying figure, outline until activated. */
export function PrayerIcon({size=24,muted=false,active=false}:{size?:number;muted?:boolean;active?:boolean}){
 const color=active?'#CB245C':muted?'#999':'#252525';
 return <Svg width={size} height={size} viewBox="0 0 32 32" fill={active?'#CB245C':'none'}>
  <Circle cx="14.3" cy="6.1" r="4.1" stroke={color} strokeWidth="2.3"/>
  <Path d="M12.2 11.4L7.4 20.1L12.5 25.7H5.8C3.4 25.7 3 29 6 29H22.5C25.4 29 25.6 26 23.8 24.2L18.5 18L21 13.3L25 17V22.6C25 25 28.3 25 28.3 22.6V14.4C28.3 13.1 27.6 12.2 26.5 11.5L21.6 8.7C19.6 7.5 18.3 9.1 17.9 10.7L15.8 15.8L13.4 13.7" stroke={color} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round"/>
 </Svg>;
}
