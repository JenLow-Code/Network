import React from 'react';
import { View } from 'react-native';

/** Same five-dot level indicator in Discovery cards and Talent details. */
const DOT_COLORS = ['#287D58', '#2ECA65', '#EAC000', '#F38A24', '#CB245C'] as const;
const INACTIVE = '#E6E6E6';

function coloredDots(level: string) {
  const value = level.trim().toLocaleLowerCase('fr');
  if (value.includes('pro') || value.includes('profession')) return 5;
  if (value.includes('avanc') || value.includes('confirm')) return 4;
  if (value.includes('interm')) return 3;
  if (value.includes('notion')) return 2;
  if (value.includes('début') || value.includes('debut')) return 2;
  return 1;
}

export function TalentLevelDots({
  level,
  align = 'center',
}: {
  level: string;
  align?: 'center' | 'start';
}) {
  const count = coloredDots(level);
  return (
    <View
      accessibilityLabel={'Niveau : ' + level}
      style={{
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {DOT_COLORS.map((color, index) => (
        <View
          key={index}
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: index < count ? color : INACTIVE,
          }}
        />
      ))}
    </View>
  );
}
