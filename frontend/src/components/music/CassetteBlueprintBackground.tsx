import React from 'react';
import {View} from 'react-native';
import Svg, {Circle, G, Line, Path, Rect, Text as SvgText} from 'react-native-svg';
import {useAppTheme} from '@/theme/AppTheme';

/**
 * Decorative, original cassette engineering sketch inspired by orthographic
 * technical drawings. It is intentionally not an image or interactive control.
 * The illustration stays behind the capture rows and never blocks their input.
 */
function Reel({cx,cy}:{cx:number;cy:number}) {
  const angles=Array.from({length:12},(_,index)=>index*Math.PI/6);
  return <G>
    <Circle cx={cx} cy={cy} r={79}/>
    <Circle cx={cx} cy={cy} r={70}/>
    <Circle cx={cx} cy={cy} r={51}/>
    <Circle cx={cx} cy={cy} r={25}/>
    <Circle cx={cx} cy={cy} r={15}/>
    {angles.map((angle,index)=><Line key={index}
      x1={cx+Math.cos(angle)*55} y1={cy+Math.sin(angle)*55}
      x2={cx+Math.cos(angle)*68} y2={cy+Math.sin(angle)*68}/>)}
    {Array.from({length:6},(_,index)=>{
      const a=index*Math.PI/3;
      return <Path key={index} d={`M ${cx+Math.cos(a)*26} ${cy+Math.sin(a)*26}
        L ${cx+Math.cos(a)*47} ${cy+Math.sin(a)*47}`}/>;
    })}
  </G>;
}

function Screw({x,y}:{x:number;y:number}){
  return <G>
    <Circle cx={x} cy={y} r={10}/>
    <Circle cx={x} cy={y} r={6}/>
    <Line x1={x-5} y1={y-5} x2={x+5} y2={y+5}/>
    <Line x1={x-5} y1={y+5} x2={x+5} y2={y-5}/>
  </G>;
}

export function CassetteBlueprintBackground({desktop=true}:{
  desktop?:boolean;
}){
  const theme=useAppTheme();
  // On phones, the drawing would compete with names and waveforms.
  if(!desktop)return null;
  const ink=theme.dark?'#DDCEC9':'#8A736E';
  return <View pointerEvents="none"
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={{position:'absolute',top:0,bottom:0,
      left:0,right:0,overflow:'hidden',zIndex:0}}>
    <Svg width="100%" height="100%" viewBox="0 0 1080 690"
      preserveAspectRatio="xMidYMid meet">
      <G fill="none" stroke={ink} strokeWidth={1.15}
        strokeLinecap="round" strokeLinejoin="round"
        opacity={theme.dark?0.16:0.19}>
        {/* Upper shell, lifted from the body like a technical exploded view. */}
        <Path d="M241 35 L828 35 Q845 35 853 50
          L905 200 Q909 212 895 216 L184 216
          Q169 216 174 200 L219 54 Q226 35 241 35 Z"/>
        <Path d="M249 51 L816 51 L879 198 L200 198 Z"/>
        <Path d="M270 70 L789 70 L839 178 L233 178 Z"/>
        <Rect x={411} y={93} width={260} height={52} rx={5}/>
        <Line x1={432} y1={107} x2={650} y2={107}/>
        <Line x1={432} y1={132} x2={650} y2={132}/>
        <Circle cx={355} cy={137} r={36}/>
        <Circle cx={711} cy={137} r={36}/>
        <Circle cx={355} cy={137} r={22}/>
        <Circle cx={711} cy={137} r={22}/>
        <Screw x={212} y={197}/>
        <Screw x={873} y={197}/>
        <Screw x={245} y={57}/>
        <Screw x={824} y={57}/>
        {/* Dashed exploded assembly guides. */}
        <G strokeDasharray="6 10" strokeWidth={0.9} opacity={0.7}>
          <Line x1={212} y1={218} x2={212} y2={262}/>
          <Line x1={873} y1={218} x2={873} y2={262}/>
          <Line x1={355} y1={174} x2={355} y2={347}/>
          <Line x1={711} y1={174} x2={711} y2={347}/>
        </G>
        {/* Cassette body: precision case, hubs, tape path and head assembly. */}
        <Rect x={153} y={261} width={762} height={348} rx={17}/>
        <Rect x={165} y={273} width={738} height={324} rx={13}/>
        <Path d="M206 304 L861 304 L861 476 L205 476 Z"/>
        <Path d="M232 323 L831 323 L817 462 L246 462 Z"/>
        <Reel cx={355} cy={392}/>
        <Reel cx={711} cy={392}/>
        <Path d="M286 323 Q533 307 780 323"/>
        <Path d="M276 461 Q531 484 790 461"/>
        <Path d="M278 486 L807 486 L858 582 L226 582 Z"/>
        <Path d="M296 500 L781 500 L816 568 L266 568 Z"/>
        <Rect x={463} y={514} width={152} height={45} rx={5}/>
        <Circle cx={312} cy={538} r={16}/>
        <Circle cx={758} cy={538} r={16}/>
        <Circle cx={312} cy={538} r={8}/>
        <Circle cx={758} cy={538} r={8}/>
        <Line x1={329} y1={538} x2={463} y2={538}/>
        <Line x1={615} y1={538} x2={740} y2={538}/>
        <Screw x={187} y={293}/>
        <Screw x={880} y={293}/>
        <Screw x={187} y={577}/>
        <Screw x={880} y={577}/>
        {/* Ruler, dimension lines and technical construction marks. */}
        <G strokeWidth={0.82} opacity={0.72}>
          <Line x1={153} y1={623} x2={915} y2={623}/>
          <Line x1={153} y1={610} x2={153} y2={640}/>
          <Line x1={915} y1={610} x2={915} y2={640}/>
          <Path d="M164 619 L153 623 L164 627
            M904 619 L915 623 L904 627"/>
          <Line x1={126} y1={261} x2={126} y2={609}/>
          <Line x1={113} y1={261} x2={144} y2={261}/>
          <Line x1={113} y1={609} x2={144} y2={609}/>
          <Path d="M122 271 L126 261 L130 271
            M122 599 L126 609 L130 599"/>
          <Line x1={355} y1={289} x2={355} y2={489}
            strokeDasharray="5 7"/>
          <Line x1={711} y1={289} x2={711} y2={489}
            strokeDasharray="5 7"/>
          <Line x1={540} y1={258} x2={540} y2={612}
            strokeDasharray="5 8"/>
        </G>
        <G fill={ink} stroke="none" opacity={0.76}>
          <SvgText x={535} y={646} fontSize={14}
            textAnchor="middle" letterSpacing={2}>100.4</SvgText>
          <SvgText x={106} y={443} fontSize={13}
            transform="rotate(-90 106 443)" textAnchor="middle">63.0</SvgText>
          <SvgText x={195} y={664} fontSize={12} letterSpacing={1.2}>
            JL / MAGNETIC TAPE · EXPLODED ELEVATION
          </SvgText>
          <SvgText x={837} y={664} fontSize={12}>01 — 02</SvgText>
        </G>
      </G>
    </Svg>
  </View>;
}
