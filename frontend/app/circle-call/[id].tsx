import { Text } from '@/i18n/LocalizedText';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import {workspaceCanvas} from '@/theme/workspaceLayout';
import { myCircle } from '@/mocks/demoCircle';
export default function CircleCall() {
  const {width}=useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const friend = myCircle.find(c => c.id === id);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{flex:1,...workspaceCanvas(width),paddingTop:12,paddingBottom:55}}>
        <PageHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="videocam-outline" size={53} color="#D71D77" />
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 14 }}>
            Appel avec {friend?.name || 'Mon cercle'}
          </Text>
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>
            Les appels vidéo seront activés uniquement pour les relations Mon cercle, après
            autorisation et connexion du backend.
          </Text>
        </View>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
