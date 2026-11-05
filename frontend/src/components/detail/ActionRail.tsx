import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import type { Publication } from '@/domain/publication';
import { PrayerIcon } from '@/icons/PrayerIcon';
import { useAppTheme } from '@/theme/AppTheme';
import { SwipeReaction } from './SwipeReaction';

/**
 * Quiet supporting reactions: encouragement, prayer and sharing.
 * Participation belongs to the separate, context-specific primary action.
 */
export function ActionRail({ item, horizontal = false }: { item: Publication; horizontal?: boolean }) {
  const app = useApp();
  const theme = useAppTheme();
  const fireActive = app.fireIds.includes(item.id);
  const prayerActive = app.isPraying(item.id);
  const inactiveColor = theme.dark ? '#D4D0CC' : '#504B47';

  const sharePath = item.type === 'dream'
    ? '/dream/' + encodeURIComponent(item.id)
    : item.type === 'music'
      ? '/music/' + encodeURIComponent(item.id)
      : item.type === 'talent'
        ? '/person/' + encodeURIComponent(item.author)
        : '/bible/' + encodeURIComponent(item.referenceId) + '?verse=' + item.highlightedVerse;
  const share = () => {
    // Semence can be shared by its exact link, without appearing in Discovery.
    // Backend visibility rules must separately enforce unlisted access.
    const link = 'https://network.jenlow.net' + sharePath;
    void Share.share({ message: item.title + ' — JenLow Network\n' + link });
  };

  return (
    <View style={[styles.rail, horizontal && styles.horizontal]}>
      <SwipeReaction
        label="Fire"
        fullLabel="Encourager avec Fire"
        onConfirm={() => app.toggleFire(item.id)}
        active={fireActive}
        icon={<Ionicons name={fireActive ? 'flame' : 'flame-outline'} size={20} color={fireActive ? '#CB245C' : inactiveColor} />}
      />
      <SwipeReaction
        label="Prier"
        fullLabel="Prier pour cette publication"
        onConfirm={() => app.togglePrayer(item.id)}
        active={prayerActive}
        icon={<PrayerIcon size={20} active={prayerActive} color={inactiveColor} />}
      />
      <SwipeReaction
        label="Partager"
        fullLabel="Partager cette publication"
        onConfirm={share}
        icon={<Ionicons name="share-outline" size={20} color={inactiveColor} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  horizontal: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, paddingVertical: 0 },
});
