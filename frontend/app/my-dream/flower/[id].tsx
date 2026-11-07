import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { useDreams } from '@/domain/dreamRepository';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';
import { useAppTheme } from '@/theme/AppTheme';
import { DreamPhaseHeader, DreamPhaseSection, DreamPhaseButton, DreamPhaseField } from '@/components/dream/DreamPhaseLayout';

export default function FlowerPreparation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, complete, setFlowerDraft } = useDreams();
  const theme = useAppTheme();
  const dream = items.find(d => d.id === id);
  const [confirmation, setConfirmation] = useState(false);

  if (!dream) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><Text style={{ padding: 20, color: theme.foreground }}>Rêve introuvable</Text></SafeAreaView>;

  const draft = dream.flowerDraft || { story: '', attachments: [], reminderDate: '' };
  const patch = (update: Partial<typeof draft>) => setFlowerDraft(dream.id, { ...draft, ...update });
  const validReminder = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (!dream.goalDate || date <= dream.goalDate) &&
    date >= new Date().toISOString().slice(0, 10);
  const ready = !!draft.story.trim() && draft.attachments.some(a => a.kind === 'photo');

  const publish = () => {
    const finalPhoto = draft.attachments.find(item => item.kind === 'photo');
    if (!draft.story.trim() || !finalPhoto) {
      Alert.alert('Floraison', 'Une histoire et une photographie sont nécessaires pour finaliser ce rêve.');
      return;
    }
    complete(
      dream.id,
      draft.story.trim(),
      draft.attachments[0]?.kind === 'video' ? 'video' :
        draft.attachments[0]?.kind === 'audio' ? 'audio' :
        draft.attachments[0]?.kind === 'photo' ? 'photo' : 'text',
      draft.attachments[0]?.uri,
    );
    router.replace({ pathname: '/my-dream/[id]', params: { id: dream.id } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 19, paddingTop: 10, paddingBottom: 65, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <DreamPhaseHeader dream={dream} phase="Témoignage" onBack={() => router.back()}
          onNavigate={phase => router.replace({pathname:'/my-dream/[id]',params:{id:dream.id,view:phase}})}
          summary="Il est temps de raconter ce que ce rêve a produit." />
        <DreamPhaseSection title="Mon histoire" subtitle="Ce que tu as vécu, accompli et appris pendant ce chemin.">
          <DreamPhaseField label="Raconter ma floraison" value={draft.story} onChange={story => patch({ story })} placeholder="Raconte ce que ce rêve a produit…" multiline />
        </DreamPhaseSection>

        <DreamPhaseSection title="Images & souvenirs" subtitle="Ajoute les médias qui permettront de découvrir ton résultat.">
          <Pressable
            onPress={() => pickFlowerMedia(
              attachments => patch({ attachments: [...draft.attachments, ...attachments].slice(0, 8) }),
              message => Alert.alert('Médias', message),
            )}
            style={{ padding: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 12, alignItems: 'center', gap: 9, marginBottom: 10 }}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.foreground} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.foreground }}>Ajouter des médias</Text>
          </Pressable>
          {draft.attachments.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, marginBottom: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 12 }}>
              {item.kind === 'photo'
                ? <Image source={{ uri: item.uri }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                : <Ionicons name={item.kind === 'video' ? 'videocam-outline' : item.kind === 'audio' ? 'musical-note-outline' : 'document-outline'} size={26} color={theme.muted} />}
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.foreground }}>{item.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Retirer ce média" onPress={() => patch({ attachments: draft.attachments.filter((_, j) => index !== j) })} style={{ padding: 6 }}>
                <Ionicons name="close-outline" size={20} color={theme.muted} />
              </Pressable>
            </View>
          ))}
          <Text style={{ fontSize: 12, lineHeight: 19, color: theme.muted, marginTop: 8 }}>Une photographie est nécessaire pour la couverture Discovery. Les médias sont encore conservés localement sur cet appareil (2 Mo maximum par fichier).</Text>
        </DreamPhaseSection>

        <DreamPhaseSection title="Prêt pour la floraison ?" subtitle="Tu peux publier ton résultat ou continuer à préparer ton histoire.">
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable onPress={() => setConfirmation(false)} accessibilityRole="button" accessibilityState={{ selected: !confirmation }}
              style={{ flex: 1, padding: 13, alignItems: 'center', borderRadius: 10, backgroundColor: !confirmation ? (theme.dark ? '#35373A' : '#E7E5E0') : theme.surface, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600' }}>Pas encore</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmation(true)} accessibilityRole="button" accessibilityState={{ selected: confirmation }}
              style={{ flex: 1, padding: 13, alignItems: 'center', borderRadius: 10, backgroundColor: confirmation ? (theme.dark ? '#35373A' : '#E7E5E0') : theme.surface, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600' }}>Oui, je suis prêt(e)</Text>
            </Pressable>
          </View>
          {!confirmation ? <>
            <View style={{ height: 19 }} />
            <DreamPhaseField label="Me rappeler de terminer" value={draft.reminderDate || ''} onChange={reminderDate => patch({ reminderDate })} placeholder="AAAA-MM-JJ" />
            {draft.reminderDate && !validReminder(draft.reminderDate)
              ? <Text style={{ color: '#AB4354', fontSize: 12 }}>Choisis une date future, avant la date cible si elle existe.</Text> : null}
            <Text style={{ fontSize: 11, color: theme.muted, lineHeight: 18 }}>La date est conservée sur cet appareil. Les notifications automatiques ne sont pas encore activées.</Text>
          </> : <DreamPhaseButton label="Publier cette floraison" onPress={publish} disabled={!ready} />}
        </DreamPhaseSection>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
