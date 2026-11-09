import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * A quiet Latin cross for the prayer reaction:
 * outlined by default, filled with JenLow magenta when selected.
 * The optional filled prop allows a non-magenta filled cross in static counters.
 */
export function PrayerIcon({
  size = 24,
  muted = false,
  active = false,
  filled = false,
  color,
}: {
  size?: number;
  muted?: boolean;
  active?: boolean;
  filled?: boolean;
  color?: string;
}) {
  const ink = active ? '#CB245C' : muted ? '#999' : (color || '#252525');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.4 3.2H13.6V8.4H18.4V11.3H13.6V20.8H10.4V11.3H5.6V8.4H10.4Z"
        stroke={ink}
        strokeWidth="1.55"
        strokeLinejoin="round"
        fill={active ? '#CB245C' : filled ? ink : 'none'}
      />
    </Svg>
  );
}
