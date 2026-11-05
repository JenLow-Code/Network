import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { DetailLayout } from './DetailLayout';
import { DetailMoreDrawer, DetailInfoSection } from './DetailMoreDrawer';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const slideX = useRef(new Animated.Value(440)).current;
  const { width: viewportWidth } = useWindowDimensions();
  useEffect(() => {
    if (moreOpen) {
      Animated.timing(slideX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      slideX.setValue(440);
    }
  }, [moreOpen, slideX]);
  const section = (label: string, body: React.ReactNode) => (
    <View style={{ gap: 5, paddingVertical: 8 }}>
      <Text style={{ color: muted, fontSize: 10, fontWeight: '600', letterSpacing: 1.15 }}>{label.toUpperCase()}</Text>
      <View>{body}</View>
    </View>
  );
  const paragraph = (value: string) => (
    <Text style={{ color: ink, fontSize: 13, lineHeight: 21 }}>{value}</Text>
  );
  const germinationContext = (
    <View style={{ gap: 9 }}>
      {section('Ma motivation', paragraph(item.motivation || 'Le porteur de ce rêve n’a pas encore ajouté sa motivation.'))}
      {!!item.goalDate && section('Date objectif', paragraph(item.goalDate))}
      {item.resources?.length ? (
        section('Ressources nécessaires',
          <View style={{ gap: 11 }}>
            {item.resources.filter(r => r.category !== 'financial').map((resource, i) => (
              <View key={resource.title + '-' + i} style={{ gap: 3 }}>
                <Text style={{ color: ink, fontSize: 13, fontWeight: '600' }}>
                  {resource.title}{resource.confirmed ? ' · confirmé' : ' · recherché'}
                </Text>
                {!!resource.description && paragraph(resource.description)}
              </View>
            ))}
          </View>,
        )
      ) : item.needs.length ? section('Besoins', paragraph(item.needs.join(' · '))) : null}
    </View>
  );

  return (
    <DetailLayout item={item}>
      {isGermination ? (
        <>
          {/* Match the help buttons' right edge: 40px reaction rail + 10px gap. */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 42, paddingRight: 50 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="En savoir plus sur ce rêve"
              onPress={() => setMoreOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11 }}
            >
              <Text style={{ color: ink, fontWeight: '600', fontSize: 12 }}>En savoir plus</Text>
              <Ionicons name="arrow-forward" color={ink} size={14} />
            </Pressable>
          </View>
          <Modal
            visible={moreOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMoreOpen(false)}
          >
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Pressable
                style={StyleSheet.absoluteFill}
                accessibilityRole="button"
                accessibilityLabel="Fermer les informations"
                onPress={() => setMoreOpen(false)}
              />
              <Animated.View style={{
                backgroundColor: theme.surface, width: Math.min(420, viewportWidth * 0.94),
                height: '100%', paddingHorizontal: 23, paddingTop: 30,
                transform: [{ translateX: slideX }],
              }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 50, gap: 23 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retour au rêve"
                    onPress={() => setMoreOpen(false)}
                    style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, paddingVertical: 9 }}
                  >
                    <Ionicons name="chevron-back" size={19} color={ink} />
                    <Text style={{ color: ink, fontSize: 13 }}>Retour au rêve</Text>
                  </Pressable>
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: muted, fontSize: 10, fontWeight: '600', letterSpacing: 1.3 }}>LE RÊVE DE {item.author.toUpperCase()}</Text>
                    <Text style={{ color: ink, fontSize: 27, lineHeight: 34, fontFamily: 'serif' }}>{item.title}</Text>
                    {!!item.summary && paragraph(item.summary)}
                  </View>
                  {germinationContext}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </>
      ) : item.phase === 'Rêve' ? null : (
        <DetailMoreDrawer
          heading={item.title}
          subtitle={item.phase === 'Croissance' ? 'Croissance · ' + item.author : 'Floraison · ' + item.author}
        >
          <DetailInfoSection title="Ma motivation" text={item.motivation || item.summary} />
          {!!item.goalDate && <DetailInfoSection title="Date objectif" text={item.goalDate} />}
          {!!item.needs.length && <DetailInfoSection title="Besoins et talents" text={item.needs.join(' · ')} />}
          {item.phase === 'Croissance' && (
            <DetailInfoSection
              title="Journal de croissance"
              text={(item.logs || []).join('\n\n') || item.journalEntry?.text || 'Pas encore de nouvelles publiées.'}
            />
          )}
          {item.phase === 'Témoignage' && (
            <DetailInfoSection title="Le résultat" text={item.summary} />
          )}
        </DetailMoreDrawer>
      )}
    </DetailLayout>
  );
}
