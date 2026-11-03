import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { dreams } from '@/mocks/publications';
import { DreamReferenceLayout } from '@/components/detail/DreamReferenceLayout';
import { usePublication } from '@/lib/api/hooks';
import type { DreamPublication } from '@/domain/publication';

/** Dream detail. API ids load from D1; the few local-demo slugs used by mock screens stay local. */
export default function DreamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const local = dreams.find(d => d.id === id);
  const remote = usePublication(local ? undefined : id);
  if (local) return <DreamReferenceLayout item={local} />;
  if (remote.item?.type === 'dream') return <DreamReferenceLayout item={remote.item as DreamPublication} />;
  if (remote.state === 'loading')
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text>Rêve introuvable</Text>
      <Pressable onPress={() => void remote.retry()}>
        <Text style={{ color: '#D71D77' }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}
