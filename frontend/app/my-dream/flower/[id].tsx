import React, { useEffect } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
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
  const { items, complete, setFlowerDraft, patch: patchDream, remove } = useDreams();
  const theme = useAppTheme();
  const dream = items.find(d => d.id === id);
  useEffect(()=>{
    if(dream && dream.phase==='Croissance' && !dream.flowerStartedAt){
      patchDream(dream.id,{flowerStartedAt:new Date().toISOString()});
    }
  },[dream?.id,dream?.phase,dream?.flowerStartedAt,patchDream]);

  if (!dream) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><Text style={{ padding: 20, color: theme.foreground }}>Rêve introuvable</Text></SafeAreaView>;

  const draft = dream.flowerDraft || { story: '', attachments: [], reminderDate: '' };
  const patch = (update: Partial<typeof draft>) => setFlowerDraft(dream.id, { ...draft, ...update });
  const ready = !!draft.story.trim() && draft.attachments.some(a => a.kind === 'photo');

  const uproot=()=>{
    const go=()=>{remove(dream.id);router.replace('/my-space');};
    const message='Cette action supprimera définitivement ce rêve, sa Floraison et les données associées.';
    if(Platform.OS==='web'){
      if(typeof window!=='undefined' && window.confirm('Arracher cette plante ?\n'+message))go();
    }else Alert.alert('Arracher cette plante ?',message,[
      {text:'Annuler',style:'cancel'},
      {text:'Arracher',style:'destructive',onPress:go},
    ]);
  };
  const publish = () => {
    const finalPhoto = draft.attachments.find(item => item.kind === 'photo');
    if (!draft.story.trim() || !finalPhoto) {
      const message='Pour publier, ajoute au moins une photographie et raconte ton histoire.';
      if(Platform.OS==='web' && typeof window!=='undefined') window.alert(message);
      else Alert.alert('Floraison',message);
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
          <Text style={{ fontSize: 12, lineHeight: 19, color: theme.muted, marginTop: 8 }}>Les médias sont actuellement conservés sur cet appareil (2 Mo maximum par fichier).</Text>
        </DreamPhaseSection>

        <DreamPhaseSection title="La floraison" subtitle="Tu peux revenir sur ton histoire, la publier ou abandonner ce rêve.">
          <View style={{gap:10}}>
            <Pressable onPress={()=>router.replace('/my-space')} accessibilityRole="button"
              style={{minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:14,
                borderWidth:1,borderColor:theme.border,borderRadius:11,backgroundColor:theme.surface}}>
              <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>
                Continuer à éditer cette fleur plus tard
              </Text>
            </Pressable>
            <Pressable onPress={publish} accessibilityRole="button"
              style={{minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:14,
                borderRadius:11,backgroundColor:'#D71D77'}}>
              <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>
                Afficher (publier) cette fleur
              </Text>
            </Pressable>
            <Pressable onPress={uproot} accessibilityRole="button"
              style={{minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:14,
                borderRadius:11,backgroundColor:'#242322'}}>
              <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Arracher cette plante</Text>
            </Pressable>
          </View>
        </DreamPhaseSection>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
