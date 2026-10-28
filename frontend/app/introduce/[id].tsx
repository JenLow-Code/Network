import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { dreams } from '@/mocks/publications';
import { myCircle } from '@/mocks/demoCircle';
import { Nav } from '@/components/navigation/Nav';
export default function Introduction() {
  const { id, person } = useLocalSearchParams<{ id: string; person?: string }>();
  const d = dreams.find(x => x.id === id),
    friend = myCircle.find(p => p.id === person);
  const [requested, setRequested] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 22 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} />
        </Pressable>
        <Text style={{ fontFamily: 'Caveat_700Bold', fontSize: 33, marginTop: 18 }}>
          Introduction de confiance
        </Text>
        <Text style={{ color: '#555', marginTop: 12, lineHeight: 22 }}>
          Tu connais personnellement {friend?.name || 'cette personne'} et tu penses que ses talents
          pourraient aider à réaliser « {d?.title || 'ce rêve'} ».
        </Text>
        <View
          style={{
            marginTop: 27,
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 12,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: '700' }}>Étapes de l'introduction</Text>
          <Text style={{ fontSize: 13 }}>1. Demander la permission à ton contact.</Text>
          <Text style={{ fontSize: 13 }}>2. Proposer l'introduction au porteur du rêve.</Text>
          <Text style={{ fontSize: 13 }}>
            3. Ouvrir une conversation commune seulement après leurs accords.
          </Text>
        </View>
        <Pressable
          onPress={() => setRequested(true)}
          style={{
            marginTop: 30,
            backgroundColor: '#111',
            padding: 15,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>Demander l'introduction</Text>
        </Pressable>
        {requested ? (
          <Text style={{ marginTop: 16, color: '#888' }}>
            Proposition enregistrée dans cette démo uniquement. Aucune vraie notification n'a été
            envoyée.
          </Text>
        ) : null}
      </View>
      <Nav />
    </SafeAreaView>
  );
}
