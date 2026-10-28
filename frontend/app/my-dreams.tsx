import { Text } from '@/i18n/LocalizedText';
import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { FireHeader } from '@/components/fire/FireHeader';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/i18n/locale';
import { DREAM_PHASES, PHASE_COLORS, PHASE_LABELS, DreamPhase } from '@/domain/publication';

const descriptions: Record<DreamPhase, string> = {
  Rêve: 'Planter une intention',
  Initiation: 'Les premières pousses',
  Croissance: 'Le rêve grandit',
  Témoignage: 'Le rêve est accompli',
};
export default function MyDreams() {
  const { t } = useLocale();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const gap = 10;
  const w = Math.max(120, (area.width - gap) / 2),
    h = Math.max(125, (area.height - gap) / 2);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingHorizontal: 13, paddingTop: 9, paddingBottom: 12 }}>
        <View style={{ paddingHorizontal: 4, paddingBottom: 13 }}>
          <View
            style={{
              position: 'absolute',
              right: 5,
              top: 4,
              zIndex: 5,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <TopActions />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '700', color: '#171717' }}>{t('dreams')}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>
            Un espace pour faire grandir tes rêves.
          </Text>
        </View>
        <View
          onLayout={e =>
            setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }
          style={{ flex: 1 }}
        >
          {area.width > 0 && area.height > 0 ? (
            <View style={{ flex: 1, gap }}>
              {[0, 1].map(row => (
                <View key={row} style={{ flex: 1, flexDirection: 'row', gap }}>
                  {DREAM_PHASES.slice(row * 2, row * 2 + 2).map((phase, i) => {
                    const index = row * 2 + i;
                    return (
                      <Pressable
                        key={phase}
                        accessibilityRole="button"
                        onPress={() =>
                          router.push({ pathname: '/my-dreams/[phase]', params: { phase } })
                        }
                        style={{
                          flex: 1,
                          backgroundColor: PHASE_COLORS[phase].background,
                          borderRadius: 13,
                          padding: 15,
                          justifyContent: 'space-between',
                        }}
                      >
                        <Ionicons
                          name={
                            index === 0
                              ? 'ellipse'
                              : index === 1
                                ? 'leaf-outline'
                                : index === 2
                                  ? 'leaf'
                                  : 'flower-outline'
                          }
                          size={27}
                          color={PHASE_COLORS[phase].foreground}
                        />
                        <View>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: '#202020' }}>
                            {PHASE_LABELS[phase]}
                          </Text>
                          <Text
                            style={{ fontSize: 12, lineHeight: 17, color: '#555', marginTop: 8 }}
                          >
                            {descriptions[phase]}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityLabel="Créer un rêve"
            onPress={() => router.push('/my-dream/new')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -27,
              marginTop: -27,
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#ddd',
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 3,
              zIndex: 5,
            }}
          >
            <Ionicons name="add" size={27} color="#222" />
          </Pressable>
        </View>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
