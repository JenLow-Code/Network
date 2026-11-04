import React from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamPublication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { TalentArt, type TalentIllustration } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';

type Props = {
  item: DreamPublication;
  width: number;
  variant: 'tile' | 'detail';
  onOpen?: () => void;
};

const serif = Platform.select({
  web: 'Georgia, "Times New Roman", serif',
  ios: 'Georgia',
  default: 'serif',
});

function shortDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthHorizon(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function dreamDuration(value?: string): string | null {
  if (!value) return null;
  const start = new Date(value);
  if (!Number.isFinite(start.getTime())) return null;
  const now = new Date();
  if (start.getTime() > now.getTime()) return null;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) {
    const days = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000));
    return days === 1 ? '1 jour' : days + ' jours';
  }
  if (months < 12) return months + ' mois';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years + (years > 1 ? ' ans' : ' an') + (rest ? ' · ' + rest + ' mois' : '');
}

function MediaImage({ uri, height, onPress }: { uri: string; height: number; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? 'Agrandir la photographie' : undefined} style={{ flex: 1, height, overflow: 'hidden', backgroundColor: '#454545' }}>
      <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </Pressable>
  );
}

type PersonNeed = {
  title: string;
  confirmed: boolean;
  illustration?: TalentIllustration;
  requiredLevel?: string;
  description?: string;
};

function PersonResourceTiles({ resources, width, compact, dark, onInspect }: {
  resources: PersonNeed[];
  width: number;
  compact: boolean;
  dark: boolean;
  onInspect?: (resource: PersonNeed) => void;
}) {
  // Four across only when there's space; two across on narrow Discovery cards.
  const columns = compact ? (width < 270 ? 2 : 3) : (width < 510 ? 3 : 4);
  const gap = compact ? 8 : 12;
  const contentWidth = Math.max(0, width - (compact ? (width < 205 ? 26 : 34) : (width < 440 ? 46 : 64)));
  const tileWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);
  // Discovery uses a delicate, tile-size-relative outline; detail has a fixed, stronger frame.
  const missingTalentBorderWidth = compact
    ? Math.max(0.6, Math.min(1.2, tileWidth / 120))
    : 3;
  return (
    <View style={{ gap: compact ? 12 : 17 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>
      {resources.map((resource, index) => (
        <Pressable
          key={resource.title + '-' + index}
          disabled={!onInspect}
          onPress={() => onInspect?.(resource)}
          accessibilityRole={onInspect ? 'button' : undefined}
          accessibilityLabel={resource.title + (resource.confirmed ? ', confirmé' : ', recherché') + (resource.requiredLevel ? ', niveau ' + resource.requiredLevel : '')}
          style={{
            width: tileWidth, height: compact ? Math.max(70, tileWidth * 0.94) : Math.max(112, tileWidth * 0.98),
            backgroundColor: resource.confirmed ? (dark ? '#566E4E' : '#C0D3B0') : (dark ? '#111317' : '#FFFCF5'),
            borderRadius: 8, borderWidth: resource.confirmed ? 0 : missingTalentBorderWidth,
            borderColor: '#D95768', overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 3,
          }}>
            {resource.illustration ? (
              <TalentArt kind={resource.illustration} size={tileWidth * 0.72} />
            ) : (
              <Ionicons name="person-outline" size={tileWidth * 0.45} color={dark ? '#ECE7E1' : '#34302C'} />
            )}
          {resource.requiredLevel && (
            <TalentLevelDots
              level={resource.requiredLevel}
              size={compact && tileWidth < 96 ? 5 : 7}
              spacing={compact && tileWidth < 96 ? 3 : 5}
            />
          )}
        </Pressable>
      ))}
      </View>

    </View>
  );
}

/**
 * Identical Dream phases in Discovery and the detail hero. The detail accordion
 * and reaction rail remain owned by DreamReferenceLayout and DetailLayout.
 */
export function DreamPhaseCard({ item, width, variant, onOpen }: Props) {
  const theme = useAppTheme();
  const [inspectedTalent, setInspectedTalent] = React.useState<PersonNeed | null>(null);
  const [inspectedImage, setInspectedImage] = React.useState<string | null>(null);
  const viewport = useWindowDimensions();
  const compact = variant === 'tile';
  const dark = theme.dark;
  const inset = compact ? (width < 205 ? 13 : 17) : (width < 440 ? 23 : 32);
  const titleSize = compact ? (width < 190 ? 18 : 21) : (width < 440 ? 31 : 41);
  const ink = theme.foreground;
  const subdued = theme.muted;
  // All neutral surfaces use the same Semence palette, never phase-specific green.
  const neutral = dark ? '#282A2E' : '#F0EBE4';
  const base = { width, borderRadius: 0, overflow: 'hidden' as const };
  const withOpen = (content: React.ReactNode) => onOpen ? (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={'Voir le rêve : ' + item.title}>
      {content}
    </Pressable>
  ) : <View>{content}</View>;
  const phaseText = (color: string = subdued) => (
    <Text style={{ color, fontSize: compact ? 9 : 11, fontWeight: '700', letterSpacing: 1.3, textAlign: 'right' }}>
      {PHASE_LABELS[item.phase].toUpperCase()}
    </Text>
  );
  const heading = (color: string = ink) => (
    <Text style={{ fontFamily: serif, fontSize: titleSize, lineHeight: compact ? titleSize + 6 : titleSize + 8, letterSpacing: -0.65, color }}>
      {item.title}
    </Text>
  );
  const imageViewer = (
    <Modal visible={!!inspectedImage} transparent animationType="fade" onRequestClose={() => setInspectedImage(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', padding: 18 }}>
        <Pressable onPress={() => setInspectedImage(null)} accessibilityRole="button" accessibilityLabel="Fermer l'image" style={{ alignSelf: 'flex-end', padding: 12 }}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        {inspectedImage && <Image source={{ uri: inspectedImage }} resizeMode="contain" style={{ width: '100%', height: Math.max(160, viewport.height - 155) }} />}
      </View>
    </Modal>
  );
  const talentViewer = (
    <Modal visible={!!inspectedTalent} transparent animationType="fade" onRequestClose={() => setInspectedTalent(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 25 }}>
        <View style={{ backgroundColor: theme.surface, padding: 24, gap: 14, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
          <Pressable onPress={() => setInspectedTalent(null)} style={{ alignSelf: 'flex-end' }} accessibilityLabel="Fermer"><Ionicons name="close" size={22} color={ink} /></Pressable>
          <Text style={{ color: subdued, fontSize: 10, letterSpacing: 1.2 }}>TALENT RECHERCHÉ</Text>
          <Text style={{ color: ink, fontFamily: serif, fontSize: 28 }}>{inspectedTalent?.title}</Text>
          {inspectedTalent?.requiredLevel && <View style={{ gap: 8 }}>
            <Text style={{ color: subdued, fontSize: 13 }}>Niveau souhaité : {inspectedTalent.requiredLevel}</Text>
            <TalentLevelDots level={inspectedTalent.requiredLevel} align="start" />
          </View>}
          <Text style={{ color: subdued, fontSize: 14, lineHeight: 22 }}>
            {inspectedTalent?.description?.trim() || 'Le porteur de ce rêve n’a pas encore précisé les attentes pour ce talent.'}
          </Text>
          <Text style={{ color: inspectedTalent?.confirmed ? '#739C75' : '#C75968', fontSize: 12 }}>
            {inspectedTalent?.confirmed ? 'Talent confirmé' : 'Talent encore recherché'}
          </Text>
        </View>
      </View>
    </Modal>
  );
  const topRight = (color?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
      {phaseText(color)}
    </View>
  );

  if (item.phase === 'Rêve') {
    const gallery = (item.galleryImages || []).filter(Boolean);
    const images = gallery.length ? gallery : [item.image];
    const thumbnailHeight = compact ? Math.max(64, width * 0.37) : Math.min(185, width * 0.24);
    const wideHeight = compact ? Math.max(76, width * 0.40) : Math.min(190, width * 0.26);
    const textColor = dark ? '#F5F1EC' : '#292622';
    return (
      <View style={[base, { backgroundColor: neutral }]}>
        {withOpen(
          <View style={{ padding: inset, gap: compact ? 11 : 18 }}>
            {topRight(dark ? '#CCBCA9' : '#74594B')}
            {heading(textColor)}
            {!compact && (
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 10, letterSpacing: 1.1, color: dark ? '#CAB9AB' : '#866D61' }}>MON BUT</Text>
                <Text style={{ fontSize: 15, lineHeight: 23, color: dark ? '#E3DCD4' : '#4B403B' }}>{item.summary}</Text>
              </View>
            )}
            <View style={{ position: 'relative', gap: 5 }}>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <MediaImage uri={images[0]} height={thumbnailHeight} onPress={compact ? undefined : () => setInspectedImage(images[0])} />
                {images[1] ? (
                  <MediaImage uri={images[1]} height={thumbnailHeight} onPress={compact ? undefined : () => setInspectedImage(images[1])} />
                ) : (
                  <View style={{ flex: 1, height: thumbnailHeight, backgroundColor: dark ? '#353535' : '#DDD7CB', justifyContent: 'center', padding: 9 }}>
                    <Text style={{ color: dark ? '#D5CAC0' : '#67584D', fontFamily: serif, fontSize: compact ? 12 : 19 }}>
                      {item.summary || 'Une idée à cultiver'}
                    </Text>
                  </View>
                )}
              </View>
              {images[2] ? (
                <View style={{ flexDirection: 'row' }}>
                  <MediaImage uri={images[2]} height={wideHeight} onPress={compact ? undefined : () => setInspectedImage(images[2])} />
                </View>
              ) : (
                <View style={{ height: compact ? 31 : 40, backgroundColor: dark ? '#363636' : '#E3DCD2', justifyContent: 'center', paddingHorizontal: 12 }}>
                  <Text style={{ color: dark ? '#D6CBBF' : '#75675B', fontSize: compact ? 10 : 12 }}>Une idée qui prend forme</Text>
                </View>
              )}
              {!compact && (
                <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'member', recipient: item.author, draft: 'Bonjour ' + item.author + ', j’aimerais échanger sur votre rêve « ' + item.title + ' ».' } })}
                    accessibilityRole="button"
                    accessibilityLabel="Échanger sur ce rêve"
                    style={{
                      minWidth: 136, paddingHorizontal: 17, paddingVertical: 11,
                      backgroundColor: dark ? 'rgba(33,33,35,0.92)' : 'rgba(248,245,241,0.94)',
                      borderWidth: 1, borderColor: dark ? '#B7ABA8' : '#85756D',
                      borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={textColor} />
                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>Échanger</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>,
        )}
        {imageViewer}
      </View>
    );
  }

  if (item.phase === 'Initiation') {
    // Only explicitly person-classified resources become talent tiles. Practical
    // resources remain in the underlying Dream and existing expandable sections.
    const resources: NonNullable<DreamPublication['resources']> = item.resources?.length
      ? item.resources
      : item.needs.map(title => ({ title, confirmed: (item.resolvedNeeds || []).includes(title) }));
    const people = resources.filter(r => r.category === 'person');
    return (
      <View style={[base, { backgroundColor: compact ? neutral : 'transparent' }]}>
        {withOpen(
          <View style={{ padding: inset, gap: compact ? 15 : 21 }}>
            {topRight()}
            {heading()}
            {people.length > 0 && (
              <Text style={{ color: subdued, fontSize: compact ? 10 : 12 }}>
                {people.filter(resource => resource.confirmed).length}/{people.length} talents trouvés
              </Text>
            )}
            {people.length > 0 ? (
              <PersonResourceTiles resources={people} width={width} compact={compact} dark={dark} onInspect={compact ? undefined : setInspectedTalent} />
            ) : (
              <Text style={{ color: subdued, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 22 }}>
                Aucun besoin en personnes renseigné pour ce rêve.
              </Text>
            )}
          </View>,
        )}
        {talentViewer}
      </View>
    );
  }

  if (item.phase === 'Croissance') {
    const journal = item.journalEntry?.text || item.logs?.[item.logs.length - 1] || item.summary;
    const date = shortDate(item.journalEntry?.date);
    const startDate = item.createdAt && /^\d{4}-\d{2}-\d{2}/.test(item.createdAt)
      ? item.createdAt.slice(0, 10).split('-').reverse().join('.') : null;
    const quiet = dark ? '#C0BCB8' : '#766F69';
    const growingGreen = dark ? '#9FC5A0' : '#518663';
    return (
      <View style={[base, { backgroundColor: 'transparent' }]}>
        {withOpen(
          <View style={{ padding: inset, gap: compact ? 12 : 19 }}>
            {topRight()}
            {!compact && heading()}
            <View style={{ gap: 8, paddingVertical: compact ? 4 : 8 }}>
              {!!date && <Text style={{ color: quiet, fontSize: compact ? 10 : 12 }}>{date}</Text>}
              <Text style={{
                color: ink,
                fontFamily: HANDWRITING_FAMILY,
                fontSize: compact ? (width < 185 ? 17 : 20) : 28,
                lineHeight: compact ? 26 : 37,
              }}>
                « {journal} »
              </Text>
              {!!startDate && (
                <Text style={{ color: growingGreen, fontSize: compact ? 11 : 12, marginTop: compact ? 5 : 11 }}>
                  Grandit depuis le {startDate}
                </Text>
              )}
            </View>
          </View>,
        )}
      </View>
    );
  }

  // Floraison stays photograph-led in both views. The title and result
  // form a single bottom-aligned group over a subtle dark gradient. Detail adds
  // a gentle page-colored fade after the readable caption to meet the panels.
  const image = item.resultImage || item.image;
  const mediaHeight = compact
    ? Math.max(230, width * 1.40)
    : Math.max(285, Math.min(385, width * 0.57));
  const gradientId = 'floraison-' + item.id.replace(/[^a-zA-Z0-9]/g, '') + '-' + variant;
  return (
    <View style={[base, { backgroundColor: theme.background }]}>
      {withOpen(
        <View style={{ width, height: mediaHeight, backgroundColor: theme.background, overflow: 'hidden' }}>
          <Image source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          <Svg pointerEvents="none" width={width} height={mediaHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={gradientId + '-shade'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#09070A" stopOpacity={0.06} />
                <Stop offset="39%" stopColor="#09070A" stopOpacity={0.04} />
                <Stop offset="66%" stopColor="#09070A" stopOpacity={0.32} />
                <Stop offset="88%" stopColor="#09070A" stopOpacity={0.69} />
                <Stop offset="100%" stopColor="#09070A" stopOpacity={0.78} />
              </LinearGradient>
              {!compact && (
                <LinearGradient id={gradientId + '-fade'} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={theme.background} stopOpacity={0} />
                  <Stop offset="80%" stopColor={theme.background} stopOpacity={0} />
                  <Stop offset="94%" stopColor={theme.background} stopOpacity={0.36} />
                  <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
                </LinearGradient>
              )}
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-shade)'} />
            {!compact && <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-fade)'} />}
          </Svg>
          <View pointerEvents="none" style={{ position: 'absolute', top: inset - 4, right: inset - 4 }}>
            <DreamPhaseIcon phase="Témoignage" size={compact ? 47 : 65} />
          </View>
          <View style={{
            position: 'absolute',
            bottom: compact ? inset : 74,
            left: inset,
            right: inset,
            gap: compact ? 5 : 7,
          }}>
            {heading('#FFFFFF')}
            <Text style={{
              color: '#F5DCE6',
              fontSize: compact ? 12 : 16,
              lineHeight: compact ? 18 : 23,
              textShadowColor: 'rgba(0,0,0,0.48)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}>
              {item.summary}
            </Text>
          </View>

        </View>,
      )}
    </View>
  );
}
