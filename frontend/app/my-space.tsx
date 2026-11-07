import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';
import { phaseAccent } from '@/components/dream/DreamPhaseLayout';

function DreamsOverview({ compact }: { compact: boolean }) {
  const { items } = useDreams();
  const theme = useAppTheme();

  return <View>
    {items.map((dream, index) => (
      <Pressable
        key={dream.id}
        accessibilityRole="button"
        accessibilityLabel={dream.title + ', ' + PHASE_LABELS[dream.phase]}
        onPress={() => router.push({ pathname: '/my-dream/[id]', params: { id: dream.id } })}
        style={{
          minHeight: compact ? 77 : 83,
          paddingVertical: compact ? 15 : 17,
          paddingHorizontal: 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 8 : 14,
          borderTopWidth: index === 0 ? 1 : 0,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{
            fontSize: compact ? 15 : 16, lineHeight: compact ? 20 : 23,
            fontWeight: '600', color: theme.foreground,
          }}>{dream.title}</Text>
          {compact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
              <View style={{ width: 13, height: 2, borderRadius: 2, backgroundColor: phaseAccent[dream.phase] }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: phaseAccent[dream.phase] }}>{PHASE_LABELS[dream.phase]}</Text>
              {dream.phase === 'Rêve' ? <Text style={{ fontSize: 10, color: theme.muted }}>· Non répertoriée</Text> : null}
            </View>
          ) : dream.summary ? (
            <Text numberOfLines={1} style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
              {dream.summary}
            </Text>
          ) : null}
        </View>
        {!compact ? (
          <View style={{ alignItems: 'flex-end', gap: 5, maxWidth: 118 }}>
            <Text style={{ color: phaseAccent[dream.phase], fontSize: 11, fontWeight: '700' }}>{PHASE_LABELS[dream.phase]}</Text>
            {dream.phase === 'Rêve' ? <Text style={{ color: theme.muted, fontSize: 10 }}>Non répertoriée</Text> : null}
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={compact ? 15 : 17} color={theme.muted} />
      </Pressable>
    ))}
    {!items.length ? <Text style={{ color: theme.muted, paddingVertical: 28, fontSize: 13 }}>Aucun rêve pour le moment. Tout commence par une idée.</Text> : null}
  </View>;
}

export default function MySpace() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { items } = useDreams();
  const unfinished = items.filter(d => d.phase === 'Croissance' && !!d.flowerDraft?.story);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{
        flexGrow: 1, paddingHorizontal: compact ? 18 : 22,
        paddingTop: compact ? 18 : 30, paddingBottom: compact ? 45 : 90,
      }}>
        <View style={{ width: '100%', maxWidth: 840, alignSelf: 'center' }}>
          <PageHeader />
          <View style={{marginTop: compact ? 12 : 24, marginBottom: compact ? 26 : 38}}>
            <Text style={{
              fontFamily: 'serif', color: theme.foreground,
              fontSize: compact ? 31 : 39, lineHeight: compact ? 40 : 49,
              letterSpacing: -0.7,
            }}>Mes rêves</Text>
            <Text style={{color:theme.muted,fontSize:compact?12:13,marginTop:4}}>
              Tous mes rêves, de la première idée à leur floraison.
            </Text>
          </View>

          <View style={{width:'100%',maxWidth:840,alignSelf:'center'}}>
            <View style={{ width: '100%', minWidth: 0 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, marginBottom: compact ? 12 : 22,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
                  <Text style={{ fontSize: compact ? 18 : 19, fontWeight: '700', color: theme.foreground }}>Mes rêves</Text>
                  <Text style={{ fontSize: 12, color: theme.muted }}>{items.length}</Text>
                </View>
                <Pressable
                  onPress={() => router.push('/my-dream/new')}
                  accessibilityRole="button"
                  style={{
                    borderRadius: 9, paddingHorizontal: compact ? 12 : 16,
                    paddingVertical: compact ? 11 : 12,
                    backgroundColor: theme.dark ? '#F0EEE9' : '#242322',
                  }}
                >
                  <Text style={{ color: theme.dark ? '#242322' : '#FFFFFF', fontSize: compact ? 11 : 12, fontWeight: '700' }}>
                    {compact ? 'Nouvelle Semence' : 'Planter une Semence'}
                  </Text>
                </Pressable>
              </View>

              <DreamsOverview compact={compact} />

              {unfinished.length ? (
                <View style={{ marginTop: compact ? 25 : 37 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.foreground, marginBottom: 10 }}>Floraisons à terminer</Text>
                  {unfinished.map(d => (
                    <Pressable key={d.id} accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/my-dream/flower/[id]', params: { id: d.id } })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                        borderBottomWidth: 1, borderColor: theme.border, gap: 12,
                      }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.foreground, fontSize: 13, fontWeight: '600' }}>{d.title}</Text>
                        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 5 }}>
                          {d.flowerDraft?.reminderDate ? 'Rappel le ' + d.flowerDraft.reminderDate : 'Histoire en cours de préparation'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.muted} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

          </View>
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
