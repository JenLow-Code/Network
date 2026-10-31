import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { useDreams } from '@/domain/dreamRepository';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';
export default function FlowerPreparation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, complete, setFlowerDraft } = useDreams();
  const dream = items.find(d => d.id === id);
  const [confirmation, setConfirmation] = useState(false);
  if (!dream)
    return (
      <SafeAreaView>
        <Text>Rêve introuvable</Text>
      </SafeAreaView>
    );
  const draft = dream.flowerDraft || { story: '', attachments: [], reminderDate: '' };
  const patch = (update: Partial<typeof draft>) =>
    setFlowerDraft(dream.id, { ...draft, ...update });
  const publish = () => {
    const finalPhoto = draft.attachments.find(item => item.kind === 'photo');
    if (!draft.story.trim() || !finalPhoto) {
      Alert.alert('Floraison', 'Une histoire et une photographie sont nécessaires pour finaliser le rêve et préparer sa couverture Discovery.');
      return;
    }
    complete(
      dream.id,
      draft.story.trim(),
      draft.attachments[0]?.kind === 'video'
        ? 'video'
        : draft.attachments[0]?.kind === 'audio'
          ? 'audio'
          : draft.attachments[0]?.kind === 'photo'
            ? 'photo'
            : 'text',
      draft.attachments[0]?.uri,
    );
    router.replace({ pathname: '/my-dream/[id]', params: { id: dream.id } });
  };
  const validReminder = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    (!dream.goalDate || s <= dream.goalDate) &&
    s >= new Date().toISOString().slice(0, 10);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 13 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={25} />
          </Pressable>
          <TopActions />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#222' }}>
          Préparer ma floraison
        </Text>
        <Text style={{ color: '#666' }}>{dream.title}</Text>
        <Text style={{ fontWeight: '700', marginTop: 7 }}>Mon histoire</Text>
        <TextInput
          multiline
          value={draft.story}
          onChangeText={story => patch({ story })}
          placeholder="Raconte ce que ce rêve a produit..."
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 12,
            minHeight: 140,
            textAlignVertical: 'top',
          }}
        />
        <Text style={{ fontWeight: '700', marginTop: 7 }}>Photos, vidéos, audios et documents</Text>
        <Pressable
          onPress={() =>
            pickFlowerMedia(
              attachments =>
                patch({ attachments: [...draft.attachments, ...attachments].slice(0, 8) }),
              message => Alert.alert('Médias', message),
            )
          }
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#aaa',
            borderRadius: 11,
            padding: 15,
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="add-circle-outline" size={25} color="#252525" />
          <Text style={{ fontSize: 13 }}>Ajouter des médias</Text>
        </Pressable>
        {draft.attachments.map((a, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              padding: 9,
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 10,
            }}
          >
            {a.kind === 'photo' ? (
              <Image source={{ uri: a.uri }} style={{ width: 45, height: 45, borderRadius: 7 }} />
            ) : (
              <Ionicons
                name={
                  a.kind === 'video'
                    ? 'videocam-outline'
                    : a.kind === 'audio'
                      ? 'musical-note-outline'
                      : 'document-outline'
                }
                size={29}
                color="#888"
              />
            )}
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
              {a.name}
            </Text>
            <Pressable
              onPress={() => patch({ attachments: draft.attachments.filter((_, j) => i !== j) })}
              accessibilityLabel="Retirer ce média"
            >
              <Ionicons name="close-circle-outline" size={22} />
            </Pressable>
          </View>
        ))}
        <Text style={{ fontSize: 12, color: '#D71D77' }}>Une photographie est requise pour finaliser cette floraison. C'est la même image qui servira de couverture dans Discovery.</Text>
        <Text style={{ fontSize: 11, color: '#888' }}>
          Démonstration : fichiers locaux du navigateur, maximum 2 Mo chacun. Pas de publication
          serveur ni de partage entre appareils.
        </Text>
        <Text style={{ fontWeight: '700', marginTop: 8 }}>Ma floraison est-elle prête ?</Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <Pressable
            onPress={() => setConfirmation(false)}
            style={{
              flex: 1,
              padding: 13,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text>Pas encore</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmation(true)}
            style={{
              flex: 1,
              padding: 13,
              borderWidth: 1,
              borderColor: confirmation ? '#CB245C' : '#ddd',
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text>Oui, je suis prêt(e)</Text>
          </Pressable>
        </View>
        {!confirmation ? (
          <>
            <Text style={{ fontWeight: '700', marginTop: 7 }}>Me rappeler de terminer</Text>
            <TextInput
              value={draft.reminderDate || ''}
              onChangeText={reminderDate => patch({ reminderDate })}
              placeholder="AAAA-MM-JJ"
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 9, padding: 11 }}
            />
            {draft.reminderDate && !validReminder(draft.reminderDate) ? (
              <Text style={{ fontSize: 11, color: '#AB4354' }}>
                Choisis une date future, avant ta date objectif si elle existe.
              </Text>
            ) : null}
            <Text style={{ fontSize: 11, color: '#888' }}>
              La date sera conservée localement. Les notifications automatiques ne sont pas encore
              activées.
            </Text>
          </>
        ) : (
          <Pressable
            disabled={!draft.story.trim() || !draft.attachments.some(a => a.kind === 'photo')}
            onPress={publish}
            style={{
              padding: 15,
              backgroundColor: draft.story.trim() && draft.attachments.some(a => a.kind === 'photo') ? '#D71D77' : '#bbb',
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Publier cette floraison</Text>
          </Pressable>
        )}
        <Text style={{ fontSize: 11, color: '#999' }}>
          Après publication, la floraison devient consultable. La suppression reste accessible
          depuis Mon espace.
        </Text>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
