import React, { useState } from 'react';
import {
  Alert, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput,
  View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { useDreams } from '@/domain/dreamRepository';
import type { DreamMedia, FlowerDraft } from '@/domain/dreamWorkspace';
import { buildGrowthDays, countVerifiedPrayers } from '@/domain/growthTimeline';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';
import { useAppTheme } from '@/theme/AppTheme';
import { DreamPhaseHeader } from '@/components/dream/DreamPhaseLayout';

const MAGENTA = '#D71D77';
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
const isVerifiedCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

function FlowerShortcut({ label, icon, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + label}
      onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center',
        justifyContent: 'flex-end', minHeight: 30, paddingVertical: 5, gap: 5 }}>
      <Ionicons name={icon} size={13} color={theme.muted}/>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}
        style={{ fontSize: 11, color: theme.foreground }}>{label}</Text>
      <Ionicons name="chevron-forward" size={12} color={theme.muted}/>
    </Pressable>
  );
}

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
  const { items, complete, setFlowerDraft, confirmFlower, remove } = useDreams();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const dream = items.find(item => item.id === id);
  const draft: FlowerDraft = dream?.flowerDraft || { story: '', attachments: [] };
  const [achievementDate, setAchievementDate] = useState(localDay());
  const [acknowledged, setAcknowledged] = useState(false);
  const [showAllMoments, setShowAllMoments] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const [dateError, setDateError] = useState('');

  if (!dream) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ padding: 20, color: theme.foreground }}>Rêve introuvable</Text>
    </SafeAreaView>
  );

  const confirmed = dream.phase === 'Témoignage' && !!dream.flowerStartedAt && !!draft.achievedOn;
  const photo = draft.attachments.find(item => item.kind === 'photo');
  const prayerCount = countVerifiedPrayers(dream);
  const encouragementCount = isVerifiedCount(dream.encouragementCount)
    ? dream.encouragementCount : null;
  const people = (dream.resources || []).filter(item =>
    item.category === 'person' && item.confirmed);
  const moments = [...(dream.milestones || [])]
    .filter(item => validDay(item.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const selectedIds = draft.highlightIds || [];
  const growthDays = buildGrowthDays(dream);
  const patch = (changes: Partial<FlowerDraft>) =>
    setFlowerDraft(dream.id, { ...draft, ...changes });
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
    else Alert.alert(title, message);
  };
  const confirmAchievement = () => {
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
      notify('Floraison', 'Confirme d’abord la date de réalisation de ce rêve.');
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
  const toggleMoment = (momentId: string) => {
    const next = selectedIds.includes(momentId)
      ? selectedIds.filter(item => item !== momentId)
      : [...selectedIds, momentId];
    patch({ highlightIds: next });
  };
  const sectionTitle = { color: theme.foreground, fontSize: 22,
    fontFamily: 'serif' as const, lineHeight: 29 };
  const muted = { color: theme.muted, fontSize: 12, lineHeight: 19 };
  const publishedMoments = moments.filter(item => selectedIds.includes(item.id));
  const visibleMoments = showAllMoments ? moments : moments.slice(0, 3);
  const hasStats = prayerCount !== null || encouragementCount !== null ||
    people.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: narrow ? 19 : 26,
          paddingTop: 10, paddingBottom: 70, maxWidth: 760, width: '100%',
          alignSelf: 'center' }}>
        <DreamPhaseHeader dream={dream} phase="Témoignage"
          onBack={() => router.replace('/my-space')}
          onNavigate={phase => router.replace({
            pathname: '/my-dream/[id]', params: { id: dream.id, view: phase },
          })}
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
                <Ionicons name="flower-outline" size={17} color={MAGENTA}/>
                <Text style={{ color: MAGENTA, fontSize: narrow ? 14 : 18,
                  fontWeight: '800' }}>
                  {confirmed ? readableDate(draft.achievedOn) : 'À confirmer'}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1.25, alignItems: 'flex-end' }}>
            <FlowerShortcut label="Notes personnelles" icon="lock-closed-outline"
              onPress={() => router.push({
                pathname: '/my-dream/notes/[id]', params: { id: dream.id },
              })}/>
            <FlowerShortcut label="Inspirations / Documents" icon="folder-open-outline"
              onPress={() => router.push({
                pathname: '/my-dream/library/[id]', params: { id: dream.id },
              })}/>
            <FlowerShortcut label="Ressources" icon="people-outline"
              onPress={() => setResourcesOpen(true)}/>
            <FlowerShortcut label="Logbook" icon="book-outline"
              onPress={() => setLogbookOpen(true)}/>
          </View>
        </View>

        {/* The flower is presented as a story, not as a separate upload form. */}
        <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 23 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
            <Text style={{ fontSize: 10, letterSpacing: 1.7, color: MAGENTA,
              fontWeight: '800' }}>LA FLORAISON</Text>
            <Ionicons name="flower-outline" size={21} color={MAGENTA}/>
          </View>
          <Text style={{ ...sectionTitle, fontSize: 26, lineHeight: 33,
            marginBottom: 8 }}>Et ce rêve a fleuri.</Text>
          <Text style={{ ...muted, marginBottom: 17 }}>
            {confirmed ? 'Ce rêve est devenu réalité le ' +
              readableDate(draft.achievedOn) + '.' :
              'Le moment où ce rêve est devenu réalité.'}
          </Text>

          <Pressable accessibilityRole="button"
            accessibilityLabel={photo ? 'Ajouter des images et souvenirs' :
              'Ajouter la photographie de ma réalisation'}
            onPress={selectMedia}
            style={{ borderRadius: 13, overflow: 'hidden', borderWidth: photo ? 0 : 1,
              borderColor: theme.border, borderStyle: photo ? 'solid' : 'dashed',
              backgroundColor: theme.surface, minHeight: narrow ? 195 : 255,
              alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
              <Image source={{ uri: photo.uri }} resizeMode="cover"
                style={{ width: '100%', height: narrow ? 205 : 300 }}/>
            ) : (
              <View style={{ alignItems: 'center', padding: 18, gap: 10 }}>
                <Ionicons name="image-outline" size={30} color={MAGENTA}/>
                <Text style={{ color: theme.foreground, fontSize: 14,
                  fontWeight: '700' }}>Le visage de ta floraison</Text>
                <Text style={{ ...muted, textAlign: 'center', maxWidth: 280 }}>
                  Ajoute une photo de ce qui est devenu réel.
                </Text>
                <Text style={{ color: MAGENTA, fontSize: 12, fontWeight: '700' }}>
                  + Choisir une photographie
                </Text>
              </View>
            )}
          </Pressable>
          {draft.attachments.length > 0 ? (
            <View style={{ marginTop: 9, gap: 8 }}>
              {draft.attachments.map((item: DreamMedia, index: number) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center',
                  gap: 9, paddingVertical: 6 }}>
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
                <Ionicons name="add-circle-outline" size={17} color={MAGENTA}/>
                <Text style={{ color: MAGENTA, fontSize: 12, fontWeight: '700' }}>
                  Ajouter un souvenir
                </Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={{ color: theme.muted, fontSize: 10, marginTop: 7,
            lineHeight: 16 }}>Photos, vidéos ou audio · sauvegarde locale provisoire,
              2 Mo maximum par fichier.</Text>

          <Text style={{ color: theme.foreground, fontFamily: 'serif',
            fontSize: 20, marginTop: 24, lineHeight: 29 }}>
            {dream.summary || 'Il y avait un rêve…'}
          </Text>
          <TextInput multiline value={draft.story} onChangeText={story => patch({ story })}
            placeholder="Et aujourd’hui, qu’est-ce qui a changé ? Raconte-le avec tes mots…"
            placeholderTextColor={theme.muted} accessibilityLabel="Raconter ma floraison"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.border,
              color: theme.foreground, fontSize: 15, lineHeight: 24,
              paddingVertical: 12, paddingHorizontal: 1, minHeight: 73,
              textAlignVertical: 'top', marginTop: 12 }}/>
        </View>

        {/* Grounded aggregates only — never generate mock counts or private quotes. */}
        <View style={{ borderTopWidth: 1, borderColor: theme.border,
          paddingTop: 23, marginTop: 27 }}>
          <Text style={sectionTitle}>Tout ce chemin…</Text>
          <Text style={{ ...muted, marginTop: 5, marginBottom: 16 }}>
            Les personnes et les gestes qui ont accompagné ce rêve.
          </Text>
          {hasStats ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap',
              gap: narrow ? 18 : 25 }}>
              {prayerCount !== null ? (
                <View style={{ minWidth: narrow ? '43%' : 140, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="hand-left-outline" size={20} color="#B88962"/>
                    <Text style={{ color: MAGENTA, fontSize: 22, fontWeight: '800' }}>
                      {prayerCount}
                    </Text>
                  </View>
                  <Text style={muted}>prière{prayerCount === 1 ? '' : 's'} reçue{prayerCount === 1 ? '' : 's'}</Text>
                </View>
              ) : null}
              {encouragementCount !== null ? (
                <View style={{ minWidth: narrow ? '43%' : 140, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="heart-outline" size={20} color={MAGENTA}/>
                    <Text style={{ color: MAGENTA, fontSize: 22, fontWeight: '800' }}>
                      {encouragementCount}
                    </Text>
                  </View>
                  <Text style={muted}>encouragement{encouragementCount === 1 ? '' : 's'} reçu{encouragementCount === 1 ? '' : 's'}</Text>
                </View>
              ) : null}
              {people.length ? (
                <View style={{ minWidth: narrow ? '43%' : 140, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="people-outline" size={20} color="#27845B"/>
                    <Text style={{ color: MAGENTA, fontSize: 22, fontWeight: '800' }}>
                      {people.length}
                    </Text>
                  </View>
                  <Text style={muted}>talent{people.length === 1 ? '' : 's'} trouvé{people.length === 1 ? '' : 's'}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...muted, fontStyle: 'italic' }}>
              Les prières, encouragements et participants apparaîtront ici
              lorsqu'ils seront disponibles.
            </Text>
          )}
        </View>

        <View style={{ borderTopWidth: 1, borderColor: theme.border,
          paddingTop: 22, marginTop: 27 }}>
          <Text style={sectionTitle}>Les moments qui ont compté</Text>
          <Text style={{ ...muted, marginTop: 6, marginBottom: 16 }}>
            Ton Logbook garde le parcours. Choisis les moments que tu souhaites
            faire apparaître dans ta fleur publique.
          </Text>
          {moments.length ? (
            <View style={{ paddingLeft: 8, borderLeftWidth: 1.5,
              borderLeftColor: '#BFD9CA', marginLeft: 7 }}>
              {visibleMoments.map(moment => {
                const chosen = selectedIds.includes(moment.id);
                return (
                  <Pressable key={moment.id} accessibilityRole="button"
                    accessibilityState={{ selected: chosen }}
                    accessibilityLabel={(chosen ? 'Retirer du récit : ' :
                      'Ajouter au récit : ') + moment.title}
                    onPress={() => toggleMoment(moment.id)}
                    style={{ paddingVertical: 11, paddingHorizontal: 15,
                      marginLeft: 8, marginBottom: 5, borderRadius: 11,
                      backgroundColor: chosen
                        ? (theme.dark ? '#43303B' : '#F9EAF1') : 'transparent',
                      flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: chosen ? MAGENTA : '#27845B',
                        fontSize: 10, fontWeight: '700' }}>
                        {readableDate(moment.date)}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 13,
                        lineHeight: 20 }}>{moment.title}</Text>
                    </View>
                    <Ionicons name={chosen ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20} color={chosen ? MAGENTA : theme.muted}/>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ padding: 14, borderRadius: 11,
              backgroundColor: theme.surface }}>
              <Text style={muted}>Les souvenirs de ton Logbook pourront être
                ajoutés ici. Tu peux aussi simplement raconter la réalisation.</Text>
            </View>
          )}
          {moments.length > 3 ? (
            <Pressable accessibilityRole="button"
              onPress={() => setShowAllMoments(value => !value)}
              style={{ paddingVertical: 11, alignSelf: 'flex-start' }}>
              <Text style={{ color: MAGENTA, fontSize: 12, fontWeight: '700' }}>
                {showAllMoments ? 'Voir moins' : 'Voir tous les moments du Logbook'}
              </Text>
            </Pressable>
          ) : null}
          {publishedMoments.length ? (
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 8 }}>
              {publishedMoments.length} moment{publishedMoments.length === 1 ? '' : 's'}
              {' '}sélectionné{publishedMoments.length === 1 ? '' : 's'} pour le récit public.
            </Text>
          ) : null}
        </View>

        {/* Publication comes first; secondary edit is a magenta outline. */}
        <View style={{ borderTopWidth: 1, borderColor: theme.border,
          paddingTop: 22, marginTop: 30, gap: 10 }}>
          <Text style={sectionTitle}>La floraison</Text>
          <Text style={{ ...muted, marginBottom: 6 }}>
            Tu peux revenir sur ta présentation avant de la partager.
          </Text>
          <Pressable accessibilityRole="button" onPress={publish}
            style={{ minHeight: 48, borderRadius: 11, backgroundColor: MAGENTA,
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Publier cette fleur
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/my-space')}
            style={{ minHeight: 48, borderWidth: 1.5, borderColor: MAGENTA,
              borderRadius: 11, backgroundColor: 'transparent',
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text style={{ color: MAGENTA, fontSize: 13,
              fontWeight: '700' }}>Continuer à éditer</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={uproot}
            style={{ minHeight: 48, borderRadius: 11, backgroundColor: '#242322',
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Arracher cette plante
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <Nav/>

      {/* Achievement is confirmed separately from publication; never reversed. */}
      <Modal visible={!confirmed} transparent animationType="fade"
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
