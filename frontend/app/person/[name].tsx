import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { personPublications } from '@/mocks/publications';
import { PublicationDetail, DetailPanel } from '@/components/publication/PublicationDetail';
export default function PublicPerson() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const person = personPublications.find(p => p.author === name);
  if (!person)
    return (
      <View style={{ padding: 24 }}>
        <Text>Profil introuvable</Text>
      </View>
    );
  return (
    <PublicationDetail item={person}>
      <View style={{ paddingBottom: 22 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#746C64', marginBottom: 10 }}>
          QUI JE SUIS
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: '#333' }}>{person.description}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {person.seeking.map(t => (
            <View
              key={t}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: '#F1F1EF',
                borderRadius: 18,
              }}
            >
              <Text style={{ fontSize: 12 }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <DetailPanel title="Expérience" foldable defaultOpen={false} hideTopBorder>
        <Text style={{ fontSize: 14, lineHeight: 22, color: '#444' }}>
          {person.experience?.trim() || 'Expérience non renseignée.'}
        </Text>
      </DetailPanel>
      <DetailPanel title="Autres talents" foldable defaultOpen={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {person.talents.map(t => (
            <View
              key={t}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 19,
                backgroundColor: '#F1F1EF',
              }}
            >
              <Text style={{ fontSize: 12 }}>{t}</Text>
            </View>
          ))}
        </View>
      </DetailPanel>
    </PublicationDetail>
  );
}
