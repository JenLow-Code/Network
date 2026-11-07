import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TalentArt } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import type { DreamResource } from '@/domain/dreamWorkspace';
import { useAppTheme } from '@/theme/AppTheme';

/** Talent request, not a profile or a claim that a real volunteer has joined. */
export function DreamTalentSquare({
  resource, size = 78, onToggle, onRemove,
}: {
  resource: DreamResource;
  size?: number;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const theme = useAppTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const illustrationSize = Math.min(49, size * 0.49);
  const role = resource.title;
  return (
    <>
      <Pressable
        onPress={() => setDetailsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={role + (resource.requiredLevel ? ', niveau recherché ' + resource.requiredLevel : '') + ', voir le besoin'}
        style={{
          width: size, height: size, borderRadius: 9,
          padding: Math.max(5, size * .08),
          alignItems: 'center', justifyContent: 'center',
          gap: Math.max(3, size * .045),
          backgroundColor: resource.confirmed
            ? (theme.dark ? '#254635' : '#E3F3E7')
            : (theme.dark ? '#2A2B2C' : '#F9F6F2'),
          borderWidth: resource.confirmed ? 1.5 : 1.6,
          borderColor: resource.confirmed ? '#318656' : '#D71D77',
        }}
      >
        {resource.illustration
          ? <TalentArt kind={resource.illustration} size={illustrationSize}/>
          : <Ionicons name="person-outline" size={illustrationSize * .65} color={theme.foreground}/>}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75}
          style={{ color: theme.foreground, fontSize: size < 80 ? 9 : 10, fontWeight: '700', textAlign: 'center', width: '100%' }}>
          {role}
        </Text>
        {resource.requiredLevel ? <TalentLevelDots level={resource.requiredLevel} size={size < 80 ? 4 : 6} spacing={3}/> : null}
      </Pressable>
      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer les détails"
            onPress={() => setDetailsOpen(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View style={{
            width: '100%', maxWidth: 410, borderRadius: 17, padding: 23, maxHeight: '80%',
            backgroundColor: theme.surface,
          }}>
            <ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 17, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: theme.muted, letterSpacing: 1.4, fontWeight: '700' }}>TALENT RECHERCHÉ</Text>
                <Pressable onPress={() => setDetailsOpen(false)} accessibilityLabel="Fermer" style={{ padding: 7 }}>
                  <Ionicons name="close-outline" size={22} color={theme.foreground}/>
                </Pressable>
              </View>
              <Text style={{ fontFamily: 'serif', fontSize: 28, color: theme.foreground, marginBottom: 17 }}>{role}</Text>
              {resource.illustration ? <View style={{ alignItems: 'center', marginBottom: 21 }}><TalentArt kind={resource.illustration} size={108}/></View> : null}
              {resource.requiredLevel ? (
                <View style={{ marginBottom: 19, gap: 9 }}>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>Niveau souhaité : {resource.requiredLevel}</Text>
                  <TalentLevelDots level={resource.requiredLevel} align="start" size={8}/>
                </View>
              ) : null}
              {resource.description ? <Text style={{ color: theme.foreground, lineHeight: 23, fontSize: 14, marginBottom: 18 }}>{resource.description}</Text> : null}
              <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 20, marginBottom: 15 }}>
                {resource.confirmed ? 'Cette ressource est marquée comme confirmée dans la préparation du rêve.' : 'Cette ressource reste à trouver pour faire avancer ce rêve.'}
              </Text>
              {onToggle ? (
                <Pressable onPress={() => { onToggle(); setDetailsOpen(false); }}
                  accessibilityRole="button"
                  style={{ backgroundColor: theme.dark ? '#ECE9E4' : '#242322', padding: 14, borderRadius: 10, marginBottom: 8, alignItems: 'center' }}>
                  <Text style={{ color: theme.dark ? '#242322' : '#FFF', fontWeight: '700', fontSize: 13 }}>
                    {resource.confirmed ? 'Marquer comme à trouver' : 'Confirmer cette ressource'}
                  </Text>
                </Pressable>
              ) : null}
              {onRemove ? (
                <Pressable onPress={() => { onRemove(); setDetailsOpen(false); }}
                  style={{ padding: 12, alignItems: 'center' }} accessibilityRole="button">
                  <Text style={{ color: theme.muted, fontSize: 12 }}>Retirer ce besoin</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
