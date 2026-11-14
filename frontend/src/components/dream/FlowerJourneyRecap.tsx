import React, { useState } from 'react';
import {
  Alert, Platform, Pressable, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { countVerifiedPrayers } from '@/domain/growthTimeline';
import { isNeedFound } from '@/domain/dreamResourceRecovery';
import {
  flowerPersonalMoments, flowerSourceMoments, validFlowerDay,
  type FlowerEditableMoment, type FlowerSourceMoment,
} from '@/domain/flowerMoments';
import type {
  DreamEntry, FlowerDraft, FlowerPersonalMoment, FlowerPublishedMoment,
} from '@/domain/dreamWorkspace';

const MAGENTA = '#D71D77';
const GREEN = '#27845B';
const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const localDay = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
};
const dateLabel = (value: string) => {
  const parsed = validFlowerDay(value) ? new Date(value + 'T12:00:00') : null;
  return parsed
    ? parsed.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : value;
};
type Moment = FlowerSourceMoment | FlowerEditableMoment;
type MomentKind = NonNullable<FlowerPublishedMoment['kind']>;
const momentIcon = (moment: Pick<FlowerPublishedMoment,'kind'|'title'>):
keyof typeof Ionicons.glyphMap => {
  if (moment.kind === 'personal') return 'leaf-outline';
  if (moment.kind === 'document') return 'document-text-outline';
  if (moment.kind === 'logbook') return 'book-outline';
  if (moment.title.includes('nous a rejoints')) return 'people-outline';
  if (moment.title.includes('indisponible')) return 'alert-circle-outline';
  return 'cube-outline';
};

/**
 * A pre-filled but editable personal story.
 *
 * Facts are computed from the immutable Growth timeline. They can be hidden
 * or annotated but never rewritten or deleted. Independently authored moments
 * can be edited and removed before publication. Only selected visible moments
 * are included in the published testimony snapshot.
 */
export default function FlowerJourneyRecap({
  dream, publicView = false, draft, onChangeDraft, onAppendPublishedMoment,
}: {
  dream: DreamEntry;
  publicView?: boolean;
  draft?: FlowerDraft;
  onChangeDraft?: (changes: Partial<FlowerDraft>) => void;
  /** Post-publication: append new material, do not modify historical moments. */
  onAppendPublishedMoment?: (moment: FlowerPublishedMoment) => void;
}) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formDate, setFormDate] = useState(localDay());
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const prayerCount = countVerifiedPrayers(dream);
  const encouragementCount = validCount(dream.encouragementCount) ?
    dream.encouragementCount : null;
  const found = (dream.resources || []).filter(isNeedFound);
  const talents = found.filter(item => item.category === 'person');
  const material = found.filter(item => item.category !== 'person');
  const needs = dream.resources?.length ? dream.resources.map(item => item.title) :
    dream.needs || [];

  const recorded: Moment[] = flowerSourceMoments(dream);
  const custom: Moment[] = flowerPersonalMoments(draft?.personalMoments);
  const presentation = draft?.momentPresentation || {};
  const selected = new Set(draft?.highlightIds || []);
  const allMoments = [...recorded, ...custom].sort((a, b) =>
    b.date.localeCompare(a.date));
  const publicMoments: Moment[] = (dream.testimony?.highlights || []).map(item => ({
    ...item, kind: (item.kind || 'logbook') as MomentKind,
    source: item.kind === 'personal' ? 'personal' as const : 'recorded' as const,
  }));
  const list = publicView ? publicMoments : allMoments;
  const hidden = publicView ? [] : list.filter(m => presentation[m.id]?.hidden);
  const visible = publicView ? list :
    list.filter(m => !presentation[m.id]?.hidden);
  const shown: Moment[] = publicView
    ? visible
    : [
        ...(expanded ? visible : visible.slice(0, 5)),
        ...(showHidden ? hidden : []),
      ];

  const heading = { color: theme.foreground, fontFamily: 'serif' as const,
    fontSize: 22, lineHeight: 29 };
  const muted = { color: theme.muted, fontSize: 12, lineHeight: 20 };
  const editable = !publicView && !!draft && !!onChangeDraft;
  const canAdd = editable || (publicView && !!onAppendPublishedMoment);
  const stats = [
    prayerCount === null ? null : {
      key: 'prayers', icon: 'hand-left-outline' as const,
      value: prayerCount,
      label: prayerCount === 1 ? 'prière reçue' : 'prières reçues',
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
      value: talents.length,
      label: talents.length === 1 ? 'talent trouvé' : 'talents trouvés',
      color: GREEN,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const closeEditor = () => {
    setAdding(false);
    setEditingId(null);
    setMenuId(null);
    setFormError('');
  };
  const openAdd = () => {
    setFormDate(localDay());
    setFormTitle('');
    setFormNote('');
    setFormError('');
    setEditingId(null);
    setAdding(true);
    setMenuId(null);
  };
  const openEdit = (moment: Moment) => {
    setFormDate(moment.date);
    setFormTitle(moment.title);
    setFormNote(moment.source === 'personal'
      ? moment.note || '' : presentation[moment.id]?.note || '');
    setFormError('');
    setAdding(false);
    setEditingId(moment.id);
    setMenuId(null);
  };
  const commitEdit = (moment: Moment) => {
    if (!onChangeDraft || !draft) return;
    if (moment.source === 'recorded') {
      onChangeDraft({
        momentPresentation: {
          ...presentation,
          [moment.id]: {
            ...presentation[moment.id],
            note: formNote.trim() || undefined,
          },
        },
      });
      closeEditor();
      return;
    }
    if (!formTitle.trim() || !validFlowerDay(formDate) || formDate > localDay()) {
      setFormError('Indique un titre et une date réelle (AAAA-MM-JJ).');
      return;
    }
    onChangeDraft({
      personalMoments: (draft.personalMoments || []).map(item =>
        item.id === moment.id
          ? { ...item, title: formTitle.trim(), date: formDate,
              note: formNote.trim() || undefined }
          : item),
    });
    closeEditor();
  };
  const commitAdd = () => {
    if (!formTitle.trim() || !validFlowerDay(formDate) || formDate > localDay()) {
      setFormError('Indique un titre et une date réelle (AAAA-MM-JJ).');
      return;
    }
    const item: FlowerPersonalMoment = {
      id: 'personal-' + Date.now().toString(36) + '-' +
        Math.random().toString(36).slice(2, 8),
      date: formDate,
      title: formTitle.trim(),
      note: formNote.trim() || undefined,
    };
    if (publicView && onAppendPublishedMoment) {
      onAppendPublishedMoment({ ...item, kind: 'personal' });
    } else if (draft && onChangeDraft) {
      onChangeDraft({ personalMoments: [...(draft.personalMoments || []), item] });
      setExpanded(true);
    }
    closeEditor();
  };
  const toggleVisible = (moment: Moment) => {
    if (!draft || !onChangeDraft) return;
    const nowHidden = !presentation[moment.id]?.hidden;
    onChangeDraft({
      momentPresentation: {
        ...presentation,
        [moment.id]: { ...presentation[moment.id], hidden: nowHidden },
      },
      // A hidden event cannot accidentally remain opted in for publication.
      highlightIds: nowHidden ?
        (draft.highlightIds || []).filter(id => id !== moment.id) :
        draft.highlightIds || [],
    });
    setMenuId(null);
  };
  const togglePublic = (moment: Moment) => {
    if (!draft || !onChangeDraft) return;
    const ids = draft.highlightIds || [];
    onChangeDraft({
      highlightIds: selected.has(moment.id)
        ? ids.filter(id => id !== moment.id) : [...ids, moment.id],
    });
    setMenuId(null);
  };
  const deletePersonal = (moment: Moment) => {
    if (!draft || !onChangeDraft || moment.source !== 'personal') return;
    const run = () => {
      onChangeDraft({
        personalMoments: (draft.personalMoments || []).filter(item =>
          item.id !== moment.id),
        highlightIds: (draft.highlightIds || []).filter(id => id !== moment.id),
      });
      closeEditor();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' &&
        window.confirm('Supprimer ce souvenir personnel ?')) run();
    } else Alert.alert('Supprimer ce souvenir ?', 'Cette entrée personnelle sera retirée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: run },
    ]);
  };

  const editor = (moment?: Moment) => (
    <View style={{ borderWidth: 1, borderColor: theme.border,
      borderRadius: 12, padding: 13, marginTop: 8, gap: 9,
      backgroundColor: theme.surface }}>
      <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '700' }}>
        {adding ? (publicView ? 'Ajouter un souvenir à cette fleur' :
          'Ajouter un moment personnel') :
          moment?.source === 'recorded'
          ? 'Raconter ce moment' : 'Modifier mon souvenir'}
      </Text>
      {moment?.source === 'recorded' ? (
        <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17 }}>
          Le fait enregistré reste inchangé. Tu peux enrichir son récit.
        </Text>
      ) : (
        <>
          <TextInput accessibilityLabel="Date du souvenir"
            value={formDate} onChangeText={setFormDate}
            maxLength={10} placeholder="AAAA-MM-JJ"
            placeholderTextColor={theme.muted}
            style={{ borderBottomWidth: 1, borderColor: theme.border,
              fontSize: 12, color: theme.foreground, paddingVertical: 8 }}/>
          <TextInput accessibilityLabel="Titre du souvenir"
            value={formTitle} onChangeText={setFormTitle}
            placeholder="Ce qui s'est passé…" placeholderTextColor={theme.muted}
            style={{ borderBottomWidth: 1, borderColor: theme.border,
              fontSize: 13, color: theme.foreground, paddingVertical: 8 }}/>
        </>
      )}
      <TextInput multiline accessibilityLabel="Mon commentaire personnel"
        value={formNote} onChangeText={setFormNote}
        placeholder="Quelques mots personnels (facultatif)…"
        placeholderTextColor={theme.muted}
        style={{ fontSize: 13, lineHeight: 20, color: theme.foreground,
          paddingVertical: 8, minHeight: 45, textAlignVertical: 'top' }}/>
      {formError ? <Text style={{ color: '#B24753', fontSize: 11 }}>
        {formError}
      </Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }}>
        <Pressable accessibilityRole="button" onPress={closeEditor}
          style={{ paddingVertical: 8 }}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Annuler</Text>
        </Pressable>
        <Pressable accessibilityRole="button"
          onPress={() => moment ? commitEdit(moment) : commitAdd()}
          style={{ paddingVertical: 8 }}>
          <Text style={{ color: MAGENTA, fontSize: 12,
            fontWeight: '700' }}>Enregistrer</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ borderTopWidth: 1, borderColor: theme.border,
      paddingTop: 23, marginTop: 25 }}>
      <Text style={heading}>Tout ce chemin…</Text>
      <Text style={{ ...muted, marginTop: 6, marginBottom: 14 }}>
        Ce qui a accompagné la croissance de ce rêve.
      </Text>
      {dream.goalDate ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start',
          marginBottom: 15 }}>
          <Ionicons name="calendar-outline" color={theme.muted}
            size={15} style={{ marginTop: 2 }}/>
          <Text style={{ ...muted, flex: 1 }}>
            Au départ, l’objectif était fixé au {dateLabel(dream.goalDate)}.
          </Text>
        </View>
      ) : null}
      {stats.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap',
          columnGap: 24, rowGap: 15, marginBottom: 19 }}>
          {stats.map(stat => (
            <View key={stat.key} style={{ minWidth: 115, flexGrow: 1,
              flexBasis: '35%', flexDirection: 'row',
              gap: 9, alignItems: 'flex-start' }}>
              <Ionicons name={stat.icon} size={20} color={stat.color}
                style={{ marginTop: 5 }}/>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.foreground,
                  fontSize: 22, lineHeight: 26,
                  fontWeight: '700' }}>{stat.value}</Text>
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
              <View key={item.id} style={{ borderWidth: 1,
                borderColor: theme.border, borderRadius: 20,
                paddingHorizontal: 10, paddingVertical: 6,
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

      <View style={{ marginTop: 3 }}>
        <Text style={{ ...heading, fontSize: 19,
          lineHeight: 26, marginBottom: 7 }}>
          Les moments qui ont compté
        </Text>
        {!publicView ? (
          <Text style={{ ...muted, marginBottom: 13 }}>
            Les faits du Logbook restent intacts. Ajoute tes propres mots,
            masque les moments de ton choix, puis sélectionne ceux à publier.
          </Text>
        ) : null}
        {shown.length ? (
          <View style={{ borderLeftWidth: 1.5,
            borderLeftColor: '#A9C8B5', paddingLeft: 12, marginLeft: 5 }}>
            {shown.map((moment, i) => {
              const isHidden = !publicView && !!presentation[moment.id]?.hidden;
              const isSelected = !publicView && selected.has(moment.id);
              const note = publicView ? moment.note :
                moment.source === 'personal' ? moment.note :
                presentation[moment.id]?.note;
              const previous = shown[i - 1];
              return (
                <View key={moment.id} style={{ paddingVertical: 10,
                  paddingHorizontal: 6, opacity: isHidden ? .53 : 1 }}>
                  <View style={{ flexDirection: 'row',
                    alignItems: 'flex-start', gap: 9 }}>
                    <Ionicons name={momentIcon(moment)} size={15}
                      color={moment.kind === 'resource' &&
                        moment.title.includes('indisponible') ? MAGENTA : GREEN}
                      style={{ marginTop: 3 }}/>
                    <View style={{ flex: 1, gap: 4 }}>
                      {(!previous || previous.date !== moment.date) ? (
                        <Text style={{ color: GREEN, fontSize: 10,
                          fontWeight: '700' }}>
                          {dateLabel(moment.date)}
                        </Text>
                      ) : null}
                      <Text style={{ color: theme.foreground,
                        fontSize: 13, lineHeight: 20 }}>
                        {moment.title}
                      </Text>
                      {note ? (
                        <Text style={{ color: theme.muted, fontSize: 12,
                          lineHeight: 19, fontStyle: 'italic' }}>
                          {note}
                        </Text>
                      ) : null}
                      {isHidden ? (
                        <Text style={{ color: theme.muted, fontSize: 10 }}>
                          Masqué de la présentation
                        </Text>
                      ) : null}
                      {isSelected ? (
                        <Text style={{ color: MAGENTA, fontSize: 10 }}>
                          Sélectionné pour la publication
                        </Text>
                      ) : null}
                    </View>
                    {editable ? (
                      <Pressable accessibilityRole="button"
                        accessibilityLabel={'Options du moment : ' + moment.title}
                        accessibilityState={{ expanded: menuId === moment.id }}
                        onPress={() => {
                          setMenuId(current => current === moment.id ? null : moment.id);
                          setEditingId(null);
                        }}
                        style={{ padding: 7, marginTop: -5 }}>
                        <Ionicons name="ellipsis-horizontal" size={17}
                          color={theme.muted}/>
                      </Pressable>
                    ) : null}
                  </View>
                  {menuId === moment.id && editable ? (
                    <View style={{ marginLeft: 24, marginTop: 9,
                      padding: 9, backgroundColor: theme.surface,
                      borderRadius: 10, borderWidth: 1,
                      borderColor: theme.border, gap: 1 }}>
                      {moment.source === 'recorded' ? (
                        <Text style={{ ...muted, fontSize: 10,
                          paddingHorizontal: 7, paddingVertical: 5 }}>
                          <Ionicons name="lock-closed-outline"
                            size={11} color={theme.muted}/> Fait enregistré,
                          non modifiable
                        </Text>
                      ) : null}
                      {([
                        {
                          key: 'edit', icon: 'create-outline' as const,
                          label: moment.source === 'recorded' ?
                            'Ajouter / modifier mes mots' : 'Modifier ce moment',
                          run: () => openEdit(moment),
                        },
                        {
                          key: 'visibility', icon:
                            (isHidden ? 'eye-outline' : 'eye-off-outline') as
                              keyof typeof Ionicons.glyphMap,
                          label: isHidden ? 'Réafficher' : 'Masquer de la présentation',
                          run: () => toggleVisible(moment),
                        },
                        ...(!isHidden ? [{
                          key: 'publish', icon: (isSelected ? 'checkmark-circle' :
                            'ellipse-outline') as keyof typeof Ionicons.glyphMap,
                          label: isSelected ? 'Ne pas publier ce moment' :
                            'Inclure dans la publication',
                          run: () => togglePublic(moment),
                        }] : []),
                        ...(moment.source === 'personal' ? [{
                          key: 'delete', icon: 'trash-outline' as const,
                          label: 'Supprimer ce souvenir personnel',
                          run: () => deletePersonal(moment),
                        }] : []),
                      ]).map(action => (
                        <Pressable key={action.key} accessibilityRole="button"
                          onPress={action.run}
                          style={{ flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 7, paddingVertical: 9, gap: 10 }}>
                          <Ionicons name={action.icon} size={15}
                            color={action.key === 'delete' ? '#B24753' : theme.muted}/>
                          <Text style={{ color: action.key === 'delete' ?
                            '#B24753' : theme.foreground, fontSize: 12 }}>
                            {action.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {editable && editingId === moment.id ? editor(moment) : null}
                </View>
              );
            })}
          </View>
        ) : !publicView ? (
          <Text style={{ ...muted, fontStyle: 'italic', marginBottom: 7 }}>
            Les moments du Logbook apparaîtront ici. Tu peux déjà ajouter un
            souvenir personnel.
          </Text>
        ) : null}
        {editable && visible.length > 5 ? (
          <Pressable accessibilityRole="button"
            onPress={() => setExpanded(current => !current)}
            style={{ alignSelf: 'flex-start', paddingVertical: 10 }}>
            <Text style={{ color: MAGENTA, fontSize: 12, fontWeight: '600' }}>
              {expanded ? 'Voir moins' : 'Voir tous les moments'}
            </Text>
          </Pressable>
        ) : null}
        {editable && hidden.length > 0 ? (
          <Pressable accessibilityRole="button"
            onPress={() => setShowHidden(current => !current)}
            style={{ alignSelf: 'flex-start', paddingVertical: 10 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              <Ionicons name={showHidden ? 'eye-off-outline' : 'eye-outline'}
                size={13} color={theme.muted}/>
              {' '}{showHidden ? 'Masquer les moments écartés' :
                'Voir les moments masqués (' + hidden.length + ')'}
            </Text>
          </Pressable>
        ) : null}
        {canAdd && !adding ? (
          <Pressable accessibilityRole="button" onPress={openAdd}
            style={{ flexDirection: 'row', alignSelf: 'flex-start',
              alignItems: 'center', gap: 8, paddingVertical: 12,
              marginTop: 4 }}>
            <Ionicons name="add-circle-outline" size={19} color={MAGENTA}/>
            <Text style={{ color: MAGENTA, fontSize: 12,
              fontWeight: '700' }}>
              {publicView ? 'Ajouter un souvenir à cette fleur' :
                'Ajouter un moment personnel'}
            </Text>
          </Pressable>
        ) : null}
        {adding && canAdd ? editor() : null}
        {editable && selected.size > 0 ? (
          <Text style={{ ...muted, marginTop: 7 }}>
            {selected.size} moment{selected.size > 1 ? 's' : ''}
            {' '}choisi{selected.size > 1 ? 's' : ''} pour la publication.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
