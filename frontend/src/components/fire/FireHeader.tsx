import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FireIcon } from '@/icons/FireIcon';
import { useApp } from '@/context/AppContext';
export function FireHeader() {
  const { fireIds } = useApp();
  return (
    <Pressable
      onPress={() => router.push('/fire')}
      accessibilityLabel="Ma liste Fire"
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <FireIcon size={24} />
      {fireIds.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 1,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#CB245C',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 9, color: '#fff' }}>{fireIds.length}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
