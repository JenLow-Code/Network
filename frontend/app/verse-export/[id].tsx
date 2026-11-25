import { Text } from '@/i18n/LocalizedText';
import React from 'react';
import { Pressable, Share, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { usePublication } from '@/lib/api/hooks';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import {workspaceCanvas} from '@/theme/workspaceLayout';
export default function VerseExport() {
  const {width}=useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote=usePublication(id);
  const item=remote.state==='ready'&&remote.item?.id===id&&remote.item.type==='bible'?remote.item:null;
  const verse=item?.excerpt?.trim()||'';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{flex:1,...workspaceCanvas(width),paddingTop:12,paddingBottom:55}}>
        <PageHeader title="Exporter un verset" />
        <Text style={{ fontSize: 16, lineHeight: 26, marginTop: 25 }}>
          {remote.state==='loading'?'Chargement…':verse||'Texte du verset indisponible.'}
        </Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 14 }}>
          {item?.reference||''}
        </Text>
        <Pressable
          disabled={!item||!verse}
          onPress={() => {
            if (item&&verse) void Share.share({message:verse+'\n'+item.reference});
          }}
          style={{
            marginTop: 33,
            backgroundColor: item&&verse?'#111':'#999',
            padding: 15,
            borderRadius: 9,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>Partager / enregistrer le texte du verset</Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: '#999', marginTop: 18 }}>
          V1 : export du texte des versets uniquement. Aucun téléchargement de musique.
        </Text>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
