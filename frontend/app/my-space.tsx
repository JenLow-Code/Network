import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { useApp } from '@/context/AppContext';
import { PHASE_COLORS, PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';

function DreamsOverview() {
  const { items } = useDreams();
  const theme = useAppTheme();
  return (
    <View style={{ gap: 9 }}>
      {items.map(d => {
        const isPrivate = d.visibility === 'private' || (d.phase === 'Rêve' && d.visibility !== 'public' && d.id.startsWith('local-'));
        const phaseColor = PHASE_COLORS[d.phase].foreground;
        return (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityLabel={d.title + ', ' + PHASE_LABELS[d.phase] + (isPrivate ? ', privé' : '')}
            onPress={() => router.push({ pathname: '/my-dream/[id]', params: { id: d.id } })}
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 13,
              paddingHorizontal: 15,
              borderRadius: 12,
              minHeight: 85,
              backgroundColor: theme.dark ? '#292B30' : '#F1F0EE',
            }}
          >
            <View style={{ width: 53, height: 53, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.dark ? '#34363A' : '#E7E4DF', borderRadius: 9 }}>
              <View style={{ width: 24, height: 24, backgroundColor: phaseColor, opacity: .85, borderRadius: d.phase === 'Rêve' ? 12 : d.phase === 'Témoignage' ? 5 : 9 }} />
            </View>
            <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.foreground }}>{d.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ color: phaseColor, fontSize: 11, fontWeight: '600' }}>{PHASE_LABELS[d.phase]}</Text>
                {isPrivate ? <Ionicons name="lock-closed-outline" size={13} color={theme.muted} /> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.muted} />
          </Pressable>
        );
      })}
      <Pressable onPress={() => router.push('/my-dream/new')} accessibilityRole="button"
        style={{ flexDirection: 'row', gap: 11, alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.dark ? '#6B5660' : '#D3A3BB' }}>
        <Ionicons name="add-circle-outline" size={23} color="#D71D77" />
        <Text style={{ color: '#D71D77', fontWeight: '700', fontSize: 13 }}>Créer une Semence</Text>
      </Pressable>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.foreground, marginBottom: 12 }}>Tous mes rêves</Text>
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
