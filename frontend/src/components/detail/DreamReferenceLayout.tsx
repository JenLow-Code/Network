import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DreamPublication } from '@/domain/publication';
import { DetailLayout } from './DetailLayout';
import { DetailPanel } from '@/components/publication/PublicationDetail';
import { useApp } from '@/context/AppContext';
export function DreamReferenceLayout({ item }: { item: DreamPublication }) {
  const app = useApp();
  const sameDream = () => app.joinDream(item.id);
  return (
    <DetailLayout
      item={item}
    >
      <View style={{ paddingBottom: 20 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#8C676A', marginBottom: 9 }}>
          MON BUT
        </Text>
        <Text style={{ fontSize: 17, lineHeight: 27, color: '#333' }}>{item.summary}</Text>
        {item.phase === 'Rêve' ? (
          <Pressable
            onPress={sameDream}
            accessibilityLabel="Moi aussi"
            style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 15, alignSelf: 'flex-start' }}
          >
            <Ionicons
              name={app.myDreamIds.includes(item.id) ? 'checkmark-circle' : 'add-circle-outline'}
              size={19}
              color={app.myDreamIds.includes(item.id) ? '#CB245C' : '#444'}
            />
            <Text style={{ fontSize: 13, color: '#444' }}>Moi aussi</Text>
          </Pressable>
        ) : null}
      </View>
      <DetailPanel title="Ma motivation" foldable defaultOpen={false} hideTopBorder>
        <Text style={{ fontSize: 13, lineHeight: 20, color: '#333' }}>
          {item.motivation || 'Ce rêve me tient à cœur.'}
        </Text>
      </DetailPanel>
      <DetailPanel title="Les talents nécessaires" foldable defaultOpen={false}>
        <Text style={{ fontSize: 13, color: '#333' }}>{item.needs.join(' · ')}</Text>
      </DetailPanel>
      {item.phase === 'Initiation' ? (
        <DetailPanel title="Date objectif" foldable defaultOpen={false}>
          <Text>{item.goalDate || 'À définir'}</Text>
        </DetailPanel>
      ) : null}
      {item.phase === 'Croissance' ? (
        <DetailPanel title="Journal de croissance" foldable defaultOpen={false}>
          {(item.logs || []).map((log, i) => (
            <Text key={i} style={{ marginVertical: 4, color: '#333' }}>
              🌿 {log}
            </Text>
          ))}
        </DetailPanel>
      ) : null}
    </DetailLayout>
  );
}
