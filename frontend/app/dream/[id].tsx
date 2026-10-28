import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { dreams } from '@/mocks/publications';
import { DreamReferenceLayout } from '@/components/detail/DreamReferenceLayout';
export default function DreamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = dreams.find(d => d.id === id);
  if (!item)
    return (
      <View style={{ padding: 24 }}>
        <Text>Rêve introuvable</Text>
      </View>
    );
  return <DreamReferenceLayout item={item} />;
}
