import React from 'react';
import Svg,{Circle,Path} from 'react-native-svg';

type Props={size?:number;muted?:boolean};
/** Original, simplified praying-hands symbol, shaped to sit beside the JenLow Fire icon. */
export function PrayerIcon({size=26,muted=false}:Props){
 const magenta=muted?'#777777':'#D71D77';
 return <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityLabel="Prière">
  <Circle cx="32" cy="32" r="31" fill={muted?'#f1f1f1':'#F7E9F0'}/>
  <Path d="M29.8 11.8C26.1 16 24.3 21.9 23.5 28.2L19.7 34.3C17.3 38.2 18.2 42.2 21.7 45.2L26.6 49V53H31V31.2C31 23.6 31.7 16.6 29.8 11.8Z" fill={magenta}/>
  <Path d="M34.2 11.8C37.9 16 39.7 21.9 40.5 28.2L44.3 34.3C46.7 38.2 45.8 42.2 42.3 45.2L37.4 49V53H33V31.2C33 23.6 32.3 16.6 34.2 11.8Z" fill={magenta}/>
  <Path d="M19.5 39.3L26.8 44.5M44.5 39.3L37.2 44.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
  <Path d="M27.1 50.4H30.6M33.4 50.4H36.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".65"/>
 </Svg>;
}