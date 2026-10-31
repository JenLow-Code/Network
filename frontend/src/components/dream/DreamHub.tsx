import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamResource } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import DreamExperience from './DreamExperience';

type Direction = 'top' | 'left' | 'bottom' | 'right';
const stages: { phase: DreamPhase; position: Direction; color: string }[] = [
  { phase: 'Rêve', position: 'top', color: '#B88962' },
  { phase: 'Initiation', position: 'left', color: '#A0BF46' },
  { phase: 'Croissance', position: 'bottom', color: '#27845B' },
  { phase: 'Témoignage', position: 'right', color: '#D71D77' },
];
const order: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];

function EdgeLight({ position, color }: { position: Direction; color: string }) {
  const horizontal = position === 'left' || position === 'right';
  const reversed = position === 'right' || position === 'bottom';
  const id = 'edge-' + position;
  const style = horizontal
    ? { position: 'absolute' as const, top: 0, bottom: 0, width: 47, ...(reversed ? { right: 0 } : { left: 0 }) }
    : { position: 'absolute' as const, left: 0, right: 0, height: 63, ...(reversed ? { bottom: 0 } : { top: 0 }) };
  return (
    <Svg pointerEvents="none" width={horizontal ? 47 : '100%'} height={horizontal ? '100%' : 63} style={style}>
      <Defs>
        <LinearGradient id={id} x1={horizontal ? (reversed ? '100%' : '0%') : '0%'} y1={horizontal ? '0%' : (reversed ? '100%' : '0%')} x2={horizontal ? (reversed ? '0%' : '100%') : '0%'} y2={horizontal ? '0%' : (reversed ? '0%' : '100%')}>
          <Stop offset="0%" stopColor={color} stopOpacity={0.14} />
          <Stop offset="35%" stopColor={color} stopOpacity={0.035} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={'url(#' + id + ')'} />
    </Svg>
  );
}

/** Slightly irregular, round-ended chevrons, following the user's JenLow reference. */
function DrawnArrow({ position, color }: { position: Direction; color: string }) {
  const path = position === 'top'
    ? 'M 9 10 C 16 20 22 36 29 43 C 34 34 41 21 49 8'
    : position === 'bottom'
      ? 'M 9 45 C 16 34 24 20 30 10 C 36 19 42 35 49 44'
      : position === 'left'
        ? 'M 10 10 C 21 18 34 25 47 29 C 35 36 22 41 10 48'
        : 'M 49 10 C 36 19 25 24 12 29 C 25 35 38 42 49 48';
  return (
    <Svg width={position === 'left' || position === 'right' ? 43 : 54} height={position === 'left' || position === 'right' ? 44 : 52} viewBox="0 0 58 58">
      <Path d={path} stroke={color} strokeWidth={5.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
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
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<DreamPhase | null>(null);
  const [transition, setTransition] = useState<DreamPhase | null>(null);
  const veilOpacity = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const phaseRef = useRef(dream.phase);
  phaseRef.current = dream.phase;

  const canOpen = (phase: DreamPhase) => {
    if (phase === 'Témoignage') return dream.phase === 'Croissance'; // Preparation only; completion changes the centre itself.
    return order.indexOf(phase) <= order.indexOf(dream.phase);
  };

  const enter = useCallback((phase: DreamPhase) => {
    if (busy.current || openRef.current) return;
    if (phase === 'Témoignage' ? phaseRef.current !== 'Croissance' : order.indexOf(phase) > order.indexOf(phaseRef.current)) return;
    busy.current = true;
    setTransition(phase);
    veilOpacity.setValue(0);
    Animated.timing(veilOpacity, { toValue: 1, duration: 240, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { setTransition(null); busy.current = false; return; }
      if (phase === 'Témoignage') {
        busy.current = false;
        router.push({ pathname: '/my-dream/flower/[id]', params: { id: dream.id } });
        setTransition(null);
        return;
      }
      setOpen(phase);
      Animated.timing(veilOpacity, { toValue: 0, duration: 450, delay: 230, useNativeDriver: true }).start(() => {
        setTransition(null);
        busy.current = false;
      });
    });
  }, [dream.id, veilOpacity]);

  const enterRef = useRef(enter);
  enterRef.current = enter;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !openRef.current && !busy.current && (Math.abs(g.dx) > 22 || Math.abs(g.dy) > 22),
    onPanResponderRelease: (_, g) => {
      if (openRef.current || busy.current) return;
      const horizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.25;
      const vertical = Math.abs(g.dy) > Math.abs(g.dx) * 1.25;
      const phase = horizontal
        ? (g.dx < -68 ? 'Initiation' : g.dx > 68 ? 'Témoignage' : null)
        : vertical ? (g.dy > 68 ? 'Rêve' : g.dy < -68 ? 'Croissance' : null) : null;
      if (phase) enterRef.current(phase);
    },
  }), []);

  useEffect(() => {
    // Advancing a dream returns to the evolving centre, never a stale historical editor.
    setOpen(null);
  }, [dream.phase]);

  const resources: DreamResource[] = dream.resources || (dream.needs || []).map((title, i) => ({
    id: 'old-' + i, title, confirmed: (dream.resolvedNeeds || []).includes(title), category: 'practical',
  }));
  const missing = resources.filter(resource => !resource.confirmed).length;
  const phaseIndex = order.indexOf(dream.phase);
  const flower = dream.phase === 'Témoignage';
  // Older demo dreams predate the resultImage field: retain their existing photograph.
  const photo = flower
    ? (dream.resultImage || dream.testimony?.mediaItems?.find(media => media.kind === 'photo')?.uri || dream.image)
    : undefined;
  const hasPhoto = !!photo;
  const foreground = hasPhoto ? '#FFFFFF' : theme.foreground;
  const secondary = hasPhoto ? '#F3F0EF' : theme.muted;
  const coOwners = (dream.coOwners || []).filter(owner => owner.accepted && !!owner.name.trim());

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {open ? (
        <DreamExperience dream={dream} viewPhase={open} onBack={() => setOpen(null)} />
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }} {...responder.panHandlers}>
          {hasPhoto ? (
            <>
              <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.48)' }]} />
            </>
          ) : null}
          {stages.map(stage => <EdgeLight key={stage.position} position={stage.position} color={stage.color} />)}
          <Pressable onPress={() => router.replace('/my-space')} accessibilityRole="button" accessibilityLabel="Retour à mes rêves" style={{ position: 'absolute', left: 13, top: 9, zIndex: 5, padding: 10 }}>
            <Ionicons name="arrow-back" size={24} color={foreground} />
          </Pressable>

          {stages.map(stage => {
            const disabled = !canOpen(stage.phase);
            const pos = stage.position;
            const placement: any = pos === 'top'
              ? { top: 2, left: 95, right: 95, alignItems: 'center' }
              : pos === 'bottom'
                ? { bottom: 1, left: 95, right: 95, alignItems: 'center' }
                : pos === 'left'
                  ? { left: 2, top: '42%', alignItems: 'center' }
                  : { right: 2, top: '42%', alignItems: 'center' };
            return (
              <Pressable key={stage.phase} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={'Ouvrir ' + PHASE_LABELS[stage.phase]} disabled={disabled} onPress={() => enter(stage.phase)}
                style={{ position: 'absolute', zIndex: 4, padding: 8, opacity: disabled ? 0.36 : 0.95, ...placement }}>
                <DrawnArrow position={pos} color={stage.color} />
                <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center', color: stage.color, marginTop: pos === 'bottom' ? -3 : 0 }}>
                  {PHASE_LABELS[stage.phase].toUpperCase()}
                </Text>
              </Pressable>
            );
          })}

          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Math.min(56, Math.max(48, width * .13)), paddingVertical: 94 }}>
            <View style={{ alignSelf: 'center', width: '100%', maxWidth: 510 }}>
              <Text style={{ fontSize: 11, letterSpacing: 2, fontWeight: '700', color: flower && !hasPhoto ? '#D71D77' : secondary, marginBottom: 20 }}>
                {flower ? 'FLORAISON' : 'MON RÊVE'}
              </Text>
              <Text style={{ fontSize: width < 390 ? 32 : 41, lineHeight: width < 390 ? 39 : 49, fontFamily: 'serif', letterSpacing: -1, color: foreground, marginBottom: 16 }}>
                {dream.title}
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 24, color: secondary }}>
                {flower ? dream.testimony?.comment || dream.summary : dream.summary}
              </Text>
              {coOwners.length > 0 ? (
                <Text style={{ fontSize: 12, marginTop: 16, color: foreground }}>
                  Avec {coOwners.map(person => person.name).join(' · ')}
                </Text>
              ) : null}
              {dream.phase === 'Rêve' && dream.encouragementCount !== undefined ? (
                <Text style={{ marginTop: 18, fontSize: 12, color: secondary }}>
                  ♡ {dream.encouragementCount} encouragement{dream.encouragementCount > 1 ? 's' : ''}
                </Text>
              ) : null}
              {phaseIndex >= 1 ? (
                <View style={{ marginTop: 26, gap: 15 }}>
                  {dream.goalDate ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                      <Ionicons name="calendar-outline" size={17} color={secondary} />
                      <Text style={{ color: foreground, fontSize: 13 }}>{shortDate(dream.goalDate)}</Text>
                    </View>
                  ) : null}
                  {resources.length > 0 ? (
                    <View style={{ gap: 9 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {resources.slice(0, 10).map(resource => (
                          <View key={resource.id} accessibilityLabel={resource.title + (resource.confirmed ? ' confirmé' : ' à trouver')}
                            style={{ width: 28, height: 26, borderRadius: 5, backgroundColor: resource.confirmed ? '#9DB861' : (hasPhoto ? '#777573' : theme.dark ? '#383A3A' : '#E5E3DF'), alignItems: 'center', justifyContent: 'center' }}>
                            {resource.confirmed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                          </View>
                        ))}
                        {resources.length > 10 ? <Text style={{ color: secondary, fontSize: 11, alignSelf: 'center' }}>+{resources.length - 10}</Text> : null}
                      </View>
                      <Text style={{ fontSize: 12, color: secondary }}>
                        {missing === 0 ? 'Toutes les ressources réunies' : missing === 1 ? '1 ressource à trouver' : missing + ' ressources à trouver'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {phaseIndex >= 2 && dream.chat ? (
                <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'dream-' + dream.id } })}
                  accessibilityRole="button" accessibilityLabel="Conversation de ce rêve" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, paddingVertical: 10 }}>
                  <Ionicons name="chatbubbles-outline" size={21} color={foreground} />
                  <Text style={{ color: foreground, fontWeight: '600', fontSize: 13 }}>Conversation</Text>
                </Pressable>
              ) : null}
              {flower ? <View style={{ height: 3, width: 74, backgroundColor: '#D71D77', marginTop: 26, borderRadius: 3 }} /> : null}
            </View>
          </View>
        </View>
      )}

      {transition ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 20, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', opacity: veilOpacity }]}>
          <Text style={{ color: stages.find(stage => stage.phase === transition)?.color, fontSize: 33, fontFamily: 'serif', letterSpacing: -0.8 }}>
            {PHASE_LABELS[transition]}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
