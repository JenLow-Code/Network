import React, { useRef, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { PrayerIcon } from '@/icons/PrayerIcon';

/** A single, compact entry point for secondary reactions in the dream action area. */
export function DreamReactionPopover({ item }: { item: DreamPublication }) {
  const app = useApp();
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const fire = app.fireIds.includes(item.id);
  const prayer = app.isPraying(item.id);
  const quiet = theme.dark ? '#D4D0CC' : '#504B47';

  const show = () => {
    trigger.current?.measureInWindow((x, y) => {
      setPosition({
        left: Math.max(12, Math.min(width - 178, x - 149)),
        top: Math.max(12, Math.min(height - 166, y - 50)),
      });
      setOpen(true);
    });
  };

  const share = () => {
    const url = 'https://network.jenlow.net/dream/' + encodeURIComponent(item.id);
    void Share.share({ message: item.title + ' — JenLow Network\n' + url });
  };
  const actions = [
    { label: 'Fire', active: fire, icon: <Ionicons name={fire ? 'flame' : 'flame-outline'} size={18} color={fire ? '#CB245C' : quiet} />, action: () => app.toggleFire(item.id) },
    { label: 'Prier', active: prayer, icon: <PrayerIcon size={18} active={prayer} color={quiet} />, action: () => app.togglePrayer(item.id) },
    { label: 'Partager', active: false, icon: <Ionicons name="share-outline" size={18} color={quiet} />, action: share },
  ];

  return (
    <View>
      <Pressable
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel="Réactions : Fire, Prier, Partager"
        accessibilityState={{ expanded: open }}
        onPress={show}
        style={[styles.trigger, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={quiet} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fermer les réactions" onPress={() => setOpen(false)} />
          <View style={[styles.menu, { left: position.left, top: position.top, backgroundColor: theme.surface, borderColor: theme.border }]}>
            {actions.map(action => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ selected: action.active }}
                onPress={() => { setOpen(false); action.action(); }}
                style={styles.action}
              >
                {action.icon}
                <Text style={{ color: action.active ? '#CB245C' : theme.foreground, fontSize: 13, fontWeight: '500' }}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  overlay: { flex: 1 },
  menu: {
    position: 'absolute', width: 166, padding: 6, borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 45, borderRadius: 8, paddingHorizontal: 12,
  },
});
