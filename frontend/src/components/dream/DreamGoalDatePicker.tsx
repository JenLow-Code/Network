import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

const two = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => [d.getFullYear(), two(d.getMonth() + 1), two(d.getDate())].join('-');
const localToday = () => dateKey(new Date());
const mondayOffset = (day: number) => (day + 6) % 7;

export function DreamGoalDatePicker({
  visible, initialDate, onCancel, onConfirm,
  title = 'Date cible',
  explanation = 'Le choix de cette date lancera la Croissance. Les ressources encore recherchées resteront enregistrées.',
  confirmationLabel = 'Valider la date et faire pousser',
  minDate,
}: {
  visible: boolean;
  initialDate?: string;
  onCancel: () => void;
  onConfirm: (date: string) => void;
  title?: string;
  explanation?: string;
  confirmationLabel?: string;
  minDate?: string;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const today = minDate && minDate > localToday() ? minDate : localToday();

  useEffect(() => {
    if (!visible) return;
    const start = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= today
      ? new Date(initialDate + 'T12:00:00') : new Date();
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setSelected(initialDate && initialDate >= today ? initialDate : null);
  }, [visible, initialDate, today]);

  const days = useMemo(() => {
    const leading = mondayOffset(new Date(month.getFullYear(), month.getMonth(), 1).getDay());
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((leading + length) / 7) * 7 }, (_, i) => {
      const value = i - leading + 1;
      return value >= 1 && value <= length ? value : null;
    });
  }, [month]);

  const shift = (months: number) => setMonth(previous =>
    new Date(previous.getFullYear(), previous.getMonth() + months, 1));
  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={{
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 17,
        backgroundColor: 'rgba(15,17,18,0.55)',
      }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le calendrier"
          onPress={onCancel}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}/>
        <View style={{
          width: '100%', maxWidth: 410, borderRadius: 16,
          backgroundColor: theme.background, padding: width < 390 ? 17 : 23,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '700' }}>{title}</Text>
            <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={onCancel} style={{ padding: 7 }}>
              <Ionicons name="close-outline" size={23} color={theme.foreground}/>
            </Pressable>
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19, marginBottom: 18 }}>
            {explanation}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <Pressable accessibilityLabel="Mois précédent" accessibilityRole="button"
              onPress={() => shift(-1)} style={{ padding: 11 }}>
              <Ionicons name="chevron-back" size={19} color={theme.foreground}/>
            </Pressable>
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }}>{monthLabel}</Text>
            <Pressable accessibilityLabel="Mois suivant" accessibilityRole="button"
              onPress={() => shift(1)} style={{ padding: 11 }}>
              <Ionicons name="chevron-forward" size={19} color={theme.foreground}/>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 9 }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((name, i) =>
              <View key={i} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>{name}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map((number, index) => {
              if (!number) return <View key={index} style={{ width: '14.2857%', height: 43 }}/>;
              const value = [month.getFullYear(), two(month.getMonth() + 1), two(number)].join('-');
              const beforeToday = value < today;
              const active = value === selected;
              return (
                <View key={index} style={{ width: '14.2857%', alignItems: 'center', justifyContent: 'center', height: 43 }}>
                  <Pressable
                    onPress={() => setSelected(value)} disabled={beforeToday}
                    accessibilityRole="button"
                    accessibilityLabel={new Date(month.getFullYear(), month.getMonth(), number).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
                    accessibilityState={{ selected: active, disabled: beforeToday }}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      justifyContent: 'center', alignItems: 'center',
                      backgroundColor: active ? '#225D42' : 'transparent',
                    }}>
                    <Text style={{
                      fontSize: 13, fontWeight: active ? '700' : '500',
                      color: active ? '#FFFFFF' : beforeToday ? theme.border : theme.foreground,
                    }}>{number}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Pressable accessibilityRole="button"
            accessibilityState={{ disabled: !selected }}
            disabled={!selected}
            onPress={() => { if (selected) onConfirm(selected); }}
            style={{
              backgroundColor: selected ? '#225D42' : '#9AA7A0',
              minHeight: 47, borderRadius: 11, marginTop: 21,
              justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
            }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
              {confirmationLabel}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel}
            style={{ alignItems: 'center', padding: 12, marginTop: 4 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
