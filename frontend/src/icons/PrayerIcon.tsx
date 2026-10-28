import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Two hands held together in prayer, based on the approved reference.
 * Inactive: monochrome outline. Active: JenLow-pink sleeves and warm ivory hands.
 */
export function PrayerIcon({
  size = 24,
  muted = false,
  active = false,
}: {
  size?: number;
  muted?: boolean;
  active?: boolean;
}) {
  const ink = muted && !active ? '#999' : '#252525';
  const stroke = active ? '#CB245C' : ink;
  const hands = active ? '#FFF5DC' : 'none';
  const sleeves = active ? '#CB245C' : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M20 46L9 55L2.5 46.5L13.5 38L20 46Z"
        fill={sleeves}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <Path
        d="M44 46L55 55L61.5 46.5L50.5 38L44 46Z"
        fill={sleeves}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <Path
        d="M13.5 38C17.7 34 21 31.2 22 26L26.6 7.2C27.8 2.8 32 3.2 32 8V32L36.1 11.8C37 7.6 41.7 8.4 41.8 13L44.6 29.2C45.2 32.4 48 35.7 50.5 38L44 46C40 43.8 36.7 42.8 32 43C27.3 42.8 24 43.8 20 46Z"
        fill={hands}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M32 8V32M32 32L27.3 18.2C26.2 14.7 22.7 15.3 22.3 18.7L20 29.5M32 32L36 18.6C37.1 14.9 40.4 15.5 41.2 18.6L44 29.2M22 36.5C25.1 39 28.6 40.7 32 43M42 36.5C39 39 35.5 40.7 32 43"
        fill="none"
        stroke={stroke}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
