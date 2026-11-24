import React from 'react';
import { Image, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

/** Original JenLow talent drawings, stored directly in frontend/assets. */
const drawings = {
  camera: require('../../../assets/camera.png'),
  drums: require('../../../assets/drums.png'),
  cello: require('../../../assets/cello.png'),
  trumpet: require('../../../assets/trumpet.png'),
  'acoustic-guitar': require('../../../assets/acoustic-guitar.png'),
  singing: require('../../../assets/singing.png'),
  bass: require('../../../assets/bass.png'),
  violin: require('../../../assets/violin.png'),
  saxophone: require('../../../assets/saxophone.png'),
  piano: require('../../../assets/piano.png'),
  'double-bass': require('../../../assets/double-bass.png'),
  ukulele: require('../../../assets/ukulele.png'),
  'electric-guitar': require('../../../assets/electric-guitar.png'),
} as const;

export type TalentIllustration =
  | keyof typeof drawings
  | 'guitar'
  | 'cavaquinho'
  | 'viola';

/** No colored disc, no re-drawing and no cropping of the supplied art. */
export function TalentArt({
  kind = 'guitar',
  size = 110,
}: {
  kind?: TalentIllustration;
  size?: number;
}) {
  const theme = useAppTheme();
  // The supplied drawings are transparent black line art.
  // Recolor strokes without altering their alpha or geometry.
  const lineColor = theme.dark ? '#F5EFE4' : '#26211D';
  const key =
    kind === 'guitar'
      ? 'acoustic-guitar'
      : kind === 'cavaquinho'
        ? 'ukulele'
        : kind === 'viola'
          ? 'violin'
          : kind;
  return (
    <Image
      source={drawings[key]}
      style={{ width: size, height: size, tintColor: lineColor,
        ...(Platform.OS === 'web' && theme.dark ? { filter: 'brightness(0) invert(0.95) sepia(0.12)' } : {}) } as any}
      resizeMode="contain"
      accessibilityLabel={key.replace(/-/g, ' ')}
    />
  );
}
