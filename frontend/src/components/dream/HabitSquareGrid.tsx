import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamHabit } from '@/domain/dreamWorkspace';
import { habitHistory } from '@/domain/habitProgress';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * One preview row by default; expand to all planned squares.
 * For very large measured goals, cap the visual to a proportional 336-cell
 * sample and label that limitation rather than rendering thousands of tiles.
 */
export function HabitSquareGrid({
  habit, planned, completed, color,
}: {
  habit: DreamHabit;
  planned: number | null;
  completed: number;
  color: string;
}) {
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const gap = 4;
  const available = Math.max(160, measuredWidth || Math.min(screenWidth - 130, 500));
  const columns = Math.max(8, Math.min(30, Math.floor((available + gap) / 18)));
  const cellSize = Math.max(8, (available - (columns - 1) * gap) / columns);

  const total = planned !== null && Number.isFinite(planned) && planned > 0
    ? Math.ceil(planned) : null;
  const count = total === null ? 28 : Math.min(total, 336);
  const complete = total !== null
    ? Math.min(count, Math.max(0, Math.round(completed / (planned || 1) * count)))
    : 0;
  const previous = total === null ? habitHistory(habit, new Date(), 28) : [];
  const tiles = Array.from({ length: count }, (_, index) => ({
    key: String(index),
    done: total === null ? Boolean(previous[index]?.completed) : index < complete,
  }));
  const canExpand = tiles.length > columns;
  const shown = expanded || !canExpand ? tiles : tiles.slice(0, columns);

  return <View style={{ width: '100%' }}
    onLayout={event => {
      const next = event.nativeEvent.layout.width;
      if (next > 0 && Math.abs(next - measuredWidth) > 1) setMeasuredWidth(next);
    }}>
    <Pressable accessibilityRole="button"
      disabled={!canExpand}
      accessibilityState={{ expanded: canExpand ? expanded : undefined }}
      accessibilityLabel={
        habit.title + ', ' + completed + (planned !== null ? ' sur ' + planned : '') +
        '. ' + (canExpand ? expanded ? 'Réduire les carrés' : 'Afficher tous les carrés' : 'Vue complète')
      }
      onPress={() => setExpanded(open => !open)}
      style={{ gap: 5, paddingVertical: 5 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: '100%' }}>
        {shown.map(tile => <View key={tile.key}
          style={{
            width: cellSize, height: cellSize, borderRadius: Math.min(4, cellSize / 3),
            backgroundColor: color, opacity: tile.done ? 1 : .20,
          }} />)}
      </View>
      {canExpand ? <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
      }}>
        <Text style={{ fontSize: 10, color: theme.muted }}>
          {expanded ? 'Réduire' : 'Voir tous les carrés'}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'}
          size={13} color={theme.muted} />
      </View> : null}
      {expanded && total !== null && count < total ? <Text style={{
        fontSize: 10, lineHeight: 15, color: theme.muted,
      }}>
        Aperçu proportionnel : {count} carrés pour {planned} {habit.unit || 'réalisations'}
      </Text> : null}
    </Pressable>
  </View>;
}
