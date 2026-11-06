import { Text } from '@/i18n/LocalizedText';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDreams } from '@/domain/dreamRepository';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { useAppTheme } from '@/theme/AppTheme';
import { DreamPhaseButton, DreamPhaseField } from '@/components/dream/DreamPhaseLayout';

export default function NewDream() {
  const { inspiration } = useLocalSearchParams<{ inspiration?: string }>();
  const { create } = useDreams();
  const theme = useAppTheme();
  const [title, setTitle] = useState(inspiration ? 'Autour de ' + inspiration : '');
  const [summary, setSummary] = useState(inspiration ? 'Cette inspiration me donne envie de créer quelque chose de nouveau.' : '');
  const [image, setImage] = useState('');
  const valid = title.trim().length > 2;

  const save = () => {
    if (!valid) return;
    const id = create({
      title: title.trim(),
      summary: summary.trim(),
      image: image.trim(),
      needs: [],
    });
    // All newly created dreams enter the same redesigned central DreamHub.
    router.replace({ pathname: '/my-dream/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 21, paddingTop: 18, paddingBottom: 70 }}>
        <View style={{ width: '100%', maxWidth: 660, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 38 }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour" style={{ padding: 8, marginLeft: -8 }}>
              <Ionicons name="arrow-back-outline" color={theme.foreground} size={23}/>
            </Pressable>
            <TopActions />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 17 }}>
            <View style={{ height: 2, width: 27, backgroundColor: '#B88962', borderRadius: 2 }}/>
            <Text style={{ color: '#B88962', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }}>SEMENCE · 01 / 04</Text>
          </View>
          <Text style={{ fontFamily: 'serif', fontSize: 37, lineHeight: 46, letterSpacing: -0.6, color: theme.foreground, marginBottom: 13 }}>
            Donner naissance à un rêve
          </Text>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 23, marginBottom: 33 }}>
            Une idée suffit pour commencer. Tu pourras ensuite rassembler tes inspirations et faire grandir ce projet.
          </Text>

          <DreamPhaseField label="Nom de mon rêve *" value={title} onChange={setTitle} placeholder="Qu'aimerais-tu accomplir ?" />
          <Text style={{ color: theme.muted, fontSize: 11, marginTop: -6, marginBottom: 18 }}>
            Le nom sera conservé lors des étapes suivantes.
          </Text>
          <DreamPhaseField label="Mon but" value={summary} onChange={setSummary}
            placeholder="Décris simplement ce que tu souhaites réaliser…" multiline />

          <View style={{ borderTopWidth: 1, borderColor: theme.border, marginTop: 19, paddingTop: 25 }}>
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700', marginBottom: 7 }}>Image de couverture</Text>
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 20, marginBottom: 16 }}>
              Facultative. Tu peux choisir une image maintenant ou plus tard.
            </Text>
            <Pressable
              onPress={() => pickDreamImage(setImage, message => Alert.alert('Image', message))}
              accessibilityRole="button"
              style={{
                borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border,
                backgroundColor: theme.surface, borderRadius: 13,
                minHeight: image ? 188 : 110, overflow: 'hidden',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {image ? (
                <>
                  <Image source={{ uri: image }} resizeMode="cover" style={{ width: '100%', height: 188 }}/>
                  <View style={{ backgroundColor: theme.surface, padding: 11, width: '100%', alignItems: 'center' }}>
                    <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 12 }}>Changer l'image</Text>
                  </View>
                </>
              ) : (
                <Text style={{ color: theme.foreground, fontSize: 13, fontWeight: '600' }}>Choisir une image</Text>
              )}
            </Pressable>
          </View>
          <View style={{ marginTop: 28 }}>
            <DreamPhaseButton label="Créer ma Semence" onPress={save} disabled={!valid}/>
          </View>
          <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: 15, textAlign: 'center' }}>
            Ta Semence ne figure pas dans Discovery. Elle reste accessible par un lien direct jusqu'à la Germination.
          </Text>
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
