import React from 'react';
import Svg,{Path} from 'react-native-svg';

/** Two overlapping conversations: filled rear bubble, outlined front bubble. */
export function MessageIcon({size=26,color='#181818'}:{size?:number;color?:string}){
 return <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityLabel="Messages">
  <Path d="M9 11H36Q43 11 43 18V32Q43 39 36 39H22L14 46V39H9Q4 39 4 32V18Q4 11 9 11Z" fill={color}/>
  <Path d="M28 28H51Q59 28 59 36V46Q59 54 51 54H42L35 61V54H28Q21 54 21 46V36Q21 28 28 28Z" fill="#fff" stroke={color} strokeWidth={3} strokeLinejoin="round"/>
 </Svg>;
}
