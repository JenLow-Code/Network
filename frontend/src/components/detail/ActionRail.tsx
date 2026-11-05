import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
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
export function ActionRail({ item, horizontal = false, labeledFooter = false }: { item: Publication; horizontal?: boolean; labeledFooter?: boolean }) {
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

  // Publication footer: reactions are lightweight, directly tappable actions.
  // Keep the historical swipe controls in other layouts that still use them.
  if (labeledFooter) {
    const actions = [
      { label: 'Fire', description: 'Encourager avec Fire', active: fireActive, onPress: () => app.toggleFire(item.id), icon: <Ionicons name={fireActive ? 'flame' : 'flame-outline'} size={17} color={fireActive ? '#CB245C' : inactiveColor} /> },
      { label: 'Prier', description: 'Prier pour cette publication', active: prayerActive, onPress: () => app.togglePrayer(item.id), icon: <PrayerIcon size={18} active={prayerActive} color={inactiveColor} /> },
      { label: 'Partager', description: 'Partager cette publication', active: false, onPress: share, icon: <Ionicons name="share-outline" size={17} color={inactiveColor} /> },
    ];
    return (
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {actions.map(action => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.description}
            accessibilityState={{ selected: action.active }}
            onPress={action.onPress}
            style={styles.footerAction}
          >
            {action.icon}
            <Text style={[styles.footerLabel, { color: action.active ? '#CB245C' : inactiveColor }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

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
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 12 },
  footerAction: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 2 },
  footerLabel: { fontSize: 11, fontWeight: '500' },
});
