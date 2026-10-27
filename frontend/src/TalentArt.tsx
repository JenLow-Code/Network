import React from 'react';
import Svg,{Circle,Path,Line,Ellipse} from 'react-native-svg';
export function TalentArt({kind='guitar',size=110}:{kind?:'guitar'|'drums'|'camera';size?:number}){
 return <Svg width={size} height={size} viewBox="0 0 120 120">
  <Circle cx="60" cy="60" r="58" fill="#FF2B59"/>
  {kind==='guitar'?<>
   <Circle cx="38" cy="35" r="13" stroke="#161616" strokeWidth="2" fill="none"/>
   <Path d="M36 49C19 61 22 87 31 98M41 49C55 57 49 72 62 79" stroke="#161616" strokeWidth="2" fill="none"/>
   <Ellipse cx="71" cy="81" rx="24" ry="13" stroke="#161616" strokeWidth="2" fill="none" transform="rotate(-25 71 81)"/>
   <Line x1="51" y1="76" x2="104" y2="44" stroke="#161616" strokeWidth="3"/>
   <Line x1="45" y1="82" x2="98" y2="50" stroke="#161616" strokeWidth="1"/>
  </>:kind==='drums'?<>
   <Circle cx="36" cy="31" r="12" fill="none" stroke="#161616" strokeWidth="2"/>
   <Path d="M37 44L46 69L71 81M39 53L20 71M49 58L86 41M44 65L87 97" stroke="#161616" strokeWidth="2" fill="none"/>
   <Ellipse cx="54" cy="90" rx="20" ry="12" stroke="#161616" strokeWidth="2" fill="none"/>
   <Ellipse cx="95" cy="70" rx="19" ry="9" stroke="#161616" strokeWidth="2" fill="none"/>
   <Line x1="55" y1="57" x2="94" y2="40" stroke="#161616" strokeWidth="2"/>
  </>:<>
   <Path d="M20 48H38L44 40H73L80 48H100V88H20Z" fill="none" stroke="#161616" strokeWidth="2.5"/>
   <Circle cx="60" cy="68" r="18" stroke="#161616" strokeWidth="2.5" fill="none"/>
   <Circle cx="60" cy="68" r="8" stroke="#161616" strokeWidth="2" fill="none"/>
   <Circle cx="89" cy="56" r="3" fill="#161616"/>
  </>}
 </Svg>;
}
