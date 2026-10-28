import React, { useEffect, useId, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** The photo fade and the fallback color fade must end at the same fixed height. */
export const DETAIL_FADE_HEIGHT = 300;

/**
 * Soft photographic fade used only by Dreams and Music.
 * The surrounding detail layout always draws its original phase/neutral gradient,
 * so that remains visible while the image loads or if the image cannot be loaded.
 */
export function PublicationImageFade({ uri, background }: { uri: string; background: string }) {
  const [loaded, setLoaded] = useState(false);
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  useEffect(() => {
    setLoaded(false);
  }, [uri]);
  if (!uri.trim()) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Image
        source={{ uri }}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        style={[StyleSheet.absoluteFill, { opacity: loaded ? 0.65 : 0 }]}
      />
      {loaded ? (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              {/* Reverse fade: ivory at the top, photograph emerging toward the lower area.
        The very last edge returns softly to ivory so it never ends abruptly. */}
              <Stop offset="0%" stopColor={background} stopOpacity={1} />
              <Stop offset="24%" stopColor={background} stopOpacity={0.96} />
              <Stop offset="48%" stopColor={background} stopOpacity={0.69} />
              <Stop offset="72%" stopColor={background} stopOpacity={0.27} />
              <Stop offset="88%" stopColor={background} stopOpacity={0.14} />
              <Stop offset="97%" stopColor={background} stopOpacity={0.82} />
              <Stop offset="100%" stopColor={background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      ) : null}
      {loaded ? (
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradientId + 'dark'} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#080808" stopOpacity={0.53} />
              <Stop offset="38%" stopColor="#080808" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#080808" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId}dark)`} />
        </Svg>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DETAIL_FADE_HEIGHT,
    overflow: 'hidden',
  },
});
