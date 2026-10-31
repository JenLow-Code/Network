import React from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
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

function MediaImage({ uri, height, radius = 5 }: { uri: string; height: number; radius?: number }) {
  return (
    <View style={{ flex: 1, height, overflow: 'hidden', borderRadius: radius, backgroundColor: '#46504B' }}>
      <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/**
 * One phase language across Discovery and the Dream detail hero.
 * Interactions below the detail hero (accordion and reaction rail) live in
 * DreamReferenceLayout / DetailLayout and are intentionally not replaced.
 */
export function DreamPhaseCard({ item, width, variant, onOpen }: Props) {
  const theme = useAppTheme();
  const app = useApp();
  const compact = variant === 'tile';
  const inset = compact ? (width < 205 ? 13 : 17) : (width < 440 ? 23 : 32);
  const titleSize = compact ? (width < 190 ? 18 : 21) : (width < 440 ? 31 : 41);
  const dark = theme.dark;
  const openCard = (content: React.ReactNode) => (
    <Pressable
      disabled={!onOpen}
      onPress={onOpen}
      accessibilityRole={onOpen ? 'button' : undefined}
      accessibilityLabel={onOpen ? 'Voir le rêve : ' + item.title : undefined}
    >
      {content}
    </Pressable>
  );
  const phaseLabel = PHASE_LABELS[item.phase].toUpperCase();
  const phaseText = (color: string) => (
    <Text style={{ color, fontSize: compact ? 9 : 11, fontWeight: '700', letterSpacing: 1.55 }}>
      {phaseLabel}
    </Text>
  );
  const heading = (color: string) => (
    <Text
      style={{
        fontFamily: serif,
        fontSize: titleSize,
        lineHeight: compact ? titleSize + 6 : titleSize + 8,
        letterSpacing: -0.65,
        color,
      }}
    >
      {item.title}
    </Text>
  );
  const base = { width, overflow: 'hidden' as const, borderRadius: compact ? 5 : 8 };

  if (item.phase === 'Rêve') {
    const gallery = (item.galleryImages || []).filter(Boolean);
    const images = gallery.length ? gallery : [item.image];
    const thumbnailHeight = compact ? Math.max(64, width * 0.37) : Math.min(185, width * 0.24);
    const wideHeight = compact ? Math.max(76, width * 0.40) : Math.min(190, width * 0.26);
    const ink = dark ? '#F5F1EC' : '#292622';
    return (
      <View style={[base, { backgroundColor: dark ? '#282A2E' : '#F0EBE4' }]}>
        {openCard(
          <View style={{ padding: inset, paddingBottom: compact ? 10 : 18, gap: compact ? 11 : 18 }}>
            {phaseText(dark ? '#CCBCA9' : '#74594B')}
            {heading(ink)}
            {!compact && (
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 10, letterSpacing: 1.1, color: dark ? '#CAB9AB' : '#866D61' }}>MON BUT</Text>
                <Text style={{ fontSize: 15, lineHeight: 23, color: dark ? '#E3DCD4' : '#4B403B' }}>{item.summary}</Text>
              </View>
            )}
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <MediaImage uri={images[0]} height={thumbnailHeight} />
                {images[1] ? (
                  <MediaImage uri={images[1]} height={thumbnailHeight} />
                ) : (
                  <View style={{ flex: 1, height: thumbnailHeight, borderRadius: 5, backgroundColor: dark ? '#343B39' : '#DDD7CB', justifyContent: 'center', padding: 9 }}>
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
                <View style={{ height: compact ? 31 : 40, backgroundColor: dark ? '#363A39' : '#E3DCD2', borderRadius: 5, justifyContent: 'center', paddingHorizontal: 12 }}>
                  <Text style={{ color: dark ? '#D6CBBF' : '#75675B', fontSize: compact ? 10 : 12 }}>Une idée qui prend forme</Text>
                </View>
              )}
            </View>
          </View>,
        )}
        {compact && (
          <Pressable
            onPress={() => app.joinDream(item.id)}
            accessibilityRole="button"
            accessibilityLabel={app.myDreamIds.includes(item.id) ? 'Retirer Moi aussi' : 'Moi aussi'}
            style={{
              marginHorizontal: inset, marginBottom: inset,
              minHeight: 36, borderWidth: 1, borderColor: dark ? '#7F7874' : '#C1B4A6',
              borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Ionicons
              name={app.myDreamIds.includes(item.id) ? 'checkmark-circle' : 'add-circle-outline'}
              size={17} color={app.myDreamIds.includes(item.id) ? '#CB245C' : ink}
            />
            <Text style={{ color: ink, fontSize: 12, fontWeight: '600' }}>Moi aussi</Text>
          </Pressable>
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
    const percent = total ? Math.round(100 * confirmed / total) : null;
    const remaining = resources.filter(resource => !resource.confirmed);
    const ink = dark ? '#F2F3EC' : '#23382B';
    const muted = dark ? '#BDC9BD' : '#536859';
    const barHeight = compact ? 110 : 178;
    return (
      <View style={[base, { backgroundColor: dark ? '#29332D' : '#E9EEE7' }]}>
        {openCard(
          <View style={{ padding: inset, gap: compact ? 12 : 18 }}>
            {phaseText(dark ? '#B1CCB2' : '#4B7356')}
            {heading(ink)}
            {!compact && (
              <Text style={{ color: muted, fontSize: 15, lineHeight: 22 }}>{item.summary}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: compact ? 14 : 28, paddingTop: 4 }}>
              <View style={{ alignItems: 'center', width: compact ? 38 : 54, gap: 9 }}>
                <Text style={{ fontSize: compact ? 15 : 20, color: ink, fontWeight: '600' }}>{percent === null ? '—' : percent + '%'}</Text>
                <View style={{ width: compact ? 7 : 9, height: barHeight, backgroundColor: dark ? '#4D5D50' : '#C8D9C9', borderRadius: 9, overflow: 'hidden', justifyContent: 'flex-end' }}>
                  <View style={{ width: '100%', height: (percent ?? 0) + '%', backgroundColor: '#83B993', borderRadius: 9 }} />
                </View>
              </View>
              <View style={{ flex: 1, paddingTop: 2, gap: compact ? 9 : 16 }}>
                <Text style={{ color: muted, fontSize: compact ? 11 : 13 }}>
                  {total ? confirmed + ' ressources sur ' + total + ' confirmées' : 'Ressources à préciser'}
                </Text>
                <View style={{ height: 1, backgroundColor: dark ? '#4A5C4E' : '#C7D5C8' }} />
                {remaining.length > 0 ? (
                  <View style={{ gap: 7 }}>
                    <Text style={{ color: ink, fontSize: compact ? 10 : 12, fontWeight: '600' }}>Encore recherchées</Text>
                    {remaining.slice(0, compact ? 2 : 4).map((resource, i) => (
                      <Text key={i} style={{ color: muted, fontSize: compact ? 11 : 14, lineHeight: compact ? 17 : 21 }}>
                        {resource.title}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: muted, fontSize: compact ? 11 : 14, lineHeight: 20 }}>
                    {total ? 'Toutes les ressources sont réunies.' : 'Les besoins seront définis ici.'}
                  </Text>
                )}
              </View>
            </View>
          </View>,
        )}
      </View>
    );
  }

  if (item.phase === 'Croissance') {
    const journal = item.journalEntry?.text || item.logs?.[item.logs.length - 1] || item.summary;
    const dated = shortDate(item.journalEntry?.date);
    const duration = dreamDuration(item.createdAt);
    const horizon = monthHorizon(item.goalDate);
    const ink = dark ? '#F4F1E9' : '#273B31';
    const muted = dark ? '#ACC4B2' : '#657C69';
    return (
      <View style={[base, { backgroundColor: dark ? '#25312B' : '#E5EDE7' }]}>
        {openCard(
          <View style={{ padding: inset, gap: compact ? 13 : 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              {phaseText(muted)}
              {!!item.category && <Text style={{ color: muted, fontSize: compact ? 9 : 11, letterSpacing: 1 }}>{item.category.toUpperCase()}</Text>}
            </View>
            {heading(ink)}
            <View style={{ gap: 8, paddingVertical: compact ? 5 : 10 }}>
              {!!dated && <Text style={{ color: muted, fontSize: compact ? 10 : 12, letterSpacing: 0.7 }}>{dated}</Text>}
              <Text
                style={{
                  color: ink,
                  fontFamily: HANDWRITING_FAMILY,
                  fontSize: compact ? (width < 185 ? 17 : 20) : 28,
                  lineHeight: compact ? 26 : 37,
                }}
              >
                « {journal} »
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: dark ? '#485C50' : '#C7D6CB' }} />
            {(duration || horizon) && (
              <View style={{ flexDirection: compact && width < 225 ? 'column' : 'row', gap: compact ? 12 : 30 }}>
                {!!duration && (
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: muted, fontSize: compact ? 9 : 11, letterSpacing: 0.7 }}>DEPUIS</Text>
                    <Text style={{ color: ink, fontSize: compact ? 14 : 19, fontFamily: serif }}>{duration}</Text>
                  </View>
                )}
                {!!horizon && (
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: muted, fontSize: compact ? 9 : 11, letterSpacing: 0.7 }}>HORIZON</Text>
                    <Text style={{ color: ink, fontSize: compact ? 14 : 19, fontFamily: serif }}>{horizon}</Text>
                  </View>
                )}
              </View>
            )}
          </View>,
        )}
      </View>
    );
  }

  // Floraison gets the photographic reveal; earlier phases never reuse this hero.
  const image = item.resultImage || item.image;
  const mediaHeight = compact ? Math.max(225, width * 1.35) : Math.max(355, Math.min(485, width * 0.68));
  return (
    <View style={[base, { backgroundColor: '#31232B', height: mediaHeight }]}>
      {openCard(
        <View style={{ height: mediaHeight, width, overflow: 'hidden', justifyContent: 'space-between' }}>
          <Image source={{ uri: image }} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
          <Svg pointerEvents="none" width={width} height={mediaHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id={'floraison-' + item.id.replace(/[^a-zA-Z0-9]/g, '')} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0C080B" stopOpacity={0.25} />
                <Stop offset="45%" stopColor="#1F0B16" stopOpacity={0.15} />
                <Stop offset="100%" stopColor="#160710" stopOpacity={0.91} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#floraison-' + item.id.replace(/[^a-zA-Z0-9]/g, '') + ')'} />
          </Svg>
          <View style={{ padding: inset, alignSelf: 'flex-start', backgroundColor: '#CB245C' }}>
            {phaseText('#FFFFFF')}
          </View>
          <View style={{ padding: inset, gap: compact ? 8 : 14 }}>
            {heading('#FFFFFF')}
            <Text style={{ color: '#F5DCE6', fontSize: compact ? 11 : 16, lineHeight: compact ? 17 : 24 }}>
              {item.summary}
            </Text>
          </View>
        </View>,
      )}
    </View>
  );
}
