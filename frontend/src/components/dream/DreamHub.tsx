import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamResource } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { TopActions } from '@/components/navigation/TopActions';
import { useAppTheme } from '@/theme/AppTheme';
import { DreamTalentSquare } from './DreamTalentSquare';
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

/**
 * A handle may be tapped or physically pulled towards the centre.
 * Whole-screen directional swipes keep their original JenLow semantics.
 */
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

  const offset = useRef(new Animated.Value(0)).current;
  const onPressRef = useRef(onPress);
  const enabledRef = useRef(!disabled);
  onPressRef.current = onPress;
  enabledRef.current = !disabled;

  const inward = (dx: number, dy: number) =>
    position === 'top' ? dy : position === 'bottom' ? -dy : position === 'left' ? dx : -dx;
  const sign = position === 'top' || position === 'left' ? 1 : -1;
  const responder = useRef(PanResponder.create({
    // Capture the handle from touch-down so the surrounding full-screen swipe never steals it.
    onStartShouldSetPanResponderCapture: () => enabledRef.current,
    onStartShouldSetPanResponder: () => enabledRef.current,
    onMoveShouldSetPanResponder: (_, g) => {
      const main = inward(g.dx, g.dy);
      const cross = horizontal ? Math.abs(g.dx) : Math.abs(g.dy);
      return enabledRef.current && main > 8 && main > cross * 0.8;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const value = Math.min(114, Math.max(0, inward(g.dx, g.dy)));
      offset.setValue(value * sign);
    },
    onPanResponderRelease: (_, g) => {
      const isTap = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8;
      const reached = inward(g.dx, g.dy) >= 60;
      if ((isTap || reached) && enabledRef.current) {
        offset.setValue(0);
        onPressRef.current();
      } else {
        Animated.spring(offset, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(offset, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
    },
  })).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        position: 'absolute', zIndex: 6,
        width: 58, height: 58,
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.38 : selected ? 1 : 0.85,
        transform: horizontal ? [{ translateY: offset }] : [{ translateX: offset }],
        ...placement,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={disabled ? label + ', phase à venir' : 'Tirer ou ouvrir ' + label}
        accessibilityState={{ disabled, selected }}
        style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{
          width: horizontal ? 43 : 3,
          height: horizontal ? 3 : 43,
          borderRadius: 4, backgroundColor: color,
        }} />
      </Pressable>
    </Animated.View>
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
  const { patch } = useDreams();
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
    onMoveShouldSetPanResponder: (_, g) =>
      !openRef.current && !busy.current && (Math.abs(g.dx) > 26 || Math.abs(g.dy) > 26),
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

  useEffect(() => { setOpen(null); }, [dream.phase]);

  const resources: DreamResource[] = dream.resources || (dream.needs || []).map((title, index) => ({
    id: 'legacy-' + index,
    title,
    confirmed: (dream.resolvedNeeds || []).includes(title),
    category: 'practical' as const,
  }));
  const missing = resources.filter(item => !item.confirmed).length;
  const requestedTalents = resources.filter(item => item.category === 'person');
  const confirmed = resources.length - missing;
  const phaseIndex = order.indexOf(dream.phase);
  const currentLabel = PHASE_LABELS[dream.phase];
  const image = dream.phase === 'Témoignage'
    ? (dream.resultImage || dream.testimony?.mediaItems?.find(media => media.kind === 'photo')?.uri || dream.image)
    : dream.image;
  const hasImage = !!image;
  const ink = theme.dark ? '#F7F5F0' : '#222320';
  const muted = theme.dark ? '#D1D0C9' : '#565A56';
  const coOwners = (dream.coOwners || []).filter(owner => owner.accepted && !!owner.name.trim());

  // Older demo Croissance/Floraison entries existed before local dream conversations.
  // Ensure their link is functional without pretending this is a server group chat.
  useEffect(() => {
    if (phaseIndex >= 2 && !dream.chat) {
      patch(dream.id, { chat: { id: 'dream-' + dream.id, messages: [] } });
    }
  }, [dream.id, dream.phase, !!dream.chat]);

  const tileSize = width < 350 ? 51 : width < 390 ? 58 : compact ? 70 : 85;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {open ? (
        open === 'Rêve' ? <SemenceStudio dream={dream} onBack={() => setOpen(null)} />
          : <DreamExperience dream={dream} viewPhase={open} onBack={() => setOpen(null)} />
      ) : (
        <View style={{
          flex: 1, paddingHorizontal: compact ? 0 : 24,
          paddingVertical: compact ? 0 : 17, alignItems: 'center',
        }}>
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

            <View style={{
              position: 'absolute', left: compact ? 11 : 23, right: compact ? 11 : 23,
              top: compact ? 7 : 16, zIndex: 8,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Pressable
                onPress={() => router.replace('/my-space')}
                accessibilityRole="button"
                accessibilityLabel="Retour à mes rêves"
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back-outline" color={ink} size={22} />
              </Pressable>
              <TopActions />
            </View>

            {stages.map(stage => (
              <PhaseMarker key={stage.phase}
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
              paddingHorizontal: compact ? (width < 380 ? 28 : 39) : 80,
              paddingTop: compact ? 53 : 74,
              paddingBottom: compact ? 54 : Math.min(height * .10, 90),
            }}>
              <View style={{ alignItems: 'center', width: '100%', maxWidth: 580 }}>
                <Text style={{
                  color: muted, fontSize: 10, letterSpacing: 2,
                  fontWeight: '700', marginBottom: compact ? 13 : 20,
                }}>{currentLabel.toUpperCase()}</Text>
                <Text style={{
                  fontFamily: 'serif', fontSize: compact ? (height < 730 ? 29 : 33) : 45,
                  lineHeight: compact ? (height < 730 ? 37 : 42) : 55, letterSpacing: -.7,
                  color: ink, textAlign: 'center', marginBottom: compact ? 9 : 15,
                }}>{dream.title}</Text>
                {dream.summary ? (
                  <Text numberOfLines={compact ? 2 : 3} style={{
                    color: muted, fontSize: compact ? 12 : 15,
                    lineHeight: compact ? 19 : 24, textAlign: 'center', maxWidth: 470,
                  }}>
                    {dream.phase === 'Témoignage' ? (dream.testimony?.comment || dream.summary) : dream.summary}
                  </Text>
                ) : null}

                {phaseIndex >= 1 ? (
                  <Pressable
                    disabled={!!dream.goalDate || dream.phase !== 'Initiation'}
                    onPress={() => enter('Initiation')}
                    accessibilityRole="button"
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                      marginTop: compact ? 14 : 19, paddingVertical: 5,
                    }}
                  >
                    <Ionicons name="calendar-outline" size={15} color={ink}/>
                    <Text style={{ fontSize: compact ? 12 : 13, color: ink, fontWeight: '600' }}>
                      {dream.goalDate ? 'Date objectif · ' + shortDate(dream.goalDate) : 'Date objectif à définir'}
                    </Text>
                  </Pressable>
                ) : null}
                {coOwners.length > 0 ? <Text style={{
                  fontSize: 11, lineHeight: 18, marginTop: 8, color: muted, textAlign: 'center',
                }}>Avec {coOwners.map(person => person.name).join(' · ')}</Text> : null}

                {dream.phase === 'Rêve' && typeof dream.encouragementCount === 'number' ? (
                  <Text style={{ fontSize: 11, marginTop: 10, color: muted }}>
                    {dream.encouragementCount} encouragement{dream.encouragementCount === 1 ? '' : 's'}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Ouvrir ' + currentLabel}
                  onPress={() => enter(dream.phase)}
                  style={{
                    minHeight: 44, marginTop: compact ? 18 : 24,
                    paddingHorizontal: 26, paddingVertical: 12,
                    borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: theme.dark ? '#F7F4ED' : '#242322',
                  }}
                >
                  <Text style={{
                    color: theme.dark ? '#242322' : '#FFFFFF',
                    fontSize: 12, fontWeight: '700', letterSpacing: .2,
                  }}>{dream.phase === 'Témoignage' ? 'Voir ma Floraison' : 'Ouvrir ' + currentLabel}</Text>
                </Pressable>

                {phaseIndex >= 1 && requestedTalents.length > 0 ? (
                  <View style={{ marginTop: compact ? 17 : 22, alignItems: 'center', gap: 8, width: '100%' }}>
                    <Text style={{ fontSize: 10, color: muted, fontWeight: '700', letterSpacing: 1 }}>
                      TALENTS NÉCESSAIRES
                    </Text>
                    <View style={{
                      flexDirection: 'row', flexWrap: 'wrap',
                      alignItems: 'center', justifyContent: 'center', gap: compact ? 7 : 10,
                    }}>
                      {requestedTalents.slice(0, 4).map(item => (
                        <DreamTalentSquare key={item.id} resource={item} size={tileSize} />
                      ))}
                    </View>
                    {requestedTalents.length > 4 ? (
                      <Text style={{ fontSize: 11, color: muted }}>+ {requestedTalents.length - 4} autres talents</Text>
                    ) : null}
                  </View>
                ) : null}

                {phaseIndex >= 1 && resources.length > 0 ? (
                  <Text style={{
                    fontSize: 11, lineHeight: 17, marginTop: 12, color: muted, textAlign: 'center',
                  }}>{confirmed} / {resources.length} ressources confirmées</Text>
                ) : null}

                {phaseIndex >= 2 ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'dream-' + dream.id } })}
                    accessibilityRole="button"
                    accessibilityLabel="Ouvrir la conversation du rêve"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: compact ? 10 : 17, padding: 8 }}
                  >
                    <Ionicons name="chatbubbles-outline" size={17} color={ink}/>
                    <Text style={{ color: ink, fontSize: 12, textDecorationLine: 'underline' }}>Conversation du rêve</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}

      {transition ? (
        <Animated.View pointerEvents="none" style={[
          StyleSheet.absoluteFill,
          { zIndex: 20, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', opacity: veilOpacity },
        ]}>
          <Text style={{ color: stages.find(stage => stage.phase === transition)?.color, fontSize: 30, fontFamily: 'serif' }}>
            {PHASE_LABELS[transition]}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
