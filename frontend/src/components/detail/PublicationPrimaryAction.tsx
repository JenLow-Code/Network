import React, { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { useApp } from '@/context/AppContext';

type Need = { title: string; description?: string };

/** One purposeful action per publication, separate from Fire / Prayer / Share. */
export function PublicationPrimaryAction({ item }: { item: Publication }) {
  const theme = useAppTheme();
  const [choosingNeed, setChoosingNeed] = useState(false);
  const needs: Need[] = item.type !== 'dream' ? [] : item.resources?.length
    ? item.resources
      .filter(resource => !resource.confirmed && resource.category !== 'financial')
      .map(resource => ({ title: resource.title, description: resource.description }))
    : item.needs
      .filter(title => !(item.resolvedNeeds || []).includes(title))
      .map(title => ({ title }));

  // Semence's intentional-link interaction is integrated into its cover.
  if (item.type === 'dream' && item.phase === 'Rêve') return null;

  const contact = (topic?: string, introduction = false, customDraft?: string) => {
    setChoosingNeed(false);
    const draft = customDraft || (introduction
      ? 'Bonjour ' + item.author + ', je connais peut-être quelqu’un qui pourrait contribuer à votre rêve « ' + item.title + ' ». Est-ce que nous pourrions en discuter avant toute mise en relation ?'
      : item.type === 'talent'
      ? 'Bonjour ' + item.author + ', j’aimerais collaborer avec vous autour de votre talent : ' + item.skill + '.'
      : topic
        ? 'Bonjour ' + item.author + ', je peux peut-être aider pour « ' + topic + ' » dans votre projet « ' + item.title + ' ». Pouvons-nous en parler ?'
        : 'Bonjour ' + item.author + ', j’aimerais échanger à propos de « ' + item.title + ' ».');
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'member', recipient: item.author, draft },
    });
  };

  const needDialog = (
      <Modal transparent animationType="fade" visible={choosingNeed} onRequestClose={() => setChoosingNeed(false)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <View style={styles.dialogHeader}>
              <Text style={[styles.heading, { color: theme.foreground }]}>Comment peux-tu contribuer ?</Text>
              <Pressable onPress={() => setChoosingNeed(false)} accessibilityLabel="Fermer">
                <Ionicons name="close" size={22} color={theme.foreground} />
              </Pressable>
            </View>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }}>
              Choisis un besoin pour préparer un message au porteur du projet.
            </Text>
            {needs.map((need, index) => (
              <Pressable
                key={need.title + '-' + index}
                accessibilityRole="button"
                onPress={() => contact(need.title)}
                style={[styles.need, { borderColor: theme.border }]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '600' }}>{need.title}</Text>
                  {!!need.description && <Text numberOfLines={3} style={{ color: theme.muted, fontSize: 12 }}>{need.description}</Text>}
                </View>
                <Ionicons name="arrow-forward" size={18} color={theme.foreground} />
              </Pressable>
            ))}
            <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 8 }}>
              Les messages entre membres sont encore en mode démo ; aucune proposition n’est envoyée à une autre personne.
            </Text>
          </View>
        </View>
      </Modal>
  );

  const [unavailable, setUnavailable] = useState(false);
  const unavailablePopup = (
    <Modal transparent animationType="fade" visible={unavailable} onRequestClose={() => setUnavailable(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setUnavailable(false)} />
        <View style={[styles.dialog, { backgroundColor: theme.surface, alignItems: 'center' }]}>
          <Ionicons name="construct-outline" size={26} color="#CB245C" />
          <Text style={[styles.heading, { color: theme.foreground, textAlign: 'center' }]}>Not ready yet :)</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            Cette fonctionnalité arrive bientôt sur JenLow Network.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setUnavailable(false)} style={{ paddingVertical: 11, paddingHorizontal: 28 }}>
            <Text style={{ color: '#CB245C', fontWeight: '600' }}>Compris</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
  const button = (label: string, onPress: () => void, secondary = false, glyph?: keyof typeof Ionicons.glyphMap) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // Only native sharing and local dream creation are functional in beta;
      // other actions must never imply a real message or collaboration was sent.
      onPress={label === 'Partager ce verset' || label === 'Créer un rêve inspiré' ? onPress : () => setUnavailable(true)}
      style={[
        styles.action,
        styles.fullAction,
        secondary && styles.secondaryAction,
        { backgroundColor: secondary ? 'transparent' : '#CB245C', borderColor: theme.dark ? '#C89BAF' : '#B84A7A' },
      ]}
    >
      {glyph && <Ionicons name={glyph} size={16} color={secondary ? (theme.dark ? '#E7B9CD' : '#963E67') : '#FFFFFF'} />}
      <Text style={[styles.actionLabel, { color: secondary ? (theme.dark ? '#E7B9CD' : '#963E67') : '#FFFFFF', flexShrink: 1, textAlign: 'center' }]}>{label}</Text>
      {!secondary && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
    </Pressable>
  );
  const controls = (...buttons: React.ReactNode[]) => (
    <View style={{ paddingTop: 7, gap: 8 }}>
      {buttons}
      {needDialog}
      {unavailablePopup}
    </View>
  );

  if (item.type === 'dream') {
    if (item.phase === 'Initiation') return controls(
      button('Je peux aider', () => needs.length ? setChoosingNeed(true) : contact()),
      button('Je connais quelqu’un qui pourrait aider', () => contact(undefined, true), true, 'people-outline'),
    );

    if (item.phase === 'Croissance') return controls(
      button('Encourager ce rêve', () => contact(undefined, false,
        'Bonjour ' + item.author + ', je voulais vous encourager dans la croissance de votre rêve « ' + item.title + ' » !')),
    );

    if (item.phase === 'Témoignage') return controls(
      button('Créer un rêve inspiré', () => router.push({ pathname: '/my-dream/new', params: { inspiration: item.title, from: item.id } })),
      button('Partager l’impact de ce rêve', () => contact(undefined, false,
        'Bonjour ' + item.author + ', votre rêve « ' + item.title + ' » a eu un impact sur moi et j’aimerais vous raconter comment.'), true),
    );
    return null;
  }

  if (item.type === 'music') return controls(
    button('Collaborer sur ce morceau', () => router.push({ pathname: '/music-proposal/[id]', params: { id: item.id } })),
    button('Encourager l’artiste', () => contact(undefined, false,
      'Bonjour ' + item.author + ', je voulais vous encourager pour votre morceau « ' + item.title + ' » !'), true),
  );

  if (item.type === 'talent') {
    const offers: React.ReactNode[] = [];
    if (item.seeking.includes('Tandem')) offers.push(
      button('J’aimerais être ton tandem', () => contact(undefined, false,
        'Bonjour ' + item.author + ', j’aimerais former un tandem avec toi autour de « ' + item.skill + ' » !')),
    );
    if (item.seeking.includes('Professeur')) offers.push(
      button('Je peux t’enseigner', () => contact(undefined, false,
        'Bonjour ' + item.author + ', je pourrais t’accompagner comme professeur pour « ' + item.skill + ' ».'),
        offers.length > 0),
    );
    if (item.seeking.includes('Élèves')) offers.push(
      button('J’aimerais être ton élève', () => contact(undefined, false,
        'Bonjour ' + item.author + ', j’aimerais apprendre « ' + item.skill + ' » avec toi.'),
        offers.length > 0),
    );
    if (!offers.length) offers.push(button('Proposer une collaboration', () => contact()));
    return controls(...offers);
  }

  return <><BibleDreamPicker item={item} button={button} />{unavailablePopup}</>;
}

function BibleDreamPicker({
  item,
  button,
}: {
  item: Extract<Publication, { type: 'bible' }>;
  button: (label: string, onPress: () => void, secondary?: boolean, glyph?: keyof typeof Ionicons.glyphMap) => React.ReactNode;
}) {
  const theme = useAppTheme();
  const { items: dreams } = useDreams();
  const app = useApp();
  const [open, setOpen] = useState(false);
  const share = () => {
    const url = 'https://network.jenlow.net/bible/' + encodeURIComponent(item.referenceId) + '?verse=' + item.highlightedVerse;
    void Share.share({ message: item.reference + ' — JenLow Network\n' + url });
  };
  return (
    <View style={{ gap: 8, paddingTop: 7 }}>
      {button('Ajouter à mon rêve', () => setOpen(true))}
      {button('Partager ce verset', share, true, 'share-outline')}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Annuler" onPress={() => setOpen(false)} />
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.heading, { color: theme.foreground }]}>Ajouter ce verset à un rêve</Text>
            {dreams.length ? dreams.map(dream => (
              <Pressable
                key={dream.id}
                accessibilityRole="button"
                onPress={() => { app.addToDream(dream.id, item.id); setOpen(false); }}
                style={[styles.need, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.foreground, fontSize: 14 }}>{dream.title}</Text>
              </Pressable>
            )) : <Text style={{ color: theme.muted, fontSize: 13 }}>Crée d’abord un rêve pour y ajouter ce verset.</Text>}
            <Pressable onPress={() => setOpen(false)} style={{ paddingVertical: 10 }} accessibilityRole="button">
              <Text style={{ color: theme.muted, fontSize: 13 }}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 44, paddingHorizontal: 17, paddingVertical: 11,
    borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  fullAction: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 14 },
  compactAction: { minWidth: 0, minHeight: 42, justifyContent: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 10 },
  secondaryAction: { backgroundColor: 'transparent', borderWidth: 1, gap: 9 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 22, gap: 14, borderRadius: 13 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: 'serif', fontSize: 22, flex: 1 },
  need: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingVertical: 12 },
});
