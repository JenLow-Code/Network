import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamHabit } from '@/domain/dreamWorkspace';
import { habitHistory } from '@/domain/habitProgress';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * One compact row until expanded, with today's actionable next session outlined.
 * These squares visualize cumulative sessions, not consecutive completed dates:
 * the streak is a separate indicator.
 */
export function HabitSquareGrid({
  habit, planned, completed, color, todayDone, editable, onTodayPress,
}: {
  habit: DreamHabit;
  planned: number | null;
  completed: number;
  color: string;
  todayDone: boolean;
  editable: boolean;
  onTodayPress: () => void;
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
  // Use a proportional sample only for very large goals.
  const count = total === null ? 28 : Math.min(total, 336);
  const filled = total !== null
    ? Math.min(count, Math.max(0, Math.round(completed / (planned || 1) * count)))
    : 0;
  const previous = total === null ? habitHistory(habit, new Date(), 28) : [];
  const tiles = Array.from({ length: count }, (_, index) => ({
    key: String(index),
    done: total === null ? Boolean(previous[index]?.completed) : index < filled,
  }));
  // Highlight the next session the owner can complete today, *not* a claim that
  // earlier goal squares represent actual historical calendar dates.
  const todayIndex = total === null
    ? count - 1
    : Math.min(count - 1, Math.max(0, todayDone
      ? Math.min(count, filled) - 1 : filled));
  const canExpand = tiles.length > columns;
  const previewStart = canExpand ? Math.floor(todayIndex / columns) * columns : 0;
  const shown = expanded || !canExpand ? tiles : tiles.slice(previewStart, previewStart + columns);

  return <View style={{ width: '100%' }}
    onLayout={event => {
      const next = event.nativeEvent.layout.width;
      if (next > 0 && Math.abs(next - measuredWidth) > 1) setMeasuredWidth(next);
    }}>
    <View style={{ gap: 4, paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: '100%' }}>
        {shown.map(tile => {
          const current=Number(tile.key)===todayIndex;
          const square={
            width:cellSize,height:cellSize,
            borderRadius:Math.min(4,cellSize/3),
            backgroundColor:color,opacity:tile.done?1:.20,
          } as const;
          return current ? <Pressable key={tile.key} accessibilityRole="button"
            disabled={!editable}
            accessibilityLabel={todayDone
              ? 'Réalisation du jour déjà effectuée. Modifier '+habit.title
              : 'Marquer '+habit.title+' comme fait aujourd’hui'}
            onPress={onTodayPress}
            hitSlop={5}
            style={{
              width:cellSize,height:cellSize,borderRadius:Math.min(4,cellSize/3),
              borderWidth:1.8,borderColor:theme.foreground,
              backgroundColor:tile.done?color:'transparent',
              alignItems:'center',justifyContent:'center',
            }}>
            <View style={{
              width:Math.max(3,cellSize-6),height:Math.max(3,cellSize-6),
              borderRadius:Math.min(2,cellSize/4),
              backgroundColor:color,opacity:tile.done?1:.24,
            }}/>
          </Pressable>:
          <View key={tile.key} style={square}/>;
        })}
      </View>
      {canExpand ? <Pressable accessibilityRole="button"
        accessibilityLabel={expanded?'Réduire les carrés':'Afficher toutes les séances'}
        accessibilityState={{expanded}}
        onPress={() => setExpanded(open => !open)}
        style={{flexDirection:'row',alignSelf:'flex-end',alignItems:'center',gap:4,
          paddingVertical:5,paddingHorizontal:3}}>
        <Text style={{fontSize:10,color:theme.muted}}>
          {expanded?'Réduire':'Voir tous les carrés'}
        </Text>
        <Ionicons name={expanded?'chevron-up':'chevron-down'}
          size={13} color={theme.muted}/>
      </Pressable>:null}
      {expanded && total!==null && count<total ? <Text style={{
        fontSize:10,lineHeight:15,color:theme.muted,
      }}>Aperçu proportionnel : {count} carrés pour {planned} {habit.unit||'réalisations'}</Text>:null}
    </View>
  </View>;
}
