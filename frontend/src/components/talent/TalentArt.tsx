import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Original JenLow talent drawings, stored directly in frontend/assets. */
const drawings = {
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
  | 'viola'
  | 'camera';

/** No colored disc, no re-drawing and no cropping of the supplied art. */
export function TalentArt({
  kind = 'guitar',
  size = 110,
}: {
  kind?: TalentIllustration;
  size?: number;
}) {
  const key =
    kind === 'guitar'
      ? 'acoustic-guitar'
      : kind === 'cavaquinho'
        ? 'ukulele'
        : kind === 'viola'
          ? 'violin'
          : kind;
  if (key === 'camera')
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera-outline" size={size * 0.68} color="#222" />
      </View>
    );
  return (
    <Image
      source={drawings[key]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={key.replace(/-/g, ' ')}
    />
  );
}
