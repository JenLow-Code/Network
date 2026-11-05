import React from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { PrayerIcon } from '@/icons/PrayerIcon';

/**
 * Small, always-visible reaction rail beside the two participation actions.
 * It occupies its own layout column so it never overlays either button.
 * Fire and prayer currently use the app's existing local demo state.
 */
export function DreamReactionRail({ item }: { item: DreamPublication }) {
  const app = useApp();
  const theme = useAppTheme();
  const fireActive = app.fireIds.includes(item.id);
  const prayerActive = app.isPraying(item.id);
  const quiet = theme.dark ? '#D4D0CC' : '#504B47';
  const share = () => {
    const url = 'https://network.jenlow.net/dream/' + encodeURIComponent(item.id);
    void Share.share({ message: item.title + ' — JenLow Network\n' + url });
  };

  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: theme.dark ? '#25252A' : '#FFFCF8' },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fire"
        accessibilityState={{ selected: fireActive }}
        onPress={() => app.toggleFire(item.id)}
        style={styles.action}
      >
        <Ionicons
          name={fireActive ? 'flame' : 'flame-outline'}
          size={19}
          color={fireActive ? '#CB245C' : quiet}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Prier"
        accessibilityState={{ selected: prayerActive }}
        onPress={() => app.togglePrayer(item.id)}
        style={styles.action}
      >
        <PrayerIcon size={20} active={prayerActive} color={quiet} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Partager"
        onPress={share}
        style={styles.action}
      >
        <Ionicons name="share-outline" size={19} color={quiet} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  action: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
