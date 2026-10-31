import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { useApp } from '@/context/AppContext';
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

function MediaImage({ uri, height }: { uri: string; height: number }) {
  return (
    <View style={{ flex: 1, height, overflow: 'hidden', backgroundColor: '#454545' }}>
      <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

type PersonNeed = {
  title: string;
  confirmed: boolean;
  illustration?: TalentIllustration;
  requiredLevel?: string;
};

function PersonResourceTiles({ resources, width, compact, dark }: {
  resources: PersonNeed[];
  width: number;
  compact: boolean;
  dark: boolean;
}) {
  // Four across only when there's space; two across on narrow Discovery cards.
  const columns = compact ? (width < 270 ? 2 : 3) : (width < 510 ? 3 : 4);
  const gap = compact ? 8 : 12;
  const contentWidth = Math.max(0, width - (compact ? (width < 205 ? 26 : 34) : (width < 440 ? 46 : 64)));
  const tileWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);
  const confirmed = resources.filter(resource => resource.confirmed).length;
  return (
    <View style={{ gap: compact ? 12 : 17 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>
      {resources.map((resource, index) => (
        <View
          key={resource.title + '-' + index}
          style={{ width: tileWidth, alignItems: 'center', gap: compact ? 6 : 8 }}
          accessibilityLabel={resource.title + (resource.confirmed ? ', confirmé' : ', recherché') + (resource.requiredLevel ? ', niveau ' + resource.requiredLevel : '')}
        >
          <View style={{
            width: tileWidth, height: compact ? Math.max(52, tileWidth * 0.85) : Math.max(90, tileWidth * 0.87),
            backgroundColor: resource.confirmed ? '#AEC486' : (dark ? '#111317' : '#FFFCF5'),
            borderRadius: 8,
            overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {resource.illustration ? (
              <TalentArt kind={resource.illustration} size={tileWidth * 0.72} />
            ) : (
              <Ionicons name="person-outline" size={tileWidth * 0.45} color={dark ? '#ECE7E1' : '#34302C'} />
            )}
          </View>
          {resource.requiredLevel ? (
            <View style={{ transform: [{ scale: compact && tileWidth < 87 ? 0.68 : 0.86 }] }}>
              <TalentLevelDots level={resource.requiredLevel} />
            </View>
          ) : (
            <View style={{ height: 9 }} />
          )}
        </View>
      ))}
      </View>
      <Text
        style={{
          fontSize: compact ? 10 : 12,
          color: dark ? '#A8C6A9' : '#608067',
          textAlign: 'right',
          letterSpacing: 0.2,
        }}
      >
        {confirmed}/{resources.length} talents trouvés
      </Text>
    </View>
  );
}

/**
 * Identical Dream phases in Discovery and the detail hero. The detail accordion
 * and reaction rail remain owned by DreamReferenceLayout and DetailLayout.
 */
export function DreamPhaseCard({ item, width, variant, onOpen }: Props) {
  const theme = useAppTheme();
  const app = useApp();
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
                <MediaImage uri={images[0]} height={thumbnailHeight} />
                {images[1] ? (
                  <MediaImage uri={images[1]} height={thumbnailHeight} />
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
                  <MediaImage uri={images[2]} height={wideHeight} />
                </View>
              ) : (
                <View style={{ height: compact ? 31 : 40, backgroundColor: dark ? '#363636' : '#E3DCD2', justifyContent: 'center', paddingHorizontal: 12 }}>
                  <Text style={{ color: dark ? '#D6CBBF' : '#75675B', fontSize: compact ? 10 : 12 }}>Une idée qui prend forme</Text>
                </View>
              )}
              {!compact && (
                <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Pressable
                    onPress={() => app.joinDream(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Moi aussi"
                    style={{
                      minWidth: 136, paddingHorizontal: 17, paddingVertical: 11,
                      backgroundColor: dark ? 'rgba(33,33,35,0.92)' : 'rgba(248,245,241,0.94)',
                      borderWidth: 1, borderColor: dark ? '#B7ABA8' : '#85756D',
                      borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Ionicons name={app.myDreamIds.includes(item.id) ? 'checkmark-circle' : 'add-circle-outline'} size={19} color={app.myDreamIds.includes(item.id) ? '#CB245C' : textColor} />
                    <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>Moi aussi</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>,
        )}
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
            {people.length > 0 ? (
              <PersonResourceTiles resources={people} width={width} compact={compact} dark={dark} />
            ) : (
              <Text style={{ color: subdued, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 22 }}>
                Aucun besoin en personnes renseigné pour ce rêve.
              </Text>
            )}
          </View>,
        )}
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
