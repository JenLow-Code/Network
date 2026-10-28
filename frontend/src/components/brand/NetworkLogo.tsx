import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function NetworkLogo() {
  return (
    <View
      accessibilityLabel="JenLow Network"
      style={{ width: 150, alignItems: 'center', height: 57 }}
    >
      <Text style={{ color: '#080808', fontSize: 20, fontWeight: '700', lineHeight: 25 }}>
        JenLow
      </Text>
      <Text
        style={{
          fontFamily: 'Caveat_700Bold',
          color: colors.pink,
          fontSize: 33,
          lineHeight: 34,
          marginTop: -14,
          transform: [{ rotate: '-4deg' }],
        }}
      >
        Network
      </Text>
    </View>
  );
}
