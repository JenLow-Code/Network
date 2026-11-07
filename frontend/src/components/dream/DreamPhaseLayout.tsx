import React from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { dreamPhaseImageUris } from '../../../assets/dreamPhaseImages';
import { TopActions } from '@/components/navigation/TopActions';

/** One editorial design language for all four dream phases. */
export const phaseAccent: Record<DreamPhase, string> = {
  Rêve: '#B88962',
  Initiation: '#A1BA44',
  Croissance: '#27845B',
  Témoignage: '#D71D77',
};

export function DreamPhaseHeader({
  dream, phase, onBack, onNavigate, action, summary, readOnly = false,
}: {
  dream: DreamEntry;
  phase: DreamPhase;
  onBack: () => void;
  onNavigate?: (phase: DreamPhase) => void;
  action?: React.ReactNode;
  summary?: string | null;
  readOnly?: boolean;
}) {
  const theme = useAppTheme();
  const index = DREAM_PHASES.indexOf(phase);
  const accent = phaseAccent[phase];
  const description = summary === undefined ? dream.summary : summary;
  return (
    <View style={{ marginBottom: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 23 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour au rêve" style={{ padding: 9, marginLeft: -9 }}>
          <Ionicons name="arrow-back-outline" size={22} color={theme.foreground} />
        </Pressable>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: theme.muted, flex: 1, textAlign: 'center' }}>MON RÊVE</Text>
        <TopActions />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 21 }}>
        <Image source={{ uri: dreamPhaseImageUris[phase] }} resizeMode="contain" style={{ width: 37, height: 37, marginRight: 2 }}/>
        <Text style={{ color: accent, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', textTransform: 'uppercase' }}>
          {PHASE_LABELS[phase]}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11, marginLeft: 3 }}>
          {String(index + 1).padStart(2, '0')} / 04
        </Text>
      </View>
      <Text style={{ color: theme.foreground, fontFamily: 'serif', fontSize: 33, lineHeight: 41, letterSpacing: -0.5, marginBottom: description ? 10 : 19 }}>
        {dream.title}
      </Text>
      {description ? <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 22, marginBottom: 21 }}>{description}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }}>
        {DREAM_PHASES.map((item, i) => {
          const reached = i <= DREAM_PHASES.indexOf(dream.phase);
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={'Ouvrir ' + PHASE_LABELS[item]}
              accessibilityState={{ disabled: !reached, selected: item === phase }}
              disabled={!reached || !onNavigate}
              onPress={() => onNavigate?.(item)}
              style={{ flex: 1, minHeight: 32, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8 }}
            >
              <View style={{
                width: '100%', height: item === phase ? 4 : 3, borderRadius: 3,
                backgroundColor: item === phase ? accent : reached
                  ? phaseAccent[item] : theme.dark ? '#35373A' : '#E9E7E1',
                opacity: item === phase ? 1 : reached ? .55 : .45,
              }} />
              <Text style={{
                position: 'absolute', top: 0, fontSize: 9,
                color: item === phase ? accent : theme.muted, fontWeight: item === phase ? '700' : '400',
              }}>{String(i + 1).padStart(2, '0')}</Text>
            </Pressable>
          );
        })}
      </View>
      {action ? <View style={{ alignItems: 'flex-end', marginTop: -8, marginBottom: 12 }}>{action}</View> : null}
    </View>
  );
}

export function DreamPhaseSection({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: 14, paddingTop: 22, borderTopWidth: 1, borderColor: theme.border, marginBottom: 6 }}>
      <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.3, color: theme.foreground, marginBottom: subtitle ? 6 : 17 }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19, marginBottom: 18 }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function DreamPhaseButton({ label, onPress, secondary = false, disabled = false }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={{
        minHeight: 48, marginTop: 12, paddingHorizontal: 17, paddingVertical: 12,
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? (theme.dark ? '#45464A' : '#D0CFCC') : secondary ? 'transparent' : (theme.dark ? '#F7F4ED' : '#242322'),
        borderWidth: secondary ? 1 : 0, borderColor: theme.border,
      }}
    >
      <Text style={{ color: disabled ? '#777' : secondary ? theme.foreground : (theme.dark ? '#242322' : '#FFFFFF'), fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function DreamPhaseField({ label, value, onChange, placeholder, multiline = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} multiline={multiline}
        style={{
          backgroundColor: theme.surface, color: theme.foreground,
          borderWidth: 1, borderColor: theme.border, borderRadius: 12,
          padding: 13, minHeight: multiline ? 116 : 46, fontSize: 14,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
