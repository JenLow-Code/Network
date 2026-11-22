import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * A song in the private workshop is an unfinished cassette: an orthographic
 * pencil drawing, not the artwork of its eventual public release.
 *
 * Deliberately independent of the project's cover image. The cover is kept
 * in the project data for publication and editing, never discarded.
 */
export function MusicCassetteDraft({ width = 216, variant = 'standard' }: {
  width?: number;
  variant?: 'standard' | 'tile';
}) {
  const theme = useAppTheme();
  const ink = theme.dark ? '#EEE1D5' : '#514439';
  const background = theme.dark ? '#332D32' : '#E6DACB';
  const height = variant === 'tile' ? width : Math.round(width * 0.65);

  return <View style={{
    width, height, borderRadius: variant === 'tile' ? 0 : 11, overflow: 'hidden',
    backgroundColor: background, alignItems: 'center', justifyContent: 'center',
  }}>
    <Svg width="100%" height="100%" viewBox={variant === 'tile' ? '0 0 320 320' : '0 0 320 208'}>
      {variant === 'tile' ? <G stroke={ink} opacity={0.075} strokeWidth={0.6}>
        {Array.from({length:15},(_,i) => <Line key={'v'+i}
          x1={i*24} y1={0} x2={i*24} y2={320}/>)}
        {Array.from({length:15},(_,i) => <Line key={'h'+i}
          x1={0} y1={i*24} x2={320} y2={i*24}/>)}
      </G> : null}
      <G transform={variant === 'tile' ? 'translate(0 55)' : undefined}>
      <G fill="none" stroke={ink} strokeWidth={1.25}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.88}>
        {/* Outer shell and the faint construction line of a second plate. */}
        <Rect x={26} y={35} width={268} height={139} rx={8} strokeWidth={1.65}/>
        <Rect x={33} y={42} width={254} height={125} rx={5} opacity={0.46}/>
        <Path d="M48 55 H272 V130 H48 Z" opacity={0.45}/>
        {/* Two mechanical reels and their six-spoke hubs. */}
        {[103, 217].map(cx => <G key={cx}>
          <Circle cx={cx} cy={100} r={38} strokeDasharray="4 5" opacity={0.5}/>
          <Circle cx={cx} cy={100} r={18}/>
          <Circle cx={cx} cy={100} r={12}/>
          <Circle cx={cx} cy={100} r={5}/>
          {Array.from({length:6},(_,i) => {
            const a=i*Math.PI/3;
            return <Line key={i}
              x1={cx+Math.cos(a)*6} y1={100+Math.sin(a)*6}
              x2={cx+Math.cos(a)*15} y2={100+Math.sin(a)*15}/>;
          })}
        </G>)}
        {/* Open inspection window and lower tape-head assembly. */}
        <Rect x={124} y={81} width={72} height={38} rx={2}/>
        <Path d="M122 85 L128 100 L122 115 M198 85 L192 100 L198 115" opacity={0.6}/>
        <Path d="M74 133 H246 L259 163 H61 Z"/>
        <Path d="M87 139 H233 L243 155 H77 Z" opacity={0.55}/>
        <Circle cx={92} cy={146} r={6}/>
        <Circle cx={228} cy={146} r={6}/>
        <Rect x={142} y={137} width={36} height={18} rx={2}/>
        {/* Screw heads, kept deliberately light. */}
        {[[43,51],[277,51],[43,159],[277,159]].map(([x,y],i) =>
          <G key={i} opacity={0.7}>
            <Circle cx={x} cy={y} r={4}/>
            <Line x1={x-2} y1={y} x2={x+2} y2={y}/>
          </G>)}
        {/* Dimension lines and assembly guides: this is still a drawing. */}
        <G opacity={0.5} strokeWidth={0.85}>
          <Line x1={26} y1={21} x2={294} y2={21}/>
          <Line x1={26} y1={16} x2={26} y2={28}/>
          <Line x1={294} y1={16} x2={294} y2={28}/>
          <Path d="M35 18 L26 21 L35 24 M285 18 L294 21 L285 24"/>
          <Line x1={13} y1={35} x2={13} y2={174}/>
          <Line x1={9} y1={35} x2={20} y2={35}/>
          <Line x1={9} y1={174} x2={20} y2={174}/>
          <Line x1={160} y1={43} x2={160} y2={167} strokeDasharray="3 6"/>
          <Line x1={103} y1={56} x2={103} y2={130} strokeDasharray="3 6"/>
          <Line x1={217} y1={56} x2={217} y2={130} strokeDasharray="3 6"/>
        </G>
      </G>
      <G fill={ink} opacity={0.7}>
        <SvgText x={160} y={15} fontSize={9} textAnchor="middle" letterSpacing={1.4}>
          100,4
        </SvgText>
        <SvgText x={9} y={112} fontSize={8} textAnchor="middle"
          transform="rotate(-90 9 112)">63,8</SvgText>
        <SvgText x={26} y={191} fontSize={8} letterSpacing={1.2}>
          JL / MUSIQUE — ÉTUDE
        </SvgText>
        <SvgText x={294} y={191} textAnchor="end" fontSize={8}>01</SvgText>
      </G>
      </G>
    </Svg>
  </View>;
}
