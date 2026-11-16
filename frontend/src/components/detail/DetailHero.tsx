import React, { useId, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Publication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TalentArt } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { useAppTheme } from '@/theme/AppTheme';
import { BibleVerseCard } from '@/components/publication/PublicationGallery';
import { DreamPhaseCard } from '@/components/publication/DreamPhaseCard';

/**
 * The detail cover is the full-size version of a Discovery publication:
 * no redundant title bar, cards or dummy controls.
 */
export function DetailHero({
  item,
  width,
  height,
}: {
  item: Publication;
  width: number;
  height: number;
}) {
  const isDream = item.type === 'dream';
  const inset = width < 420 ? 20 : 31;
  const theme = useAppTheme();
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [dreamTextHeight, setDreamTextHeight] = useState(0);
  const textTop = width < 420 ? Math.max(112, height * 0.27) : Math.max(148, height * 0.26);
  // Keep the entire title + description above the page-color fade, including
  // when accessibility font scaling or unusually long dream summaries grow.
  const heroHeight = isDream
    ? Math.max(height, Math.ceil((textTop + dreamTextHeight + 24) / 0.76))
    : height;

  return (
    <View style={[styles.hero, {
      width,
      ...(isDream ? {} : { height: heroHeight }),
      backgroundColor: isDream ? theme.background : '#F0EAE0',
    }]}>
      {isDream ? (
        <DreamPhaseCard item={item} width={width} variant="detail" />
      ) : item.type === 'bible' ? (
        <BibleVerseCard item={item} width={width} height={height} /> 
      ) : (
        <>
          <View style={styles.talentArtwork}>
            <TalentArt kind={item.instrument} size={Math.min(220, width * 0.45, height * 0.56)} />
            <Text style={styles.talentLabel}>{item.skill.toUpperCase()}</Text>
            <TalentLevelDots level={item.level} />
            <Text style={styles.levelLabel}>{item.level.toLocaleUpperCase('fr')}</Text>
          </View>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden' },
  phaseIcon: {
    width: 41,
    height: 41,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,252,245,0.94)',
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  headline: { fontWeight: '400', color: '#FFFFFF', letterSpacing: -0.75 },
  talentArtwork: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 18 },
  levelLabel: { fontSize: 9, letterSpacing: 1.4, color: '#8A8076' },
  talentLabel: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700', color: '#26211D', marginTop: 5 },
});
