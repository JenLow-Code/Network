import { Text } from '@/i18n/LocalizedText';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { OfflineDreamImage } from '@/components/publication/OfflineDreamImage';
import { DREAM_PHASES, DreamPhase, PHASE_COLORS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import {useAppTheme} from '@/theme/AppTheme';
import DreamQuickActions from '@/components/dream/DreamQuickActions';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import {workspaceCanvas,WORKSPACE_TITLE_GAP,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT} from '@/theme/workspaceLayout';
export default function Stage() {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const { phase } = useLocalSearchParams<{ phase: string }>();
  const current = DREAM_PHASES.find(x => x === phase) as DreamPhase | undefined;
  const { items } = useDreams();
  const [longDream,setLongDream]=useState<DreamEntry|null>(null);
  const filtered = items.filter(x => x.phase === current);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor:theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{...workspaceCanvas(width),paddingTop:12,paddingBottom:65}}>
        <PageHeader title={current || 'Mes projets'} />
        <View style={{flexDirection:'row',justifyContent:'flex-end',marginBottom:10}}>
          <Pressable
            onPress={() => router.push('/my-dream/new')}
            style={{ padding: 8 }}
            accessibilityLabel="Créer un rêve"
          >
            <Ionicons name="add-circle" size={29} color="#D71D77" />
          </Pressable>
        </View>
        {filtered.map(d => (
          <Pressable
            key={d.id} onLongPress={()=>setLongDream(d)} delayLongPress={460}
            accessibilityHint="Maintenir pour accéder aux options du rêve"
            onPress={() => router.push({ pathname: '/my-dream/[id]', params: { id: d.id, ...(d.phase==='Témoignage'?{}:{view:d.phase}) } })}
            style={{
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 13,
              marginBottom: 12,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 90 }}>
              <OfflineDreamImage uri={d.image} height={88} radius={9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 14 }}>{d.title}</Text>
              <Text style={{ fontSize: 11, color: '#777', marginTop: 7 }}>{d.phase}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </Pressable>
        ))}
        {!filtered.length ? (
          <Text style={{ color: '#888', paddingTop: 30, textAlign: 'center' }}>
            Aucun rêve dans cette phase pour l’instant.
          </Text>
        ) : null}
      </ScrollView>
      <DreamQuickActions dream={longDream} onClose={()=>setLongDream(null)}/>
      <Nav />
    </SafeAreaView>
  );
}
