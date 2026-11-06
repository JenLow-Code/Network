import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';
import { phaseAccent } from '@/components/dream/DreamPhaseLayout';

function DreamsOverview() {
  const { items } = useDreams();
  const theme = useAppTheme();
  return (
    <View>
      {items.map((dream, index) => (
        <Pressable
          key={dream.id}
          accessibilityRole="button"
          accessibilityLabel={dream.title + ', ' + PHASE_LABELS[dream.phase]}
          onPress={() => router.push({ pathname: '/my-dream/[id]', params: { id: dream.id } })}
          style={{
            minHeight: 83,
            paddingVertical: 17,
            paddingHorizontal: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderTopWidth: index === 0 ? 1 : 0,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 16, lineHeight: 23, fontWeight: '600', color: theme.foreground }} numberOfLines={2}>
              {dream.title}
            </Text>
            {dream.summary ? (
              <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 18 }} numberOfLines={1}>
                {dream.summary}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5, maxWidth: 118 }}>
            <Text style={{ color: phaseAccent[dream.phase], fontSize: 11, fontWeight: '700' }}>
              {PHASE_LABELS[dream.phase]}
            </Text>
            {dream.phase === 'Rêve' ? (
              <Text style={{ color: theme.muted, fontSize: 10 }}>Non répertoriée</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={17} color={theme.muted} />
        </Pressable>
      ))}
      {items.length === 0 ? (
        <Text style={{ color: theme.muted, paddingVertical: 28, fontSize: 13 }}>
          Aucun rêve pour le moment. Tout commence par une idée.
        </Text>
      ) : null}
    </View>
  );
}

export default function MySpace() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const { items } = useDreams();
  const unfinished = items.filter(d => d.phase === 'Croissance' && !!d.flowerDraft?.story);
  const shortcuts = [
    { title: 'Mon profil', detail: 'Informations et talents', path: '/profile' as const },
    { title: 'Mes prières', detail: 'Prière et intentions', path: '/prayers' as const },
    { title: 'Paramètres', detail: 'Compte et préférences', path: '/settings' as const },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 90 }}>
        <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 38 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontFamily: 'serif', color: theme.foreground, fontSize: wide ? 39 : 34, lineHeight: wide ? 49 : 43, letterSpacing: -0.7 }}>
                Mon espace
              </Text>
              <Text style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>Mes rêves, mes projets, mon chemin.</Text>
            </View>
            <TopActions />
          </View>

          <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 65 : 39, alignItems: 'flex-start' }}>
            <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: theme.foreground }}>Mes rêves</Text>
                  <Text style={{ fontSize: 12, color: theme.muted }}>{items.length}</Text>
                </View>
                <Pressable
                  onPress={() => router.push('/my-dream/new')}
                  accessibilityRole="button"
                  style={{ borderRadius: 9, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.dark ? '#F0EEE9' : '#242322' }}
                >
                  <Text style={{ color: theme.dark ? '#242322' : '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Créer une Semence</Text>
                </Pressable>
              </View>
              <DreamsOverview />

              {unfinished.length > 0 ? (
                <View style={{ marginTop: 37 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.foreground, marginBottom: 10 }}>
                    Floraisons à terminer
                  </Text>
                  {unfinished.map(d => (
                    <Pressable
                      key={d.id}
                      onPress={() => router.push({ pathname: '/my-dream/flower/[id]', params: { id: d.id } })}
                      accessibilityRole="button"
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.border, gap: 12 }}
                    >
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

            <View style={{ width: wide ? 270 : '100%', paddingTop: wide ? 4 : 0 }}>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 19 }}>MON COMPTE</Text>
              {shortcuts.map((item, index) => (
                <Pressable
                  key={item.path}
                  onPress={() => router.push(item.path)}
                  accessibilityRole="button"
                  style={{ paddingVertical: 17, borderTopWidth: index === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: theme.border }}
                >
                  <Text style={{ fontSize: 14, color: theme.foreground, fontWeight: '600' }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, marginTop: 5, color: theme.muted }}>{item.detail}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
