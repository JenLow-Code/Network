import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { useApp } from '@/context/AppContext';

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

/** A filled pie, not a progress ring or music-player-like linear bar. */
function ResourcePie({ completed, total, size, dark }: { completed: number; total: number; size: number; dark: boolean }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
  const radius = size / 2;
  const angle = ratio * Math.PI * 2;
  const x = radius + radius * Math.sin(angle);
  const y = radius - radius * Math.cos(angle);
  const wedge = 'M ' + radius + ' ' + radius + ' L ' + radius + ' 0 A ' +
    radius + ' ' + radius + ' 0 ' + (ratio > 0.5 ? 1 : 0) + ' 1 ' + x + ' ' + y + ' Z';
  const empty = dark ? '#505157' : '#D5D1CC';
  return (
    <Svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} accessibilityLabel={total ? completed + ' ressources confirmées sur ' + total : 'Aucune ressource définie'}>
      <Circle cx={radius} cy={radius} r={radius} fill={ratio === 1 ? '#CB245C' : empty} />
      {ratio > 0 && ratio < 1 && <Path d={wedge} fill="#CB245C" />}
    </Svg>
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
    const resources = item.resources?.length
      ? item.resources
      : item.needs.map(title => ({ title, confirmed: (item.resolvedNeeds || []).includes(title) }));
    const confirmed = resources.filter(resource => resource.confirmed).length;
    const total = resources.length;
    const missing = resources.filter(resource => !resource.confirmed);
    const mainNeed = missing[0]?.title;
    const otherNeeds = missing.slice(1);
    const chartSize = compact ? 46 : 72;
    return (
      <View style={[base, { backgroundColor: compact ? neutral : 'transparent' }]}>
        {withOpen(
          <View style={{ padding: inset, gap: compact ? 15 : 22 }}>
            {topRight()}
            {compact ? (
              <View style={{ gap: 7 }}>
                <Text style={{ fontSize: 9, letterSpacing: 1.2, color: subdued, fontWeight: '600' }}>
                  {mainNeed ? 'ON RECHERCHE' : 'LES RESSOURCES'}
                </Text>
                <Text style={{ fontFamily: serif, color: ink, fontSize: titleSize + 4, lineHeight: titleSize + 10 }}>
                  {mainNeed || (total ? 'Tout est réuni' : 'À définir')}
                </Text>
                <Text style={{ fontSize: 11, lineHeight: 17, color: subdued }}>
                  Pour « {item.title} »
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {heading()}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: '600', color: subdued }}>
                    {missing.length ? 'NOUS RECHERCHONS' : 'RESSOURCES'}
                  </Text>
                  {missing.length ? missing.map((resource, i) => (
                    <Text key={i} style={{ color: ink, fontFamily: serif, fontSize: 21, lineHeight: 29 }}>
                      {resource.title}
                    </Text>
                  )) : (
                    <Text style={{ color: subdued, fontSize: 15 }}>
                      {total ? 'Toutes les ressources sont réunies.' : 'Les besoins seront définis ici.'}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {compact && otherNeeds.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 9, letterSpacing: 0.8, color: subdued }}>ÉGALEMENT RECHERCHÉ</Text>
                {otherNeeds.slice(0, 2).map((resource, i) => (
                  <Text key={i} style={{ color: ink, fontSize: 12, lineHeight: 17 }}>{resource.title}</Text>
                ))}
              </View>
            )}
            <View style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingTop: compact ? 13 : 18,
              flexDirection: 'row', alignItems: 'center', gap: 13,
            }}>
              <ResourcePie completed={confirmed} total={total} size={chartSize} dark={dark} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: compact ? 13 : 16, color: ink, fontWeight: '600' }}>
                  {total ? confirmed + ' sur ' + total + ' réunies' : 'Aucune ressource'}
                </Text>
                <Text style={{ color: subdued, fontSize: compact ? 10 : 12 }}>
                  {total ? 'Ressources confirmées' : 'Pas encore définies'}
                </Text>
              </View>
            </View>
          </View>,
        )}
      </View>
    );
  }

  if (item.phase === 'Croissance') {
    const journal = item.journalEntry?.text || item.logs?.[item.logs.length - 1] || item.summary;
    const date = shortDate(item.journalEntry?.date);
    const duration = dreamDuration(item.createdAt);
    const startDate = item.createdAt && /^\d{4}-\d{2}-\d{2}/.test(item.createdAt)
      ? item.createdAt.slice(0, 10).split('-').reverse().join('.') : null;
    const beginning = monthHorizon(item.createdAt);
    const horizon = monthHorizon(item.goalDate);
    const quiet = dark ? '#C0BCB8' : '#766F69';
    return (
      <View style={[base, { backgroundColor: 'transparent' }]}>
        {withOpen(
          <View style={{ padding: inset, gap: compact ? 14 : 20 }}>
            {topRight()}
            {!compact && heading()}
            <View style={{ gap: 6, paddingVertical: compact ? 4 : 9 }}>
              {!!date && <Text style={{ color: quiet, fontSize: compact ? 10 : 12 }}>{date}</Text>}
              <Text style={{ color: ink, fontFamily: HANDWRITING_FAMILY, fontSize: compact ? (width < 185 ? 17 : 20) : 28, lineHeight: compact ? 26 : 37 }}>
                « {journal} »
              </Text>
              {!compact && !!startDate && (
                <Text style={{ color: quiet, fontSize: 12, marginTop: 12 }}>
                  Grandit depuis le {startDate}
                </Text>
              )}
            </View>
            {compact && (beginning || horizon) && (
              <View style={{ gap: 7 }}>
                <View style={{ height: 1, backgroundColor: theme.border }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 5 : 12 }}>
                  <View style={{ flexShrink: 1, gap: 3 }}>
                    <Text style={{ color: quiet, fontSize: compact ? 8 : 9, letterSpacing: 0.7 }}>DEPUIS</Text>
                    <Text style={{ color: quiet, fontSize: compact ? 11 : 14, fontFamily: serif }} numberOfLines={1}>
                      {beginning || '—'}
                    </Text>
                  </View>
                  {horizon ? (
                    <>
                      <View style={{ flex: 1, minWidth: 8, height: 1, backgroundColor: theme.border, marginHorizontal: 3 }} />
                      <View style={{ flexShrink: 1, alignItems: 'flex-end', gap: 3 }}>
                        <Text style={{ color: quiet, fontSize: compact ? 8 : 9, letterSpacing: 0.7 }}>HORIZON</Text>
                        <Text style={{ color: quiet, fontSize: compact ? 11 : 14, fontFamily: serif, textAlign: 'right' }} numberOfLines={1}>
                          {horizon}
                        </Text>
                      </View>
                    </>
                  ) : !!duration && (
                    <Text style={{ color: quiet, fontSize: compact ? 10 : 12, textAlign: 'right', flex: 1 }}>{duration}</Text>
                  )}
                </View>
              </View>
            )}
          </View>,
        )}
      </View>
    );
  }

  // A photograph-first reveal. Discovery keeps the full image and places the
  // title at the top and the pink result on a light black bottom gradient.
  // Detail keeps the title below and gently blends the lower edge into the
  // page color, without separating the title from the result description.
  const image = item.resultImage || item.image;
  const mediaHeight = compact
    ? Math.max(230, width * 1.40)
    : Math.max(295, Math.min(390, width * 0.61));
  const gradientId = 'floraison-' + item.id.replace(/[^a-zA-Z0-9]/g, '') + '-' + variant;
  return (
    <View style={[base, { backgroundColor: theme.background }]}>
      {withOpen(
        <View style={{ width, height: mediaHeight, overflow: 'hidden' }}>
          <Image source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          <Svg pointerEvents="none" width={width} height={mediaHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={gradientId + '-shade'} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#080609" stopOpacity={compact ? 0.54 : 0.10} />
                <Stop offset="33%" stopColor="#140B12" stopOpacity={0.08} />
                <Stop offset="57%" stopColor="#140B12" stopOpacity={compact ? 0.10 : 0.22} />
                <Stop offset="78%" stopColor="#10070D" stopOpacity={compact ? 0.34 : 0.72} />
                <Stop offset="100%" stopColor="#0C070B" stopOpacity={compact ? 0.72 : 0.80} />
              </LinearGradient>
              {!compact && (
                <LinearGradient id={gradientId + '-fade'} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={theme.background} stopOpacity={0} />
                  <Stop offset="82%" stopColor={theme.background} stopOpacity={0} />
                  <Stop offset="93%" stopColor={theme.background} stopOpacity={0.28} />
                  <Stop offset="100%" stopColor={theme.background} stopOpacity={1} />
                </LinearGradient>
              )}
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-shade)'} />
            {!compact && <Rect width="100%" height="100%" fill={'url(#' + gradientId + '-fade)'} />}
          </Svg>
          {/* The original user-supplied flower artwork needs no enclosing badge or circle. */}
          <View pointerEvents="none" style={{ position: 'absolute', top: inset - 4, right: inset - 4 }}>
            <DreamPhaseIcon phase="Témoignage" size={compact ? 47 : 65} />
          </View>
          {compact ? (
            <>
              <View style={{ position: 'absolute', top: inset, left: inset, right: inset + 46 }}>
                {heading('#FFFFFF')}
              </View>
              <View style={{ position: 'absolute', bottom: inset, left: inset, right: inset }}>
                <Text style={{ color: '#F5DCE6', fontSize: 12, lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.52)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                  {item.summary}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ position: 'absolute', bottom: 58, left: inset, right: inset, gap: 9 }}>
              {heading('#FFFFFF')}
              <Text style={{ color: '#F5DCE6', fontSize: 16, lineHeight: 24, textShadowColor: 'rgba(0,0,0,0.56)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                {item.summary}
              </Text>
            </View>
          )}
        </View>,
      )}
    </View>
  );
}
