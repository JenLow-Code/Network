import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { personPublications } from '@/mocks/publications';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
import { DetailMoreDrawer, DetailInfoSection } from '@/components/detail/DetailMoreDrawer';
import { EditorialInline } from '@/components/detail/EditorialInline';
import { usePublication } from '@/lib/api/hooks';
import type { PersonPublication } from '@/domain/publication';
export default function PublicPerson() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const local = personPublications.find(p => p.author === name);
  const remote = usePublication(local ? undefined : name);
  const person = local ?? (remote.item?.type === 'talent' ? (remote.item as PersonPublication) : undefined);
  if (!person && remote.state === 'loading')
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (!person)
    return (
      <View style={{ padding: 24 }}>
        <Text>Profil introuvable</Text>
      </View>
    );
  return (
    <PublicationDetail item={person}>
      <EditorialInline bottomSpace={7}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.35, color: '#746C64' }}>
            {person.seeking.length ? 'RECHERCHE · ' + person.seeking.join(' / ').toUpperCase() : 'MON TALENT'}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: '#77716B' }}>{person.description}</Text>
        </View>
      </EditorialInline>
      <DetailMoreDrawer heading={person.skill} subtitle={'Talent · ' + person.author}>
        <DetailInfoSection title="Qui je suis" text={person.description} />
        <DetailInfoSection title="Expérience" text={person.experience} />
        <DetailInfoSection title="Ce que je recherche" text={person.seeking.join(' · ')} />
        <DetailInfoSection title="Autres talents" text={person.talents.join(' · ')} />
      </DetailMoreDrawer>
    </PublicationDetail>
  );
}
