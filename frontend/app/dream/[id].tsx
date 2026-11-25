import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DreamReferenceLayout } from '@/components/detail/DreamReferenceLayout';
import { usePublication } from '@/lib/api/hooks';
import type { DreamPublication } from '@/domain/publication';

/** Aspiration publication detail, from the authenticated API only. */
export default function DreamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = usePublication(id);
  if (remote.item?.type === 'dream') return <DreamReferenceLayout item={remote.item as DreamPublication} />;
  if (remote.state === 'loading')
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text>Aspiration introuvable</Text>
      <Pressable onPress={() => void remote.retry()}>
        <Text style={{ color: '#D71D77' }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}
