import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import {workspaceCanvas} from '@/theme/workspaceLayout';
export default function Introduction() {
  const {width}=useWindowDimensions();
  const { id, person } = useLocalSearchParams<{ id: string; person?: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{flex:1,...workspaceCanvas(width),paddingTop:12,paddingBottom:55}}>
        <PageHeader title="Introduction de confiance" />
        <Text style={{ color: '#555', marginTop: 12, lineHeight: 22 }}>
          Le service d’introduction est actuellement indisponible.
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
          <Text style={{ fontSize: 13 }}>2. Proposer l'introduction au porteur de l’aspiration.</Text>
          <Text style={{ fontSize: 13 }}>
            3. Ouvrir une conversation commune seulement après leurs accords.
          </Text>
        </View>
        <Pressable
          disabled
          style={{
            marginTop: 30,
            backgroundColor: '#111',
            padding: 15,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>Introduction indisponible</Text>
        </Pressable>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
