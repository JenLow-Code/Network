import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TRAVEL = 160;
const SIZE = 42;
const THRESHOLD = TRAVEL * 0.88;
const DOUBLE_TAP_MS = 340;

type SwipeReactionProps = {
  label: string;
  icon: React.ReactNode;
  onConfirm: () => void;
  active?: boolean;
};

/**
 * Only the circle is visible initially.
 * A deliberate left swipe reveals its meaning and confirms at the end.
 * Two quick taps confirm the same action (one tap never performs it).
 *
 * The responder only claims horizontal motion, leaving vertical page scrolling
 * alone. Use the native accessibility activate action as a non-gesture path.
 */
export function SwipeReaction({ label, icon, onConfirm, active = false }: SwipeReactionProps) {
  const translate = useRef(new Animated.Value(0)).current;
  const callback = useRef(onConfirm);
  callback.current = onConfirm;
  const lastTap = useRef(0);
  const lastDrag = useRef(0);
  const confirming = useRef(false);

  const reset = () => {
    Animated.spring(translate, {
      toValue: 0,
      useNativeDriver: true,
      speed: 23,
      bounciness: 2,
    }).start(() => { confirming.current = false; });
  };

  const confirm = () => {
    if (confirming.current) return;
    confirming.current = true;
    lastTap.current = 0;
    callback.current();
    reset();
  };

  // Always call the newest callback, even after the parent rerenders.
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;
  const resetRef = useRef(reset);
  resetRef.current = reset;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx < -9 && Math.abs(g.dx) > Math.abs(g.dy) * 1.25,
      onPanResponderMove: (_, g) => {
        translate.setValue(Math.max(-TRAVEL, Math.min(0, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        lastDrag.current = Date.now();
        if (g.dx <= -THRESHOLD) confirmRef.current();
        else resetRef.current();
      },
      onPanResponderTerminate: () => {
        lastDrag.current = Date.now();
        resetRef.current();
      },
    }),
  ).current;

  const onTap = () => {
    const now = Date.now();
    if (now - lastDrag.current < 420 || confirming.current) return;
    if (lastTap.current !== 0 && now - lastTap.current < DOUBLE_TAP_MS) {
      confirmRef.current();
    } else {
      lastTap.current = now;
    }
  };

  const colorProgress = translate.interpolate({
    inputRange: [-TRAVEL, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const labelOpacity = translate.interpolate({
    inputRange: [-TRAVEL, -65, -12, 0],
    outputRange: [1, 0.9, 0.05, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.track}>
      <Animated.View pointerEvents="none" style={[styles.revealedPill, { opacity: labelOpacity }]} />
      <Animated.View pointerEvents="none" style={[styles.labelArea, { opacity: labelOpacity }]}>
        <Text numberOfLines={1} style={styles.label}>{label}</Text>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.handle, { transform: [{ translateX: translate }] }]}
      >
        <Pressable
          onPress={onTap}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Glisser à gauche ou toucher deux fois pour confirmer"
          accessibilityActions={[{ name: 'activate', label: 'Confirmer ' + label }]}
          onAccessibilityAction={event => {
            if (event.nativeEvent.actionName === 'activate') confirmRef.current();
          }}
          style={[styles.circle, active && styles.active]}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: SIZE / 2, backgroundColor: '#CB245C', opacity: colorProgress }]} />
          <View style={{ zIndex: 1 }}>{icon}</View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: SIZE, height: 44, position: 'relative', overflow: 'visible' },
  revealedPill: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: TRAVEL + SIZE,
    height: 44,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#BCAEB0',
    backgroundColor: '#F8F1EB',
  },
  labelArea: {
    position: 'absolute',
    right: SIZE + 9,
    top: 0,
    width: TRAVEL - 17,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 2,
  },
  label: { fontSize: 12, color: '#3A302D', fontWeight: '600', textAlign: 'center' },
  handle: { position: 'absolute', right: 0, top: 1, zIndex: 2 },
  circle: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    backgroundColor: '#EAE2D8',
    alignItems: 'center', justifyContent: 'center',
  },
  active: { backgroundColor: '#F6DEE8' },
});
