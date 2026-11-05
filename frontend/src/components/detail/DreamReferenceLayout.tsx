import React from 'react';
import { Text, View } from 'react-native';
import type { DreamPublication } from '@/domain/publication';
import { DetailLayout } from './DetailLayout';
import { DetailPanel } from '@/components/publication/PublicationDetail';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * Keep the complete owner-authored context available without making the public
 * Germination detail feel like a form. The Discovery feed and API contract are unchanged.
 */
export function DreamReferenceLayout({ item }: { item: DreamPublication }) {
  const theme = useAppTheme();
  const ink = theme.foreground;
  const muted = theme.muted;
  const isGermination = item.phase === 'Initiation';
  const section = (label: string, body: React.ReactNode) => (
    <View style={{ gap: 5, paddingVertical: 8 }}>
      <Text style={{ color: muted, fontSize: 10, fontWeight: '600', letterSpacing: 1.15 }}>{label.toUpperCase()}</Text>
      <View>{body}</View>
    </View>
  );
  const paragraph = (value: string) => (
    <Text style={{ color: ink, fontSize: 13, lineHeight: 21 }}>{value}</Text>
  );
  return (
    <DetailLayout item={item}>
      {isGermination ? (
        <DetailPanel title="En savoir plus" foldable defaultOpen={false} hideTopBorder>
          <View style={{ paddingTop: 9, gap: 5 }}>
            {section('Ma motivation', paragraph(item.motivation || 'Le porteur de ce rêve n’a pas encore ajouté sa motivation.'))}
            {!!item.goalDate && section('Date objectif', paragraph(item.goalDate))}
            {item.resources?.length ? (
              section('Ressources nécessaires',
                <View style={{ gap: 8 }}>
                  {item.resources.filter(r => r.category !== 'financial').map((resource, i) => (
                    <View key={resource.title + '-' + i} style={{ gap: 3 }}>
                      <Text style={{ color: ink, fontSize: 13, fontWeight: '600' }}>
                        {resource.title}{resource.confirmed ? ' · confirmé' : ' · recherché'}
                      </Text>
                      {!!resource.description && paragraph(resource.description)}
                    </View>
                  ))}
                </View>)
            ) : item.needs.length ? section('Besoins', paragraph(item.needs.join(' · '))) : null}
          </View>
        </DetailPanel>
      ) : (
        <>
          <DetailPanel title="Ma motivation" foldable defaultOpen={false} hideTopBorder>
            {paragraph(item.motivation || 'Ce rêve me tient à cœur.')}
          </DetailPanel>
          {!!item.needs.length && (
            <DetailPanel title="Les talents nécessaires" foldable defaultOpen={false}>
              {paragraph(item.needs.join(' · '))}
            </DetailPanel>
          )}
          {item.phase === 'Croissance' && item.goalDate ? (
            <DetailPanel title="Date objectif" foldable defaultOpen={false}>
              {paragraph(item.goalDate)}
            </DetailPanel>
          ) : null}
          {item.phase === 'Croissance' ? (
            <DetailPanel title="Journal de croissance" foldable defaultOpen={false}>
              {(item.logs || []).map((log, i) => (
                <Text key={i} style={{ marginVertical: 4, color: ink, fontSize: 13, lineHeight: 21 }}>
                  🌿 {log}
                </Text>
              ))}
            </DetailPanel>
          ) : null}
        </>
      )}
    </DetailLayout>
  );
}
