import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';

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

  const contact = (topic?: string, introduction = false) => {
    setChoosingNeed(false);
    const draft = introduction
      ? 'Bonjour ' + item.author + ', je connais peut-être quelqu’un qui pourrait contribuer à votre rêve « ' + item.title + ' ». Est-ce que nous pourrions en discuter avant toute mise en relation ?'
      : item.type === 'talent'
      ? 'Bonjour ' + item.author + ', j’aimerais collaborer avec vous autour de votre talent : ' + item.skill + '.'
      : topic
        ? 'Bonjour ' + item.author + ', je peux peut-être aider pour « ' + topic + ' » dans votre projet « ' + item.title + ' ». Pouvons-nous en parler ?'
        : 'Bonjour ' + item.author + ', j’aimerais échanger à propos de « ' + item.title + ' ».';
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'member', recipient: item.author, draft },
    });
  };

  let label: string;
  let action: () => void;
  if (item.type === 'dream') {
    if (item.phase === 'Témoignage') {
      label = 'Créer un rêve inspiré';
      action = () => router.push({ pathname: '/my-dream/new', params: { inspiration: item.title, from: item.id } });
    } else if (needs.length > 0) {
      label = 'Répondre à un besoin';
      action = () => setChoosingNeed(true);
    } else {
      label = item.phase === 'Croissance' ? 'Échanger sur les avancées' : 'Contacter le porteur';
      action = () => contact();
    }
  } else if (item.type === 'talent') {
    label = item.seeking.includes('Tandem') ? 'Proposer un tandem' : 'Proposer une collaboration';
    action = () => contact();
  } else if (item.type === 'music') {
    label = 'Proposer une adaptation';
    action = () => router.push({ pathname: '/music-proposal/[id]', params: { id: item.id } });
  } else {
    label = 'Exporter ce verset';
    action = () => router.push({ pathname: '/verse-export/[id]', params: { id: item.id } });
  }

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

  const isActiveDream = item.type === 'dream' && (item.phase === 'Initiation' || item.phase === 'Croissance');
  if (isActiveDream) {
    const canSelectNeed = needs.length > 0;
    return (
      <View style={{ paddingTop: 10, paddingBottom: 4, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Je peux aider"
            onPress={() => canSelectNeed ? setChoosingNeed(true) : contact()}
            style={[styles.action, styles.compactAction, { flex: 0.92, backgroundColor: theme.dark ? '#EAE5DF' : '#292725' }]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.actionLabel, { color: theme.dark ? '#292725' : '#FFFFFF', fontSize: 12 }]}>Je peux aider</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.dark ? '#292725' : '#FFFFFF'} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Je connais quelqu'un qui pourrait aider"
            onPress={() => contact(undefined, true)}
            style={[styles.action, styles.compactAction, styles.secondaryAction, { flex: 1.3, borderColor: theme.dark ? '#C89BAF' : '#B84A7A' }]}
          >
            <Ionicons name="people-outline" size={15} color={theme.dark ? '#E7B9CD' : '#963E67'} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={[styles.actionLabel, { color: theme.dark ? '#E7B9CD' : '#963E67', fontSize: 12, flexShrink: 1 }]}>Je connais quelqu’un</Text>
          </Pressable>
        </View>
        {needDialog}
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 15, paddingBottom: 8, alignItems: 'flex-start' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={action}
        style={[styles.action, {
          backgroundColor: theme.dark ? '#EAE5DF' : '#292725',
        }]}
      >
        <Text style={[styles.actionLabel, { color: theme.dark ? '#292725' : '#FFFFFF' }]}>{label}</Text>
        <Ionicons name="arrow-forward" size={15} color={theme.dark ? '#292725' : '#FFFFFF'} />
      </Pressable>
      {needDialog}
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
