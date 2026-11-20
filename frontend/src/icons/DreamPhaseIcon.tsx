import React from 'react';
import { Image, View } from 'react-native';
import type { DreamPhase } from '@/domain/publication';
import { dreamPhaseImageUris } from '../../assets/dreamPhaseImages';

/** User-supplied phase artwork. The same illustration appears in Discovery and detail views. */
export function DreamPhaseIcon({ phase, size = 26, tintColor, artworkScale }: { phase: DreamPhase; size?: number; tintColor?: string; artworkScale?: number }) {
  // Keep the badge consistent; scale artwork only for early stages.
  const defaultScale = phase === 'Rêve' ? 0.13 : phase === 'Initiation' ? 0.62 : 1;
  const artworkSize = size * (artworkScale ?? defaultScale);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri: dreamPhaseImageUris[phase] }}
        style={{ width: artworkSize, height: artworkSize, tintColor }}
        resizeMode="contain"
        accessibilityLabel={phase}
      />
    </View>
  );
}
