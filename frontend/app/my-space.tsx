import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { useApp } from '@/context/AppContext';
import { DREAM_PHASES, PHASE_COLORS, PHASE_LABELS, PHASE_SYMBOLS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';

function DreamsOverview() {
  const { items } = useDreams();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {DREAM_PHASES.map(phase => (
        <View
          key={phase}
          style={{
            width: '48%',
            height: 120,
            borderRadius: 13,
            backgroundColor: PHASE_COLORS[phase].background,
            overflow: 'hidden',
          }}
        >
          <Pressable
            onPress={() => router.push({ pathname: '/my-dreams/[phase]', params: { phase } })}
            style={{ flex: 1, padding: 15, justifyContent: 'space-between' }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '700', color: PHASE_COLORS[phase].foreground }}>
                {PHASE_LABELS[phase]}
              </Text>
              <DreamPhaseIcon phase={phase} size={22} />
            </View>
            <Text style={{ fontSize: 12, color: '#444' }}>
              {items.filter(d => d.phase === phase).length} rêve(s)
            </Text>
          </Pressable>
          {phase === 'Rêve' ? (
            <Pressable
              onPress={() => router.push('/my-dream/new')}
              accessibilityLabel="Créer une semence"
              style={{
                position: 'absolute',
                right: 9,
                bottom: 9,
                width: 37,
                height: 37,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,.8)',
              }}
            >
              <Ionicons name="add-circle-outline" size={28} color="#252525" />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
export default function MySpace() {
  const app = useApp();
  const theme = useAppTheme();
  const { items: myDreams } = useDreams();
  const unfinished = myDreams.filter(d => d.phase === 'Croissance' && !!d.flowerDraft?.story);
  const sections = [
    {
      title: 'Mon profil',
      detail: 'Mes informations et talents',
      icon: 'person-outline' as const,
      path: '/profile' as const,
    },
    {
      title: 'Mes prières',
      detail: 'Toutes mes prières et leur répétition',
      icon: 'heart-outline' as const,
      path: '/prayers' as const,
    },
    {
      title: 'Paramètres',
      detail: 'Compte et préférences',
      icon: 'settings-outline' as const,
      path: '/settings' as const,
    },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 50 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 29, fontWeight: '700', color: theme.foreground }}>
            Mon espace
          </Text>
          <TopActions />
        </View>
        <View
          style={{
            marginTop: 14,
            marginBottom: 20,
            paddingBottom: 18,
            borderBottomWidth: 1,
            borderColor: '#eee',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Mes rêves</Text>
          <DreamsOverview />
        </View>
        {unfinished.length ? (
          <View style={{ marginBottom: 17, gap: 7 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.foreground }}>
              Floraisons à terminer
            </Text>
            {unfinished.map(d => (
              <Pressable
                key={d.id}
                onPress={() =>
                  router.push({ pathname: '/my-dream/flower/[id]', params: { id: d.id } })
                }
                style={{
                  backgroundColor: '#F7E9F0',
                  borderRadius: 10,
                  padding: 12,
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="flower-outline" size={21} color="#93466A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: '#32222B' }}>
                    {d.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#775267' }}>
                    {d.flowerDraft?.reminderDate
                      ? 'Rappel prévu le ' + d.flowerDraft.reminderDate
                      : 'Ta fleur attend encore son histoire'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#775267" />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 9 }}>
          {sections.map(s => (
            <Pressable
              key={s.title}
              onPress={() => router.push(s.path)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
                padding: 14,
                borderWidth: 1,
                borderColor: '#ececec',
                borderRadius: 13,
              }}
            >
              <View
                style={{
                  width: 39,
                  height: 39,
                  borderRadius: 20,
                  backgroundColor: '#f5f5f5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={s.icon} size={21} color="#252525" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{s.title}</Text>
                <Text style={{ fontSize: 11, color: '#777', marginTop: 3 }}>{s.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
