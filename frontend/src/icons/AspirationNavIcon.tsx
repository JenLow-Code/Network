import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * JenLow Aspirations — a hand reaching toward a four-point star.
 *
 * The illustration is deliberately reduced to two solid vector shapes:
 * no shadows, gradient, text or background. It stays readable in the
 * 19–24 px navigation range, adapts to the current theme, and inherits
 * accessibility semantics from its labelled navigation button.
 *
 * Internal dream/phase identifiers are unchanged by this visual treatment.
 */
export function AspirationNavIcon({
  size = 24,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24"
      pointerEvents="none" accessible={false}>
      <Path
        fill={color}
        d="M14.65 2.2c.15 0 .29.09.35.24l.82 2.02c.07.18.21.33.4.4l2.02.82a.38.38 0 0 1 0 .7l-2.02.82a.67.67 0 0 0-.4.4L15 9.62a.38.38 0 0 1-.7 0l-.82-2.02a.67.67 0 0 0-.4-.4l-2.02-.82a.38.38 0 0 1 0-.7l2.02-.82a.67.67 0 0 0 .4-.4l.82-2.02c.06-.15.2-.24.35-.24Z"
      />
      <Path
        fill={color}
        d="M3.05 18.55c.39-2.13 1.57-3.98 3.56-5.16l3.6-2.16c.71-.43 1.47-.24 1.8.35.37.65.09 1.37-.54 1.78l-1.55 1.03c2.7-.05 4.59-.89 6.44-2.63l1.41-1.32c.58-.55 1.38-.55 1.9-.13.56.46.65 1.22.16 1.83l-3.3 4.16c-1.18 1.49-2.66 2.26-4.57 2.53l-4.15.56c-.67.09-1.02.43-1.38 1.02l-1.08 1.81-2.2-.85c-.26-.11-.27-.51-.1-1.42Z"
      />
    </Svg>
  );
}
