import React from 'react';
import Svg,{Ellipse,Path} from 'react-native-svg';

/** Sprouting seed mark based on the approved sprout reference. */
export function SeedIcon({size=28}:{size?:number}){
 return <Svg width={size} height={size} viewBox="0 0 64 64">
  <Ellipse cx="32" cy="43" rx="23" ry="15" fill="#F8AF80" transform="rotate(-21 32 43)"/>
  <Path d="M26 38C32 29 36 22 36 10" fill="none" stroke="#70BD11" strokeWidth="3.8" strokeLinecap="round"/>
  <Path d="M36 23C19 22 20 10 30 5C34 4 36 12 36 23Z" fill="#4DB900"/>
  <Path d="M35 27C42 15 54 14 57 17C54 28 43 33 35 27Z" fill="#7EE323"/>
  <Path d="M37 29C30 34 22 34 18 30" fill="none" stroke="#7FCF28" strokeWidth="2.5" strokeLinecap="round"/>
 </Svg>;
}
