import React from 'react';
import Svg,{Path} from 'react-native-svg';
export function PrayerIcon({size=24,muted=false,active=false}:{size?:number;muted?:boolean;active?:boolean}){
 const color=active?'#CB245C':muted?'#999':'#252525';
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
  <Path d="M12 21V12M12 12L8 4C7.3 2.5 5.8 3.2 6.2 5L8.3 12M12 12L16 4C16.7 2.5 18.2 3.2 17.8 5L15.7 12M8.3 12L5.4 9.5C4.1 8.3 3 9.4 3.8 11L8 17.5L12 21L16 17.5L20.2 11C21 9.4 19.9 8.3 18.6 9.5L15.7 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill={active?'#FBE6ED':'none'}/>
 </Svg>;
}
