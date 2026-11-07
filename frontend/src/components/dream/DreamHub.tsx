import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamResource } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { TopActions } from '@/components/navigation/TopActions';
import { useAppTheme } from '@/theme/AppTheme';
import DreamExperience from './DreamExperience';
import SemenceStudio from './SemenceStudio';

type Direction = 'top' | 'left' | 'bottom' | 'right';
const stages: { phase: DreamPhase; position: Direction; color: string }[] = [
  { phase: 'Rêve', position: 'top', color: '#D0A77E' },
  { phase: 'Initiation', position: 'left', color: '#A1BA44' },
  { phase: 'Croissance', position: 'bottom', color: '#27845B' },
  { phase: 'Témoignage', position: 'right', color: '#D71D77' },
];
const order: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];
// Swiping reveals the phase located on that side of the DreamHub.
function phaseFromSwipe(dx: number, dy: number, threshold: number): DreamPhase | null {
 const ax = Math.abs(dx), ay = Math.abs(dy);
 if (ax > ay * 1.2) return dx > threshold ? 'Initiation' : dx < -threshold ? 'Témoignage' : null;
 if (ay > ax * 1.2) return dy > threshold ? 'Rêve' : dy < -threshold ? 'Croissance' : null;
 return null;
}
/** An actual phase page enters from the edge of its corresponding handle. */
function sheetPosition(phase: DreamPhase, width: number, height: number, distance = 0) {
 if (phase === 'Initiation') return { x: -Math.max(0,width-distance), y: 0 };
 if (phase === 'Témoignage') return { x: Math.max(0,width-distance), y: 0 };
 if (phase === 'Rêve') return { x: 0, y: -Math.max(0,height-distance) };
 return { x: 0, y: Math.max(0,height-distance) };
}

/**
 * A handle may be tapped or physically pulled towards the centre.
 * Whole-screen directional swipes keep their original JenLow semantics.
 */
function PhaseMarker({
 position, color, disabled, selected, onPress, label, onPull, onCancel,
}: {
 position: Direction; color: string; disabled: boolean; selected: boolean;
 onPress: () => void; label: string; onPull: (distance: number) => void; onCancel: () => void;
}) {
 const horizontal = position === 'top' || position === 'bottom';
 const markerWidth = horizontal ? 58 : 44;
 const markerHeight = horizontal ? 50 : 54;
 const placement =
  position === 'top' ? { top: 57, left: '50%' as const, marginLeft: -markerWidth / 2 } :
  position === 'bottom' ? { bottom: 1, left: '50%' as const, marginLeft: -markerWidth / 2 } :
  position === 'left' ? { left: 0, top: '50%' as const, marginTop: -markerHeight / 2 } :
  { right: 0, top: '50%' as const, marginTop: -markerHeight / 2 };
 const enabledRef = useRef(!disabled);
 const onPressRef = useRef(onPress);
 const onPullRef = useRef(onPull);
 const onCancelRef = useRef(onCancel);
 enabledRef.current = !disabled;
 onPressRef.current = onPress;
 onPullRef.current = onPull;
 onCancelRef.current = onCancel;
 const inward = (dx: number, dy: number) => position === 'top' ? dy : position === 'bottom' ? -dy : position === 'left' ? dx : -dx;
 const responder = useRef(PanResponder.create({
  onStartShouldSetPanResponderCapture: () => enabledRef.current,
  onStartShouldSetPanResponder: () => enabledRef.current,
  onMoveShouldSetPanResponder: (_, g) => {
   const main = inward(g.dx, g.dy);
   const cross = horizontal ? Math.abs(g.dx) : Math.abs(g.dy);
   return enabledRef.current && main > 8 && main > cross * .8;
  },
  onPanResponderTerminationRequest: () => false,
  onPanResponderMove: (_, g) => onPullRef.current(Math.max(0, inward(g.dx, g.dy))),
  onPanResponderRelease: (_, g) => {
   const tap = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8;
   if (enabledRef.current && (tap || inward(g.dx, g.dy) > 62)) onPressRef.current();
   else onCancelRef.current();
  },
  onPanResponderTerminate: () => onCancelRef.current(),
 })).current;
 return (
  <View {...responder.panHandlers} style={{
   position: 'absolute', zIndex: 6, width: markerWidth, height: markerHeight,
   alignItems: 'center', justifyContent: 'center',
   opacity: disabled ? .35 : selected ? 1 : .84, ...placement,
  }}>
   <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={disabled ? label + ', phase à venir' : 'Tirer ou ouvrir ' + label}
    accessibilityState={{ disabled, selected }}
    style={{ width: markerWidth, height: markerHeight, alignItems: 'center', justifyContent: 'center' }}>
     <View style={{ width: horizontal ? 43 : 3, height: horizontal ? 3 : 41, borderRadius: 4, backgroundColor: color }} />
   </Pressable>
  </View>
 );
}

function shortDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date + 'T12:00:00');
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : date;
}

export default function DreamHub({ dream, startInSemence = false }: { dream: DreamEntry; startInSemence?: boolean }) {
  const theme = useAppTheme();
  const { patch } = useDreams();
  const { width, height } = useWindowDimensions();
  const compact = width < 720;
  const [open, setOpen] = useState<DreamPhase | null>(startInSemence && dream.phase === 'Rêve' ? 'Rêve' : null);
  const firstRender = useRef(true);
  const switchPhase = (next: DreamPhase) => {
    if (order.indexOf(next) <= order.indexOf(dream.phase)) setOpen(next);
  };
  const [preview, setPreview] = useState<DreamPhase | null>(null);
  const sheet = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const busy = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const phaseRef = useRef(dream.phase);
  phaseRef.current = dream.phase;
  const canOpen = (phase: DreamPhase) => order.indexOf(phase) <= order.indexOf(dream.phase);

  const resetScene = useCallback(() => {
    const target = previewRef.current;
    if (!target) return;
    Animated.spring(sheet, {
      toValue: sheetPosition(target, width, height),
      speed: 24, bounciness: 0, useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !busy.current && previewRef.current === target) {
        previewRef.current = null;
        setPreview(null);
      }
    });
  }, [sheet, width, height]);

  const enter = useCallback((phase: DreamPhase) => {
    if (busy.current || openRef.current || order.indexOf(phase) > order.indexOf(phaseRef.current)) {
      resetScene();
      return;
    }
    busy.current = true;
    if (previewRef.current !== phase) {
      sheet.setValue(sheetPosition(phase, width, height));
      previewRef.current = phase;
      setPreview(phase);
    }
    Animated.timing(sheet, {
      toValue: { x: 0, y: 0 }, duration: 310,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpen(phase);
      previewRef.current = null;
      setPreview(null);
      sheet.setValue({ x: 0, y: 0 });
      busy.current = false;
    });
  }, [sheet, width, height, resetScene]);

  const dragScene = useCallback((phase: DreamPhase, distance: number) => {
    if (busy.current || openRef.current || order.indexOf(phase) > order.indexOf(phaseRef.current)) return;
    if (previewRef.current !== phase) {
      sheet.setValue(sheetPosition(phase, width, height));
      previewRef.current = phase;
      setPreview(phase);
    }
    sheet.setValue(sheetPosition(phase, width, height, Math.max(0, distance)));
  }, [sheet, width, height]);

  const pullHandle = useCallback((phase: DreamPhase, distance: number) => {
    dragScene(phase, distance);
  }, [dragScene]);

  const enterRef = useRef(enter);
  enterRef.current = enter;
  const dragRef = useRef(dragScene);
  dragRef.current = dragScene;
  const resetRef = useRef(resetScene);
  resetRef.current = resetScene;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      !openRef.current && !busy.current && (Math.abs(g.dx) > 13 || Math.abs(g.dy) > 13),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const target = phaseFromSwipe(g.dx, g.dy, 10);
      if (target) dragRef.current(target, Math.max(Math.abs(g.dx), Math.abs(g.dy)));
    },
    onPanResponderRelease: (_, g) => {
      if (openRef.current || busy.current) return;
      const target = phaseFromSwipe(g.dx, g.dy, 75);
      if (target && order.indexOf(target) <= order.indexOf(phaseRef.current)) enterRef.current(target);
      else resetRef.current();
    },
    onPanResponderTerminate: () => resetRef.current(),
  }), []);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setOpen(null);
    setPreview(null);
    previewRef.current = null;
    sheet.stopAnimation();
    sheet.setValue({ x: 0, y: 0 });
  }, [dream.phase]);

  const resources: DreamResource[] = dream.resources || (dream.needs || []).map((title, index) => ({
    id: 'legacy-' + index,
    title,
    confirmed: (dream.resolvedNeeds || []).includes(title),
    category: 'practical' as const,
  }));
  const requestedTalents = resources.filter(item => item.category === 'person');
  const otherResources = resources.filter(item => item.category !== 'person');
  const talentFound = requestedTalents.filter(item => item.confirmed).length;
  const resourceFound = otherResources.filter(item => item.confirmed).length;
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

  const activeAccent = stages.find(stage => stage.phase === dream.phase)?.color || '#242322';
  const activeButtonText = dream.phase === 'Rêve' || dream.phase === 'Initiation' ? '#242322' : '#FFFFFF';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {open ? (
        open === 'Rêve' ? <SemenceStudio dream={dream} onBack={() => setOpen(null)} onNavigate={switchPhase} />
          : <DreamExperience dream={dream} viewPhase={open} onBack={() => setOpen(null)} onNavigate={switchPhase} />
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
                onPull={distance => pullHandle(stage.phase, distance)}
                onCancel={resetScene}
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
                {phaseIndex >= 1 ? (
                  <View style={{ marginTop: compact ? 17 : 25, alignItems: 'center', gap: 8 }}>
                    {requestedTalents.length > 0 ? (
                      <Text style={{ fontSize: 11, color: muted, textAlign: 'center' }}>
                        <Text style={{ fontWeight: '700', letterSpacing: 0.7 }}>TALENTS NÉCESSAIRES  </Text>
                        {talentFound}/{requestedTalents.length} trouvés
                      </Text>
                    ) : null}
                    {otherResources.length > 0 ? (
                      <Text style={{ fontSize: 11, color: muted, textAlign: 'center' }}>
                        <Text style={{ fontWeight: '700', letterSpacing: 0.7 }}>RESSOURCES NÉCESSAIRES  </Text>
                        {resourceFound}/{otherResources.length} trouvées
                      </Text>
                    ) : null}
                  </View>
                ) : null}

              </View>
            </View>
            <View style={{
              position: 'absolute', left: compact ? 26 : 40, right: compact ? 26 : 40,
              bottom: compact ? 59 : 73,
              zIndex: 5, alignItems: 'center',
            }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Ouvrir ' + currentLabel}
                onPress={() => enter(dream.phase)}
                style={{
                  minHeight: 45, paddingHorizontal: 27, paddingVertical: 12,
                  borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: activeAccent,
                }}
              >
                <Text style={{
                  color: activeButtonText, fontSize: 12, fontWeight: '700', letterSpacing: .2,
                }}>{dream.phase === 'Témoignage' ? 'Voir ma Floraison' : 'Ouvrir ' + currentLabel}</Text>
              </Pressable>
              {phaseIndex >= 2 ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'dream-' + dream.id } })}
                  accessibilityRole="button" accessibilityLabel="Ouvrir la conversation du rêve"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11, padding: 8 }}
                >
                  <Ionicons name="chatbubbles-outline" size={17} color={ink} />
                  <Text style={{ color: ink, fontSize: 12, textDecorationLine: 'underline' }}>Conversation du rêve</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {preview ? (
            <Animated.View pointerEvents="none" style={{
              position: 'absolute',
              left: compact ? 0 : 24, right: compact ? 0 : 24,
              top: compact ? 0 : 17, bottom: compact ? 0 : 17,
              maxWidth: 1120, alignSelf: 'center',
              backgroundColor: theme.background,
              borderRadius: compact ? 0 : 15, overflow: 'hidden',
              zIndex: 10,
              transform: sheet.getTranslateTransform(),
            }}>
              {preview === 'Rêve' ? (
                <SemenceStudio dream={dream} onBack={resetScene} />
              ) : (
                <DreamExperience dream={dream} viewPhase={preview} onBack={resetScene} />
              )}
            </Animated.View>
          ) : null}
        </View>
      )}
    </View>
  );
}
