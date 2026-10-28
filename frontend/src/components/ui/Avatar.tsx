import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function Avatar({ size = 42 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#e8e8e8',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="person" color="#777" size={size * 0.58} />
    </View>
  );
}
