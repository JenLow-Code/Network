import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamResource } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import DreamExperience from './DreamExperience';
import SemenceStudio from './SemenceStudio';

type Direction = 'top' | 'left' | 'bottom' | 'right';
const stages: { phase: DreamPhase; position: Direction; color: string }[] = [
  { phase: 'Rêve', position: 'top', color: '#D0A77E' },
  { phase: 'Initiation', position: 'left', color: '#83877F' },
  { phase: 'Croissance', position: 'bottom', color: '#27845B' },
  { phase: 'Témoignage', position: 'right', color: '#D71D77' },
];
const order: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];

function PhaseMarker({
  position, color, disabled, selected, onPress, label,
}: {
  position: Direction;
  color: string;
  disabled: boolean;
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  const horizontal = position === 'top' || position === 'bottom';
  const placement =
    position === 'top' ? { top: 3, left: '50%' as const, marginLeft: -29 } :
    position === 'bottom' ? { bottom: 3, left: '50%' as const, marginLeft: -29 } :
    position === 'left' ? { left: 2, top: '50%' as const, marginTop: -29 } :
    { right: 2, top: '50%' as const, marginTop: -29 };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={disabled ? label + ', phase à venir' : 'Ouvrir ' + label}
      accessibilityState={{ disabled, selected }}
      style={{
        width: 58, height: 58, position: 'absolute', zIndex: 5,
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.40 : selected ? 1 : 0.80,
        ...placement,
      }}
    >
      <View style={{
        width: horizontal ? 42 : 3, height: horizontal ? 3 : 42,
        borderRadius: 4, backgroundColor: color,
      }} />
    </Pressable>
  );
}

function shortDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date + 'T12:00:00');
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : date;
}

export default function DreamHub({ dream }: { dream: DreamEntry }) {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 720;
  const [open, setOpen] = useState<DreamPhase | null>(null);
  const [transition, setTransition] = useState<DreamPhase | null>(null);
  const veilOpacity = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const phaseRef = useRef(dream.phase);
  phaseRef.current = dream.phase;

  const canOpen = (phase: DreamPhase) => order.indexOf(phase) <= order.indexOf(dream.phase);
  const enter = useCallback((phase: DreamPhase) => {
    if (busy.current || openRef.current || order.indexOf(phase) > order.indexOf(phaseRef.current)) return;
    busy.current = true;
    setTransition(phase);
    veilOpacity.setValue(0);
    Animated.timing(veilOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { setTransition(null); busy.current = false; return; }
      setOpen(phase);
      Animated.timing(veilOpacity, { toValue: 0, duration: 290, useNativeDriver: true }).start(() => {
        setTransition(null);
        busy.current = false;
      });
    });
  }, [veilOpacity]);

  const enterRef = useRef(enter);
  enterRef.current = enter;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      !openRef.current && !busy.current && (Math.abs(gesture.dx) > 22 || Math.abs(gesture.dy) > 22),
    onPanResponderRelease: (_, gesture) => {
      if (openRef.current || busy.current) return;
      const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25;
      const vertical = Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.25;
      const phase = horizontal
        ? (gesture.dx < -68 ? 'Initiation' : gesture.dx > 68 ? 'Témoignage' : null)
        : vertical ? (gesture.dy > 68 ? 'Rêve' : gesture.dy < -68 ? 'Croissance' : null) : null;
      if (phase) enterRef.current(phase);
    },
  }), []);

  useEffect(() => { setOpen(null); }, [dream.phase]);

  const resources: DreamResource[] = dream.resources || (dream.needs || []).map((title, index) => ({
    id: 'old-' + index, title, confirmed: (dream.resolvedNeeds || []).includes(title), category: 'practical',
  }));
  const missing = resources.filter(item => !item.confirmed).length;
  const phaseIndex = order.indexOf(dream.phase);
  const image = dream.phase === 'Témoignage'
    ? (dream.resultImage || dream.testimony?.mediaItems?.find(media => media.kind === 'photo')?.uri || dream.image)
    : dream.image;
  const hasImage = !!image;
  const ink = theme.dark ? '#F7F5F0' : '#222320';
  const muted = theme.dark ? '#D1D0C9' : '#565A56';
  const coOwners = (dream.coOwners || []).filter(owner => owner.accepted && !!owner.name.trim());
  const currentLabel = PHASE_LABELS[dream.phase];

  const context = [
    phaseIndex >= 1 && dream.goalDate ? 'Objectif ' + shortDate(dream.goalDate) : '',
    phaseIndex === 1 && resources.length > 0
      ? missing > 0 ? missing + (missing === 1 ? ' ressource à trouver' : ' ressources à trouver') : 'Ressources réunies'
      : '',
    phaseIndex === 2 && coOwners.length > 0 ? 'Avec ' + coOwners.map(person => person.name).join(', ') : '',
  ].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {open ? (
        open === 'Rêve'
          ? <SemenceStudio dream={dream} onBack={() => setOpen(null)} />
          : <DreamExperience dream={dream} viewPhase={open} onBack={() => setOpen(null)} />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: compact ? 0 : 24, paddingVertical: compact ? 0 : 17, alignItems: 'center' }}>
          <View style={{
            flex: 1, width: '100%', maxWidth: 1120,
            backgroundColor: theme.dark ? '#252725' : '#EEECE5',
            borderRadius: compact ? 0 : 15, overflow: 'hidden',
          }} {...responder.panHandlers}>
            {hasImage ? <Image source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, {
              backgroundColor: theme.dark ? 'rgba(20,22,21,0.79)' : 'rgba(255,252,245,0.78)',
            }]} />
            {hasImage && !theme.dark ? (
              <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="dream-top-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FFFCF5" stopOpacity={0.90}/>
                    <Stop offset="28%" stopColor="#FFFCF5" stopOpacity={0.26}/>
                    <Stop offset="62%" stopColor="#FFFCF5" stopOpacity={0}/>
                    <Stop offset="100%" stopColor="#FFFCF5" stopOpacity={0}/>
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#dream-top-fade)" />
              </Svg>
            ) : null}

            <Pressable
              onPress={() => router.replace('/my-space')}
              accessibilityRole="button"
              accessibilityLabel="Retour à mes rêves"
              style={{ position: 'absolute', left: compact ? 9 : 19, top: compact ? 7 : 16, padding: 12, zIndex: 7 }}
            >
              <Ionicons name="arrow-back-outline" color={ink} size={21} />
            </Pressable>

            {stages.map(stage => (
              <PhaseMarker
                key={stage.phase}
                position={stage.position}
                color={stage.color}
                disabled={!canOpen(stage.phase)}
                selected={stage.phase === dream.phase}
                onPress={() => enter(stage.phase)}
                label={PHASE_LABELS[stage.phase]}
              />
            ))}

            <View pointerEvents="box-none" style={{
              flex: 1, justifyContent: 'center', alignItems: 'center',
              paddingHorizontal: compact ? 48 : 80,
              paddingBottom: Math.min(height * 0.12, 110),
            }}>
              <View style={{ alignItems: 'center', width: '100%', maxWidth: 580 }}>
                <Text style={{ textTransform: 'uppercase', color: muted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 22 }}>
                  {currentLabel}
                </Text>
                <Text style={{
                  fontFamily: 'serif', fontSize: compact ? 34 : 45,
                  lineHeight: compact ? 43 : 55, letterSpacing: -0.7,
                  color: ink, textAlign: 'center', marginBottom: 15,
                }}>
                  {dream.title}
                </Text>
                {dream.summary ? (
                  <Text style={{ color: muted, fontSize: compact ? 13 : 15, lineHeight: compact ? 21 : 24, textAlign: 'center', maxWidth: 470 }} numberOfLines={3}>
                    {dream.phase === 'Témoignage' ? (dream.testimony?.comment || dream.summary) : dream.summary}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Ouvrir ' + currentLabel}
                  onPress={() => enter(dream.phase)}
                  style={{ marginTop: 28, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: ink }}
                >
                  <Text style={{ color: ink, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 }}>
                    {dream.phase === 'Témoignage' ? 'Voir ma floraison' : 'Ouvrir ' + currentLabel}
                  </Text>
                </Pressable>
                {context ? (
                  <Text style={{ marginTop: 19, color: muted, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
                    {context}
                  </Text>
                ) : null}
                {dream.chat && phaseIndex >= 2 ? (
                  <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'dream-' + dream.id } })}
                    accessibilityRole="button" style={{ marginTop: 10, padding: 8 }}>
                    <Text style={{ color: muted, textDecorationLine: 'underline', fontSize: 11 }}>Conversation du rêve</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}
      {transition ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
          zIndex: 20, backgroundColor: theme.background, justifyContent: 'center',
          alignItems: 'center', opacity: veilOpacity,
        }]}>
          <Text style={{ color: stages.find(stage => stage.phase === transition)?.color, fontSize: 30, fontFamily: 'serif' }}>
            {PHASE_LABELS[transition]}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
