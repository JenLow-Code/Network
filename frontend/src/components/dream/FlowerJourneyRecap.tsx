import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { buildGrowthDays, countVerifiedPrayers } from '@/domain/growthTimeline';
import { isNeedFound } from '@/domain/dreamResourceRecovery';
import type { DreamEntry } from '@/domain/dreamWorkspace';

const MAGENTA = '#D71D77';
const GREEN = '#27845B';
const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const dateLabel = (value: string) => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ?
    new Date(value + 'T12:00:00') : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'})
    : value;
};
type Moment = {
  id: string; date: string; title: string;
  kind: 'logbook' | 'resource' | 'document';
};

/**
 * The flower's automatic, source-backed retrospective. The same factual
 * aggregates appear before and after publication. Private diary entries only
 * go public if their IDs have been explicitly selected.
 */
export default function FlowerJourneyRecap({
  dream, publicView = false, selectedMomentIds = [], onToggleMoment,
}: {
  dream: DreamEntry;
  publicView?: boolean;
  selectedMomentIds?: string[];
  onToggleMoment?: (id: string) => void;
}) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const prayerCount = countVerifiedPrayers(dream);
  const encouragementCount = validCount(dream.encouragementCount) ?
    dream.encouragementCount : null;
  const found = (dream.resources || []).filter(isNeedFound);
  const talents = found.filter(item => item.category === 'person');
  const material = found.filter(item => item.category !== 'person');
  const needs = dream.resources?.length ? dream.resources.map(item => item.title) :
    dream.needs || [];

  // No private notebook content is touched. All event dates and text come from
  // recorded Logbook notes, verified resource changes or document versions.
  const days = buildGrowthDays(dream);
  const moments: Moment[] = days.flatMap(day => [
    ...day.notes.map(note => ({
      id: note.id, date: day.date, title: note.title,
      kind: 'logbook' as const,
    })),
    ...day.changes.map(change => ({
      id: change.id, date: day.date,
      title: change.kind === 'need_found' ? change.title + ' nous a rejoints' :
        change.kind === 'need_lost' ? change.title + ' n’était plus disponible' :
          'Nouveau besoin : ' + change.title,
      kind: 'resource' as const,
    })),
    ...day.documents.map(document => ({
      id: document.id, date: day.date,
      title: document.title + ' ajouté aux documents',
      kind: 'document' as const,
    })),
  ]);

  // Historic published testimony stores a snapshot of the selected notes; it
  // must not reveal later private Logbook edits.
  const publicMoments: Moment[] = (dream.testimony?.highlights || []).map(item => ({
    ...item, kind: 'logbook' as const,
  }));
  const visibleMoments = publicView ? publicMoments :
    expanded ? moments : moments.slice(0, 3);

  const heading = { color: theme.foreground, fontFamily: 'serif' as const,
    fontSize: 22, lineHeight: 29 };
  const muted = { color: theme.muted, fontSize: 12, lineHeight: 20 };
  const stats = [
    prayerCount === null ? null : {
      key: 'prayers', icon: 'hand-left-outline' as const,
      value: prayerCount, label: prayerCount === 1 ? 'prière reçue' : 'prières reçues',
      color: '#B88962',
    },
    encouragementCount === null ? null : {
      key: 'encouragements', icon: 'heart-outline' as const,
      value: encouragementCount,
      label: encouragementCount === 1 ? 'encouragement reçu' : 'encouragements reçus',
      color: MAGENTA,
    },
    talents.length === 0 ? null : {
      key: 'talents', icon: 'people-outline' as const,
      value: talents.length, label: talents.length === 1 ? 'talent trouvé' : 'talents trouvés',
      color: GREEN,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <View style={{ borderTopWidth: 1, borderColor: theme.border,
      paddingTop: 23, marginTop: 25, gap: 0 }}>
      <Text style={heading}>Tout ce chemin…</Text>
      <Text style={{ ...muted, marginTop: 6, marginBottom: 14 }}>
        Ce qui a accompagné la croissance de ce rêve.
      </Text>
      {dream.goalDate ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start',
          marginBottom: 15 }}>
          <Ionicons name="calendar-outline" color={theme.muted} size={15}
            style={{ marginTop: 2 }}/>
          <Text style={{ ...muted, flex: 1 }}>
            Au départ, l’objectif était fixé au {dateLabel(dream.goalDate)}.
          </Text>
        </View>
      ) : null}
      {stats.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 24,
          rowGap: 15, marginBottom: 19 }}>
          {stats.map(stat => (
            <View key={stat.key} style={{ minWidth: 115, flexGrow: 1,
              flexBasis: '35%', flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
              <Ionicons name={stat.icon} size={20} color={stat.color}
                style={{ marginTop: 5 }}/>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.foreground, fontSize: 22,
                  lineHeight: 26, fontWeight: '700' }}>{stat.value}</Text>
                <Text style={muted}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {found.length ? (
        <View style={{ marginBottom: 18, gap: 7 }}>
          <Text style={{ ...muted, fontWeight: '700' }}>
            Les ressources qui ont fait partie de l’aventure
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {[...talents, ...material].slice(0, 8).map(item => (
              <View key={item.id} style={{ borderWidth: 1, borderColor: theme.border,
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="checkmark" size={12} color={GREEN}/>
                <Text style={{ color: theme.foreground, fontSize: 11 }}>
                  {item.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : needs.length ? (
        <Text style={{ ...muted, marginBottom: 17 }}>
          Pour avancer, ce rêve cherchait : {needs.slice(0, 5).join(', ')}.
        </Text>
      ) : null}

      {visibleMoments.length ? (
        <View style={{ marginTop: 3 }}>
          <Text style={{ ...heading, fontSize: 19, lineHeight: 26,
            marginBottom: 8 }}>Les moments qui ont compté</Text>
          {!publicView ? (
            <Text style={{ ...muted, marginBottom: 11 }}>
              Ton histoire s’est écrite au fil du Logbook.
              Seules les feuilles que tu sélectionnes seront publiées.
            </Text>
          ) : null}
          <View style={{ borderLeftWidth: 1.5, borderLeftColor: '#A9C8B5',
            paddingLeft: 13, marginLeft: 4 }}>
            {visibleMoments.map(moment => {
              const selected = selectedMomentIds.includes(moment.id);
              const selectable = !publicView && moment.kind === 'logbook';
              return (
                <Pressable key={moment.kind + ':' + moment.id}
                  disabled={!selectable}
                  onPress={() => onToggleMoment?.(moment.id)}
                  accessibilityRole={selectable ? 'button' : undefined}
                  accessibilityLabel={selectable
                    ? (selected ? 'Retirer du récit public : ' : 'Inclure dans le récit public : ') +
                      moment.title : undefined}
                  style={{ paddingVertical: 10, paddingHorizontal: 8,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderRadius: 9,
                    backgroundColor: selected && selectable
                      ? (theme.dark ? '#432C38' : '#FBEFF5') : 'transparent' }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: GREEN, fontSize: 10, fontWeight: '700' }}>
                      {dateLabel(moment.date)}
                    </Text>
                    <Text style={{ color: theme.foreground, fontSize: 13,
                      lineHeight: 19 }}>{moment.title}</Text>
                  </View>
                  {selectable ? (
                    <Ionicons name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20} color={selected ? MAGENTA : theme.muted}/>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {!publicView && moments.length > 3 ? (
            <Pressable accessibilityRole="button"
              onPress={() => setExpanded(current => !current)}
              style={{ alignSelf: 'flex-start', paddingVertical: 12 }}>
              <Text style={{ color: MAGENTA, fontSize: 12, fontWeight: '600' }}>
                {expanded ? 'Voir moins' : 'Voir tous les moments'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : !publicView ? (
        <Text style={{ ...muted, fontStyle: 'italic', marginBottom: 4 }}>
          Les moments importants de ton Logbook apparaîtront naturellement ici.
        </Text>
      ) : null}
      {!publicView && selectedMomentIds.length > 0 ? (
        <Text style={{ ...muted, marginTop: 8 }}>
          {selectedMomentIds.length} feuille{selectedMomentIds.length > 1 ? 's' : ''}
          {' '}choisie{selectedMomentIds.length > 1 ? 's' : ''} pour la publication.
        </Text>
      ) : null}
    </View>
  );
}
