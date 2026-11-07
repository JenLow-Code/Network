import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MessageIcon } from '@/icons/MessageIcon';
import { useAppTheme } from '@/theme/AppTheme';

/** Fire and messages are global tools, never permanent bottom destinations. */
export function TopActions({ showFire = true }: { showFire?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {showFire && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ma liste Fire"
          onPress={() => router.push('/fire')}
          style={{ width: 43, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="flame-outline" size={23} color={theme.foreground} />
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Messages"
        onPress={() => router.push('/space')}
        style={{ width: 43, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <MessageIcon size={24} color={theme.foreground} />
      </Pressable>
    </View>
  );
}
