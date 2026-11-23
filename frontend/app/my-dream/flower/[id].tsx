import React, { useEffect, useState } from 'react';
import {
  Alert, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput,
  View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { useDreams } from '@/domain/dreamRepository';
import { isPublishedFlower, type DreamMedia, type FlowerDraft } from '@/domain/dreamWorkspace';
import { buildGrowthDays } from '@/domain/growthTimeline';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import { DreamPhaseHeader } from '@/components/dream/DreamPhaseLayout';
import DreamWorkspaceShortcuts, { DreamWorkspaceShortcutRow } from '@/components/dream/DreamWorkspaceShortcuts';
import FlowerJourneyRecap from '@/components/dream/FlowerJourneyRecap';
import DreamMilestoneActions from '@/components/dream/DreamMilestoneActions';

const MAGENTA = '#D71D77';
const inspirationTypeLabel: Record<string, string> = {
  image: 'Image', link: 'Lien', bookmark: 'Lien',
  'bible-verse': 'Verset', 'publication-ref': 'Publication',
  'profile-ref': 'Profil', document: 'Document', pdf: 'Document',
  audio: 'Audio', video: 'Vidéo', quote: 'Citation',
  note: 'Note', music: 'Musique',
};
const localDay = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
};
const validDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0') === value;
};
const readableDate = (value?: string) => {
  if (!value || !validDay(value.slice(0, 10))) return '—';
  return new Date(value.slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};
function ReadOnlySheet({ title, visible, onClose, children }: {
  title: string; visible: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(23,20,22,.46)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
          onPress={onClose} style={{ flex: 1 }}/>
        <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 23,
          borderTopRightRadius: 23, maxHeight: '78%', paddingTop: 23, paddingHorizontal: 21 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 23, fontFamily: 'serif', color: theme.foreground }}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
              onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={theme.foreground}/>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function FlowerPreparation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, complete, setFlowerDraft, setFlowerVerifiedTalentNames, confirmFlower, remove } = useDreams();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const ws=workspaceLayout(width);
  const dream = items.find(item => item.id === id);
  const draft: FlowerDraft = dream?.flowerDraft || { story: '', attachments: [] };
  const [achievementDate, setAchievementDate] = useState(localDay());
  const [legacyDateOpen, setLegacyDateOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [inspirationPickerOpen, setInspirationPickerOpen] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const [dateError, setDateError] = useState('');

  // A published Floraison opens its completed presentation, never the editor.
  useEffect(() => {
    if (dream && isPublishedFlower(dream)) {
      router.replace({ pathname: '/my-dream/[id]', params: { id: dream.id } });
    }
  }, [dream?.id, dream?.phase, !!dream?.testimony, !!dream?.resultImage, !!dream?.fruitAt]);

  // Backfill names for older Floraison events exclusively from accepted
  // invitations. This enriches the story without modifying Growth history.
  useEffect(() => {
    if (!dream?.serverDreamId || dream.phase !== 'Témoignage' ||
      isPublishedFlower(dream)) return;
    let live = true;
    void api<{items:{
      needId: string;
      status: string;
      recipient?: { displayName?: string };
    }[]}>(
      '/api/dreams/' + encodeURIComponent(dream.serverDreamId) +
        '/need-invitations',
      { auth: 'required' },
    ).then(({items}) => {
      if (!live) return;
      const names: Record<string, string> = {};
      items.filter(item => item.status === 'accepted').forEach(item => {
        const name = item.recipient?.displayName?.trim();
        if (name && item.needId) names[item.needId] = name;
      });
      if (Object.keys(names).length) setFlowerVerifiedTalentNames(dream.id, names);
    }).catch(() => {
      // An offline session or missing authorization cannot verify an identity.
    });
    return () => { live = false; };
  }, [dream?.id, dream?.serverDreamId, dream?.phase]);

  if (!dream) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ padding: 20, color: theme.foreground }}>Rêve introuvable</Text>
    </SafeAreaView>
  );
  if (isPublishedFlower(dream)) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background,
      justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ color: theme.foreground, fontSize: 15, textAlign: 'center' }}>
        Cette fleur est déjà publiée.
      </Text>
      <Pressable accessibilityRole="button"
        accessibilityLabel="Voir ma fleur publiée"
        onPress={() => router.replace({
          pathname: '/my-dream/[id]', params: { id: dream.id },
        })} style={{ marginTop: 15, padding: 12 }}>
        <Text style={{ color: MAGENTA, fontWeight: '700' }}>Voir ma fleur</Text>
      </Pressable>
    </SafeAreaView>
  );

  // The phase, not an editor timestamp or a missing legacy date, is authoritative.
  const confirmed = dream.phase === 'Témoignage';
  const achievedOn = draft.achievedOn || (!dream.testimony ? undefined :
    dream.testimony.date.slice(0, 10));
  const photo = draft.attachments.find(item => item.kind === 'photo');
  const growthDays = buildGrowthDays(dream);
  const patch = (changes: Partial<FlowerDraft>) =>
    setFlowerDraft(dream.id, { ...draft, ...changes });
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
    else Alert.alert(title, message);
  };
  const confirmAchievement = () => {
    if (dream.phase !== 'Croissance') return;
    if (!validDay(achievementDate) || achievementDate > localDay()) {
      setDateError("Choisis une date réelle, aujourd'hui ou dans le passé.");
      return;
    }
    if (!acknowledged) return;
    // This is the only entry point that locks Croissance. Opening the route
    // or drafting a story never counts as confirming the achievement.
    confirmFlower(dream.id, achievementDate);
    setDateError('');
  };
  const selectMedia = () => pickFlowerMedia(
    attachments => patch({ attachments: [...draft.attachments, ...attachments].slice(0, 8) }),
    message => notify('Médias', message),
  );
  const publish = () => {
    if (!confirmed) {
      notify('Floraison', 'Ce rêve est encore en Croissance.');
      return;
    }
    if (!validDay(draft.achievedOn || '')) {
      setLegacyDateOpen(true);
      notify('Date de réalisation', 'Indique la date réelle de réalisation dans Floraison avant de publier.');
      return;
    }
    if (!draft.story.trim() || !photo) {
      notify('Floraison', 'Pour publier, ajoute au moins une photographie et raconte ton histoire.');
      return;
    }
    const first = draft.attachments[0];
    complete(dream.id, draft.story.trim(), first?.kind === 'video' ? 'video' :
      first?.kind === 'audio' ? 'audio' : first?.kind === 'photo' ? 'photo' : 'text',
      first?.uri);
    router.replace({ pathname: '/my-dream/[id]', params: { id: dream.id } });
  };
  const uproot = () => {
    const go = () => { remove(dream.id); router.replace('/my-space'); };
    const message = 'Cette action supprimera définitivement ce rêve, sa Floraison et les données associées.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Arracher cette plante ?\n' + message)) go();
    } else Alert.alert('Arracher cette plante ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Arracher', style: 'destructive', onPress: go },
    ]);
  };
  const sectionTitle = { color: theme.foreground, fontSize: 22,
    fontFamily: 'serif' as const, lineHeight: 29 };
  const muted = { color: theme.muted, fontSize: 12, lineHeight: 19 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1, backgroundColor:'transparent' }}
        contentContainerStyle={{ paddingLeft:ws.contentGutter,paddingRight:ws.gutter,
          paddingTop: 10, paddingBottom: 70, maxWidth: ws.maxWidth, width: '100%',
          alignSelf: 'center' }}>
        <DreamPhaseHeader dream={dream} phase="Témoignage"
          onBack={() => router.replace('/my-space')}
          onNavigate={phase => {
            if (phase !== 'Témoignage') router.replace({
              pathname: '/my-dream/[id]', params: { id: dream.id, view: phase },
            });
          }}
          summary="Il est temps de raconter ce que ce rêve a produit." />

        {/* The four existing workspace links remain beside the two dates. */}
        <View style={{ flexDirection: 'row', gap: 13, marginTop: 0, marginBottom: 21,
          justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: narrow ? 0.82 : 0.9, gap: 15, paddingTop: 5 }}>
            <View style={{ gap: 3 }}>
              <Text style={{ fontSize: 9, color: theme.muted, letterSpacing: 1 }}>
                OBJECTIF INITIAL
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="calendar-outline" size={13} color={theme.muted}/>
                <Text style={{ fontSize: 11, color: theme.muted }}>
                  {readableDate(dream.goalDate)}
                </Text>
              </View>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: MAGENTA,
                letterSpacing: 1 }}>RÉALISÉ LE</Text>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center',
                flexWrap: 'wrap' }}>
                <Text style={{ color: MAGENTA, fontSize: narrow ? 14 : 18,
                  fontWeight: '800' }}>
                  {confirmed ? (achievedOn ? readableDate(achievedOn) : 'Date à renseigner')
                    : 'À confirmer'}
                </Text>
              </View>
              {confirmed && !achievedOn ? (
                <Pressable accessibilityRole="button"
                  accessibilityLabel="Renseigner la date de réalisation"
                  onPress={() => { setAchievementDate(localDay()); setLegacyDateOpen(true); }}
                  style={{ alignSelf: 'flex-start', paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, color: MAGENTA, fontWeight: '600' }}>
                    Ajouter la date
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1.25, alignItems: 'flex-end' }}>
            <DreamWorkspaceShortcuts dream={dream} showLibrary/>
            <DreamWorkspaceShortcutRow label="Ressources" icon="people-outline"
              onPress={() => setResourcesOpen(true)}/>
            <DreamWorkspaceShortcutRow label="Logbook" icon="book-outline"
              onPress={() => setLogbookOpen(true)}/>
          </View>
        </View>

        {/* The original wish remains visible; no duplicated flower title, date
            or separate thumbnail of the dream's atmospheric cover. */}
        <View style={{ paddingTop: 5 }}>
          <Text style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: '700',
            color: theme.muted, marginBottom: 8 }}>AU COMMENCEMENT</Text>
          <Text style={{ color: theme.foreground, fontFamily: 'serif',
            fontSize: narrow ? 19 : 22, lineHeight: 30, marginBottom: 29 }}>
            {dream.summary || dream.title}
          </Text>

          {(dream.blocks || []).length > 0 ? (
            <View style={{ marginBottom: 28 }}>
              <Pressable accessibilityRole="button"
                accessibilityState={{ expanded: inspirationPickerOpen }}
                accessibilityLabel="Choisir les inspirations à partager"
                onPress={() => setInspirationPickerOpen(value => !value)}
                style={{ flexDirection: 'row', alignItems: 'center',
                  gap: 9, paddingVertical: 10 }}>
                <Ionicons name="albums-outline" size={17} color={theme.muted}/>
                <Text style={{ flex: 1, color: theme.foreground,
                  fontSize: 13, fontWeight: '600' }}>
                  Les inspirations du commencement
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>
                  {(draft.inspirationIds || []).length} retenue(s)
                </Text>
                <Ionicons name={inspirationPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={16} color={theme.muted}/>
              </Pressable>
              {inspirationPickerOpen ? (
                <View style={{ marginTop: 7 }}>
                  <Text style={{ ...muted, marginBottom: 13 }}>
                    Sélectionne les références que tu souhaites montrer dans
                    l’histoire publique. Le reste de ton espace Semence reste privé.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap',
                    justifyContent: 'space-between', rowGap: 9 }}>
                    {(dream.blocks || []).map(block => {
                      const checked = (draft.inspirationIds || []).includes(block.id);
                      return (
                        <Pressable key={block.id} accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          accessibilityLabel={'Partager inspiration ' +
                            (block.title || block.content.slice(0, 40))}
                          onPress={() => patch({
                            inspirationIds: checked
                              ? (draft.inspirationIds || []).filter(id => id !== block.id)
                              : [...(draft.inspirationIds || []), block.id],
                          })}
                          style={{ width: block.tileSize?.startsWith('2x')
                              ? '100%' : '48.5%',
                            borderRadius: 13, borderWidth: 1,
                            borderColor: checked ? MAGENTA : theme.border,
                            backgroundColor: theme.surface,
                            padding: 12, gap: 8, minHeight: 86,
                            overflow: 'hidden' }}>
                          <View style={{ flexDirection: 'row',
                            justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: theme.muted,
                              fontSize: 9, textTransform: 'uppercase',
                              letterSpacing: .7 }}>{inspirationTypeLabel[block.kind] || 'Inspiration'}</Text>
                            <Ionicons name={checked ? 'checkbox' : 'square-outline'}
                              size={18} color={checked ? MAGENTA : theme.muted}/>
                          </View>
                          {block.kind === 'image' && !!block.content ? (
                            <Image source={{ uri: block.content }}
                              resizeMode="cover" style={{ width: '100%',
                                height: 100, borderRadius: 8 }}/>
                          ) : null}
                          <Text numberOfLines={3} style={{
                            color: theme.foreground, fontSize: 12,
                            lineHeight: 18, fontFamily: 'serif' }}>
                            {block.title || block.caption || block.content ||
                              'Inspiration'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* The achievement is a human account, not a second upload form. */}
          <Text style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: '800',
            color: MAGENTA, marginBottom: 8 }}>LE RÊVE DEVENU RÉEL</Text>
          <Text style={{ ...sectionTitle, fontSize: 26, lineHeight: 34,
            marginBottom: 10 }}>Ce qui a pris vie</Text>
          <Text style={{ ...muted, fontSize: 13, lineHeight: 21,
            marginBottom: 17 }}>
            Raconte le moment où ce rêve a pris forme, ce qui s’est passé
            et ce que cela représente pour toi.
          </Text>
          <Text style={{ color: theme.foreground, fontWeight: '700',
            fontSize: 13, marginBottom: 7 }}>Le récit de cette réalisation</Text>
          <TextInput multiline value={draft.story}
            onChangeText={story => patch({ story })}
            placeholder={/musique|chant|équipe/i.test(dream.title)
              ? 'Exemple : Le 12 novembre, nous nous sommes enfin retrouvés pour jouer ensemble. Ce qui n’était qu’une idée est devenu notre première répétition…'
              : 'Exemple : Ce jour-là, nous avons enfin vu notre projet prendre vie. Voici ce que nous avons vécu ensemble…'}
            placeholderTextColor={theme.muted}
            accessibilityLabel="Raconter ce qui s’est réalisé"
            style={{ color: theme.foreground, fontSize: 15, lineHeight: 25,
              borderBottomWidth: 1, borderColor: theme.border,
              paddingVertical: 13, paddingHorizontal: 2, minHeight: 100,
              textAlignVertical: 'top', marginBottom: 20 }}/>
          <Text style={{ color: theme.foreground, fontWeight: '700',
            fontSize: 13, marginBottom: 9 }}>Un souvenir de ce moment</Text>
          <Pressable accessibilityRole="button"
            accessibilityLabel={photo ? 'Ajouter des images et souvenirs' :
              'Ajouter la photographie de ma réalisation'}
            onPress={selectMedia}
            style={{ borderRadius: 14, overflow: 'hidden',
              borderWidth: photo ? 0 : 1, borderStyle: photo ? 'solid' : 'dashed',
              borderColor: theme.border,
              backgroundColor: photo ? 'transparent' : theme.surface,
              minHeight: photo ? (narrow ? 190 : 270) : 118,
              alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
              <Image source={{ uri: photo.uri }} resizeMode="cover"
                style={{ width: '100%', height: narrow ? 210 : 285 }}/>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center',
                gap: 15, paddingHorizontal: 19, paddingVertical: 23,
                width: '100%' }}>
                <Ionicons name="image-outline" size={23} color={MAGENTA}/>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: theme.foreground, fontSize: 13,
                    fontWeight: '700' }}>Ajouter une photo de la réalisation</Text>
                  <Text style={{ ...muted, lineHeight: 18 }}>
                    Un instant vrai qui raconte ce qui s’est accompli.
                  </Text>
                </View>
                <Ionicons name="add" size={19} color={MAGENTA}/>
              </View>
            )}
          </Pressable>
          {draft.attachments.length > 0 ? (
            <View style={{ marginTop: 9, gap: 8 }}>
              {draft.attachments.map((item: DreamMedia, index: number) => (
                <View key={index} style={{ flexDirection: 'row',
                  alignItems: 'center', gap: 9, paddingVertical: 6 }}>
                  {item.kind === 'photo' ? (
                    <Image source={{ uri: item.uri }} style={{
                      width: 36, height: 36, borderRadius: 7 }}/>
                  ) : <Ionicons name={item.kind === 'video' ? 'videocam-outline' :
                    item.kind === 'audio' ? 'musical-notes-outline' : 'document-outline'}
                    size={20} color={theme.muted}/>}
                  <Text numberOfLines={1} style={{ color: theme.muted, flex: 1,
                    fontSize: 11 }}>{item.name}</Text>
                  <Pressable accessibilityRole="button"
                    accessibilityLabel={'Retirer ' + item.name}
                    onPress={() => patch({
                      attachments: draft.attachments.filter((_, i) => i !== index),
                    })} style={{ padding: 8 }}>
                    <Ionicons name="close-outline" size={18} color={theme.muted}/>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={selectMedia} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 7, alignSelf: 'flex-start' }}>
                <Ionicons name="add" size={17} color={MAGENTA}/>
                <Text style={{ color: MAGENTA, fontSize: 12,
                  fontWeight: '700' }}>Ajouter un souvenir</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={{ color: theme.muted, fontSize: 10,
            marginTop: 7, lineHeight: 16 }}>
            Photos, vidéos ou audio · sauvegarde locale provisoire,
            2 Mo maximum par fichier.
          </Text>
        </View>

        {/* Automatically composed from the dream's actual journey.
            Logbook leaves are opt-in for the eventual public version. */}
        <FlowerJourneyRecap dream={dream} draft={draft} onChangeDraft={patch}/>

        {/* Publishing is the final destination; editing and uprooting stay secondary. */}
        <DreamMilestoneActions nextStage="Publication"
          primaryLabel="Publier cette fleur" primaryColor={MAGENTA}
          onPrimary={publish}
          secondaryLabel="Continuer à éditer" secondaryColor={MAGENTA}
          onSecondary={()=>router.replace('/my-space')}
          destructiveLabel="Arracher" onDestructive={uproot}
        />
      </ScrollView>
      <Nav/>

      {/* Achievement is confirmed separately from publication; never reversed. */}
      <Modal visible={dream.phase === 'Croissance'} transparent animationType="fade"
        onRequestClose={() => router.replace('/my-space')}>
        <View style={{ flex: 1, backgroundColor: 'rgba(21,18,21,.56)',
          justifyContent: 'center', padding: 18 }}>
          <View style={{ backgroundColor: theme.background, maxWidth: 430,
            width: '100%', alignSelf: 'center', borderRadius: 19, padding: 23,
            gap: 14 }}>
            <Ionicons name="flower-outline" color={MAGENTA} size={30}
              style={{ alignSelf: 'center' }}/>
            <Text style={{ fontFamily: 'serif', fontSize: 26,
              color: theme.foreground, textAlign: 'center' }}>
              Ton rêve est-il devenu réalité ?
            </Text>
            <Text style={{ ...muted, textAlign: 'center' }}>
              Confirme le jour où ton rêve s'est réalisé. Cette étape est définitive :
              tu ne pourras pas revenir en Croissance.
            </Text>
            <Text style={{ color: theme.foreground, fontSize: 12,
              fontWeight: '700', marginTop: 5 }}>Date de réalisation</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput accessibilityLabel="Date de réalisation, année-mois-jour"
                value={achievementDate} onChangeText={value => {
                  setAchievementDate(value);
                  setDateError('');
                }}
                placeholder="AAAA-MM-JJ" placeholderTextColor={theme.muted}
                maxLength={10} autoCapitalize="none"
                style={{ flex: 1, borderWidth: 1, borderRadius: 10,
                  borderColor: theme.border, paddingHorizontal: 12, minHeight: 47,
                  color: theme.foreground, backgroundColor: theme.surface,
                  fontSize: 15 }}/>
              <Pressable accessibilityRole="button"
                onPress={() => { setAchievementDate(localDay()); setDateError(''); }}
                style={{ padding: 12, borderWidth: 1, borderColor: theme.border,
                  borderRadius: 10 }}>
                <Text style={{ color: MAGENTA, fontWeight: '700', fontSize: 12 }}>
                  Aujourd'hui
                </Text>
              </Pressable>
            </View>
            {dateError ? <Text accessibilityRole="alert"
              style={{ color: '#B24753', fontSize: 11 }}>{dateError}</Text> : null}
            <Pressable accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              accessibilityLabel="Je confirme que mon rêve est réellement accompli"
              onPress={() => setAcknowledged(value => !value)}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9,
                paddingVertical: 8 }}>
              <Ionicons name={acknowledged ? 'checkbox' : 'square-outline'}
                size={21} color={acknowledged ? MAGENTA : theme.muted}/>
              <Text style={{ flex: 1, color: theme.foreground, fontSize: 12,
                lineHeight: 19 }}>
                Je confirme que ce rêve est réellement accompli et que
                le passage en Floraison est irréversible.
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmAchievement}
              disabled={!acknowledged}
              style={{ minHeight: 48, borderRadius: 11,
                backgroundColor: acknowledged ? MAGENTA : theme.border,
                alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: acknowledged ? '#FFFFFF' : theme.muted,
                fontSize: 13, fontWeight: '800' }}>Confirmer et faire fleurir</Text>
            </Pressable>
            <Pressable accessibilityRole="button"
              onPress={() => router.replace('/my-space')}
              style={{ alignSelf: 'center', padding: 9 }}>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Annuler</Text>
            </Pressable>
            <Text style={{ ...muted, fontSize: 11, textAlign: 'center' }}>
              Aucune preuve n'est nécessaire maintenant.
              Une photo et ton histoire seront demandées pour publier.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Older Floraison records can be missing their achievement date.
          Ask only when the creator elects to supply it, never on opening. */}
      {confirmed && !achievedOn ? (
        <Modal visible={legacyDateOpen} transparent animationType="fade"
          onRequestClose={() => setLegacyDateOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(21,18,21,.50)',
            justifyContent: 'center', padding: 18 }}>
            <View style={{ backgroundColor: theme.background, maxWidth: 420,
              width: '100%', alignSelf: 'center', borderRadius: 18,
              padding: 22, gap: 13 }}>
              <Text style={{ color: theme.foreground, fontFamily: 'serif',
                fontSize: 24 }}>Date de réalisation</Text>
              <Text style={muted}>
                Cette fleur est déjà en Floraison. Renseigne simplement le jour
                où elle est devenue réalité, sans nouvelle confirmation d’étape.
              </Text>
              <TextInput value={achievementDate}
                onChangeText={value => { setAchievementDate(value); setDateError(''); }}
                accessibilityLabel="Date de réalisation, année-mois-jour"
                placeholder="AAAA-MM-JJ" placeholderTextColor={theme.muted}
                maxLength={10} autoCapitalize="none"
                style={{ borderWidth: 1, borderColor: theme.border,
                  borderRadius: 10, paddingHorizontal: 12, minHeight: 46,
                  backgroundColor: theme.surface, color: theme.foreground }}/>
              {dateError ? <Text style={{ color: '#B24753', fontSize: 11 }}>
                {dateError}
              </Text> : null}
              <Pressable accessibilityRole="button" onPress={() => {
                if (!validDay(achievementDate) || achievementDate > localDay()) {
                  setDateError("Choisis une date réelle, aujourd'hui ou dans le passé.");
                  return;
                }
                patch({ achievedOn: achievementDate });
                setLegacyDateOpen(false);
              }} style={{ backgroundColor: MAGENTA, borderRadius: 10,
                minHeight: 47, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  Enregistrer la date
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button"
                onPress={() => setLegacyDateOpen(false)}
                style={{ alignSelf: 'center', padding: 8 }}>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Plus tard</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
      <ReadOnlySheet visible={resourcesOpen} onClose={() => setResourcesOpen(false)}
        title="Ressources">
        {(dream.resources || []).length ? (dream.resources || []).map(item => (
          <View key={item.id} style={{ flexDirection: 'row',
            alignItems: 'flex-start', gap: 11, borderBottomWidth: 1,
            borderBottomColor: theme.border, paddingVertical: 11 }}>
            <Ionicons name={item.confirmed ? 'checkmark-circle-outline' :
              'ellipse-outline'} color={item.confirmed ? '#27845B' : theme.muted}
              size={19}/>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.foreground, fontSize: 13 }}>
                {item.title}
              </Text>
              <Text style={muted}>{item.category === 'person' ? 'Talent' :
                item.category === 'financial' ? 'Financement' : 'Ressource'}
                {' · '}{item.confirmed ? 'Trouvé' : 'Non trouvé'}
              </Text>
            </View>
          </View>
        )) : <Text style={muted}>Aucune ressource enregistrée.</Text>}
        <Text style={{ ...muted, marginTop: 13 }}>Archive de Croissance · lecture seule</Text>
      </ReadOnlySheet>
      <ReadOnlySheet visible={logbookOpen} onClose={() => setLogbookOpen(false)}
        title="Logbook">
        {growthDays.length ? growthDays.map(group => (
          <View key={group.date} style={{ borderLeftWidth: 1,
            borderLeftColor: '#27845B', paddingLeft: 14, marginLeft: 7,
            paddingBottom: 18, gap: 8 }}>
            <Text style={{ color: '#27845B', fontSize: 11,
              fontWeight: '800' }}>{readableDate(group.date)}</Text>
            {group.notes.map(note => <Text key={note.id}
              style={{ color: theme.foreground, fontSize: 13, lineHeight: 20 }}>
              {note.title}
            </Text>)}
            {group.changes.map(change => <Text key={change.id}
              style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
              {change.kind === 'need_found' ? 'Ressource trouvée : ' :
                change.kind === 'need_added' ? 'Besoin ajouté : ' :
                'Ressource perdue : '}{change.title}
            </Text>)}
            {group.documents.map(doc => <Text key={doc.id}
              style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
              Document ajouté : {doc.title}
            </Text>)}
          </View>
        )) : <Text style={muted}>Aucune entrée enregistrée.</Text>}
        <Text style={{ ...muted, marginTop: 13 }}>Archive de Croissance · lecture seule</Text>
      </ReadOnlySheet>
    </SafeAreaView>
  );
}
