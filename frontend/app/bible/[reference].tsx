import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { biblePosts, psalm150, publications, personPublications } from '@/mocks/publications';
import { DetailAuthorHeader } from '@/components/detail/DetailAuthorHeader';
import { DreamReactionRail } from '@/components/detail/DreamReactionRail';
import { PublicationPrimaryAction } from '@/components/detail/PublicationPrimaryAction';
import { Nav } from '@/components/navigation/Nav';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';
import { usePublication } from '@/lib/api/hooks';
import type { BiblePublication } from '@/domain/publication';

/**
 * The shared verse is the whole initial reading experience.
 * A deliberate right swipe over the verse (or the accessible text control)
 * opens the complete chapter in a side drawer.
 */
export default function Bible() {
  const { verse, id } = useLocalSearchParams<{ reference: string; verse?: string; id?: string }>();
  const remote = usePublication(id);
  const chapterTexts: string[] = remote.detail?.chapter?.verses?.map((v: { text: string }) => v.text) ?? psalm150;
  const selected = Math.max(1, Math.min(chapterTexts.length || 1, Number(verse || 6) || 6));
  const post = (remote.item?.type === 'bible' ? (remote.item as BiblePublication) : undefined)
    ?? biblePosts.find(p => p.highlightedVerse === selected)
    ?? biblePosts[0];
  const shared = Math.max(1, Math.min(chapterTexts.length || 1, post.highlightedVerse || selected));
  const theme = useAppTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 530;
  const [open, setOpen] = useState(false);
  const panelX = useRef(new Animated.Value(440)).current;

  useEffect(() => {
    if (open) Animated.timing(panelX, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    else panelX.setValue(440);
  }, [open, panelX]);

  const gesture = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.35,
    onPanResponderRelease: (_, g) => { if (g.dx > 65) setOpen(true); },
  })).current;

  const ink = theme.foreground;
  const muted = theme.muted;
  const verseText = chapterTexts[shared - 1] || 'Texte du verset indisponible.';
  const verseReference = post.reference || 'Psaume 150:' + shared;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 42 }}>
        <DetailAuthorHeader item={post} />
        <View style={{ paddingHorizontal: compact ? 23 : 32, paddingTop: 28 }}>
          <View {...gesture.panHandlers} style={{ paddingTop: 15, paddingBottom: 30, minHeight: compact ? 230 : 290, justifyContent: 'center', gap: 20 }}>
            <Text style={{ color: muted, letterSpacing: 1.3, fontSize: 10 }}>LOUIS SEGOND 1910</Text>
            <Text accessibilityRole="header" style={{ color: ink, fontFamily: 'serif', fontSize: compact ? 27 : 32 }}>
              {verseReference}
            </Text>
            <Text selectable style={{ color: theme.dark ? '#FF86AE' : '#CB245C', fontFamily: 'serif', fontSize: compact ? 26 : 34, lineHeight: compact ? 39 : 49 }}>
              {verseText}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Ionicons name="arrow-forward" size={15} color={muted} />
              <Text style={{ color: muted, fontSize: 11 }}>Balayer vers la droite pour lire le chapitre</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 50, minHeight: 42 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lire le chapitre complet"
              onPress={() => setOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11 }}
            >
              <Text style={{ color: ink, fontSize: 12, fontWeight: '600' }}>Voir le chapitre</Text>
              <Ionicons name="arrow-forward" size={14} color={ink} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <PublicationPrimaryAction item={post} />
            </View>
            <DreamReactionRail item={post} />
          </View>
        </View>

        <View style={{ marginTop: 30, paddingTop: 21, paddingHorizontal: compact ? 23 : 32 }}>
          <Text style={{ color: ink, fontFamily: 'serif', fontSize: 25, marginBottom: 20 }}>Continuer l’inspiration</Text>
          <PublicationGallery
            layout="masonry"
            contentWidth={Math.max(0, Math.min(760, viewportWidth) - (compact ? 46 : 64))}
            items={[...publications, ...personPublications].filter(p => p.id !== post.id)}
          />
        </View>
      </ScrollView>
      <Nav />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fermer le chapitre" onPress={() => setOpen(false)} />
          <Animated.View style={[styles.drawer, { width: Math.min(430, viewportWidth * 0.94), backgroundColor: theme.surface, transform: [{ translateX: panelX }] }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 50, gap: 15 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour au verset"
                onPress={() => setOpen(false)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 11 }}
              >
                <Ionicons name="chevron-back" size={19} color={ink} />
                <Text style={{ color: ink, fontSize: 13 }}>Retour au verset</Text>
              </Pressable>
              <Text style={{ color: muted, fontSize: 10, letterSpacing: 1.2 }}>LOUIS SEGOND 1910</Text>
              <Text style={{ color: ink, fontFamily: 'serif', fontSize: 28, marginBottom: 6 }}>
                {verseReference.replace(/:\d+$/, '')}
              </Text>
              {chapterTexts.map((text, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start', paddingVertical: 5 }}>
                  <Text style={{ width: 19, color: i + 1 === shared ? '#CB245C' : muted, fontSize: 12, lineHeight: 24 }}>{i + 1}</Text>
                  <Text selectable style={{ flex: 1, color: i + 1 === shared ? (theme.dark ? '#FF86AE' : '#CB245C') : ink, fontSize: 16, lineHeight: 25 }}>
                    {text}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
  drawer: { height: '100%', paddingTop: 30, paddingHorizontal: 23 },
});
