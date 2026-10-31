import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DreamPublication } from '@/domain/publication';
import { DetailLayout } from './DetailLayout';
import { DetailPanel } from '@/components/publication/PublicationDetail';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
export function DreamReferenceLayout({ item }: { item: DreamPublication }) {
  const app = useApp();
  const theme = useAppTheme();
  const sameDream = () => app.joinDream(item.id);
  return (
    <DetailLayout
      item={item}
    >
      <DetailPanel title="Ma motivation" foldable defaultOpen={false} hideTopBorder>
        <Text style={{ fontSize: 13, lineHeight: 20, color: '#333' }}>
          {item.motivation || 'Ce rêve me tient à cœur.'}
        </Text>
      </DetailPanel>
      <DetailPanel title="Les talents nécessaires" foldable defaultOpen={false}>
        <Text style={{ fontSize: 13, color: '#333' }}>{item.needs.join(' · ')}</Text>
      </DetailPanel>
      {item.phase === 'Initiation' ? (
        <DetailPanel title="Mon but" foldable defaultOpen={false}>
          <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 20 }}>{item.summary}</Text>
        </DetailPanel>
      ) : null}
      {item.phase === 'Initiation' ? (
        <DetailPanel title="Date objectif" foldable defaultOpen={false}>
          <Text>{item.goalDate || 'À définir'}</Text>
        </DetailPanel>
      ) : null}
      {item.phase === 'Croissance' && item.goalDate ? (
        <DetailPanel title="Date objectif" foldable defaultOpen={false}>
          <Text style={{ color: theme.foreground, fontSize: 13 }}>{item.goalDate}</Text>
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
