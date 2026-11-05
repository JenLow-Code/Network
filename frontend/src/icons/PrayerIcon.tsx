import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Restrained Christian cross for the prayer reaction.
 * Active state uses JenLow magenta; inactive remains neutral.
 */
export function PrayerIcon({
  size = 24,
  muted = false,
  active = false,
  color,
}: {
  size?: number;
  muted?: boolean;
  active?: boolean;
  color?: string;
}) {
  const ink = active ? '#CB245C' : muted ? '#999' : (color || '#252525');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5V20.5M5.5 9.5H18.5"
        stroke={ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
