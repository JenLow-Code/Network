import { Text } from '@/i18n/LocalizedText';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { useDreams } from '@/domain/dreamRepository';
import { useLocale } from '@/i18n/locale';
export default function Participants() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useDreams(),
    { tr } = useLocale();
  const dream = items.find(d => d.id === id);
  const [message, setMessage] = useState(
    'Identity data will appear here once authenticated API access is enabled.',
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} />
        </Pressable>
        <Text style={{ fontFamily: 'Caveat_700Bold', fontSize: 32, marginTop: 17 }}>
          {tr('participantTitle')}
        </Text>
        <Text style={{ fontSize: 12, color: '#777', lineHeight: 19, marginTop: 9 }}>
          {tr('participantHint')}
        </Text>
        <Text style={{ fontWeight: '700', fontSize: 15, marginTop: 22 }}>
          {dream?.title || 'Dream'}
        </Text>
        <Text style={{ color: '#999', fontSize: 12, marginTop: 26 }}>{message}</Text>
        <Text style={{ color: '#999', fontSize: 11, marginTop: 20 }}>
          Private by design: no public list of members and no imaginary participants. The D1 API
          route /v1/dreams/:id/participants checks accepted ownership.
        </Text>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
