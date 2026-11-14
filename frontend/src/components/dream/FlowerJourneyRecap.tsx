import React, { useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView, Text, TextInput, View,
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
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : value;
};
type Moment = FlowerSourceMoment | FlowerEditableMoment;
type MomentKind = NonNullable<FlowerPublishedMoment['kind']>;
// Quiet, personal symbols instead of generic technical icons.
const STORY_EMOJIS = [
  '🌸','🤝','🥁','🎹','🎤','🎸','🎶','❤️','🙏','✨',
  '🌱','🌿','🌧️','🕊️','🎯','📸','💪','🎉','🫶','📖',
  '🌻','🎧','🪴','⭐','💐','🍃','🕯️','🎼',
];
const defaultMomentEmoji = (moment: Pick<FlowerPublishedMoment,'kind'|'title'>): string => {
  const label = moment.title.toLocaleLowerCase('fr-FR');
  if (moment.kind === 'personal') return '🌸';
  if (moment.kind === 'document') return '📖';
  if (moment.kind === 'logbook') return '🍃';
  if (/indisponible|perdu|perdue|difficulté/.test(label)) return '🌧️';
  if (/nous a rejoint|une personne|en tant que|un talent/.test(label)) return '🤝';
  if (/batterie|batteur|batterist/.test(label)) return '🥁';
  if (/piano|pianiste|clavier/.test(label)) return '🎹';
  if (/chant|chanteur|chanteuse|voix/.test(label)) return '🎤';
  if (/guitare|guitariste/.test(label)) return '🎸';
  if (/prière|prier/.test(label)) return '🙏';
  return '✨';
};

/** Visible writing invitation: never published unless the creator writes it. */
const momentWritingPrompt = (moment: Pick<FlowerPublishedMoment, 'kind'|'title'>): string => {
  const label = moment.title.toLocaleLowerCase('fr-FR');
  if (/en tant que batt(eur|euse)/.test(label)) return 'Ce batteur a…';
  if (/en tant que pianiste/.test(label)) return 'Ce pianiste a…';
  if (/nous a rejoint en tant que/.test(label)) return 'Cette rencontre a…';
  if (/n’était plus disponible|nous a manqué/.test(label))
    return 'Ce passage difficile nous a…';
  if (/trouvé|trouvée|solution/.test(label)) return 'Cette étape nous a permis de…';
  return 'Ce moment a compté parce que…';
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
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineNoteId, setInlineNoteId] = useState<string | null>(null);
  const [inlineNote, setInlineNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [formDate, setFormDate] = useState(localDay());
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formEmojiPicker, setFormEmojiPicker] = useState(false);
  const [formError, setFormError] = useState('');

  const prayerCount = countVerifiedPrayers(dream);
  const encouragementCount = validCount(dream.encouragementCount) ?
    dream.encouragementCount : null;
  const found = (dream.resources || []).filter(isNeedFound);
  const talents = found.filter(item => item.category === 'person');
  const material = found.filter(item => item.category !== 'person');
  const needs = dream.resources?.length ? dream.resources.map(item => item.title) :
    dream.needs || [];

  const recorded: Moment[] = flowerSourceMoments(dream, draft?.verifiedTalentNames);
  const custom: Moment[] = flowerPersonalMoments(draft?.personalMoments);
  const presentation = draft?.momentPresentation || {};
  const selected = new Set(draft?.highlightIds || []);
  const allMoments = [...recorded, ...custom].sort((a, b) =>
    b.date.localeCompare(a.date));
  const publicMoments: Moment[] = (dream.testimony?.highlights || []).map(
    (item): Moment => item.kind === 'personal'
      ? { ...item, kind: 'personal', source: 'personal' }
      : {
          ...item, kind: (item.kind || 'logbook') as
            Exclude<MomentKind, 'personal'>,
          source: 'recorded',
        },
  );
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
    setEmojiPickerId(null);
    setInlineNoteId(null);
    setAdding(false);
    setEditingId(null);
    setMenuId(null);
    setFormError('');
    setFormEmojiPicker(false);
  };
  const openAdd = () => {
    setFormDate(localDay());
    setFormTitle('');
    setFormNote('');
    setFormEmoji('');
    setFormEmojiPicker(false);
    setFormError('');
    setEditingId(null);
    setInlineNoteId(null);
    setAdding(true);
    setMenuId(null);
    setEmojiPickerId(null);
  };
  const openEdit = (moment: Moment) => {
    setFormDate(moment.date);
    setFormTitle(moment.title);
    setFormNote(moment.source === 'personal'
      ? moment.note || '' : presentation[moment.id]?.note || '');
    setFormEmoji(presentation[moment.id]?.emoji ?? moment.emoji ?? '');
    setFormEmojiPicker(false);
    setFormError('');
    setAdding(false);
    setInlineNoteId(null);
    setEditingId(moment.id);
    setMenuId(null);
    setEmojiPickerId(null);
  };
  // The narrative is written in place, never in a separate form. Every keystroke
  // goes into the unpublished draft; no explicit Save button is required.
  const beginInlineNote = (moment: Moment) => {
    if (!editable) return;
    setInlineNoteId(moment.id);
    setInlineNote(moment.source === 'personal'
      ? moment.note || '' : presentation[moment.id]?.note || '');
    setMenuId(null);
    setEmojiPickerId(null);
    setEditingId(null);
  };
  const changeInlineNote = (moment: Moment, value: string) => {
    setInlineNote(value);
    if (!draft || !onChangeDraft) return;
    if (moment.source === 'personal') {
      onChangeDraft({
        personalMoments: (draft.personalMoments || []).map(item =>
          item.id === moment.id ? { ...item, note: value || undefined } : item),
      });
    } else {
      onChangeDraft({
        momentPresentation: {
          ...presentation,
          [moment.id]: {
            ...presentation[moment.id], note: value || undefined,
          },
        },
      });
    }
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
              note: formNote.trim() || undefined,
              emoji: formEmoji.trim().slice(0, 18) || undefined }
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
      emoji: formEmoji.trim().slice(0, 18) || undefined,
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
  const chooseEmoji = (moment: Moment, value?: string) => {
    if (!draft || !onChangeDraft) return;
    const emoji = value?.trim().slice(0, 18) || '';
    onChangeDraft({
      momentPresentation: {
        ...presentation,
        [moment.id]: {
          ...presentation[moment.id],
          emoji,
        },
      },
    });
    setEmojiPickerId(null);
    setCustomEmoji('');
    setMenuId(null);
  };
  const openEmojiPicker = (moment: Moment) => {
    setEmojiPickerId(moment.id);
    setCustomEmoji('');
    setMenuId(null);
    setEditingId(null);
    setInlineNoteId(null);
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
    <View style={{
      marginTop: 12, marginLeft: moment ? 49 : 0,
      maxWidth: 520,
      borderRadius: 16,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      backgroundColor: theme.dark ? '#2C2830' : '#F8F0EA',
      gap: 11,
    }}>
      <Text style={{ color: theme.foreground, fontFamily: 'serif',
        fontSize: 17, lineHeight: 23 }}>
        {adding ? 'Un nouveau souvenir' :
          moment?.source === 'recorded' ? 'Ce que ce moment représentait…' :
          'Faire vivre ce souvenir'}
      </Text>
      {moment?.source !== 'recorded' ? (
        <View style={{ gap: 8 }}>
          <Pressable accessibilityRole="button"
            onPress={() => setFormEmojiPicker(current => !current)}
            style={{ flexDirection: 'row', alignItems: 'center',
              gap: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
            {formEmoji ? <Text style={{ fontSize: 18 }}>{formEmoji}</Text> :
              <Ionicons name="happy-outline" size={17} color={theme.muted}/>}
            <Text style={{ color: MAGENTA, fontSize: 12 }}>
              {formEmoji ? 'Changer / retirer l’emoji' : 'Ajouter un emoji (facultatif)'}
            </Text>
            <Ionicons name={formEmojiPicker ? 'chevron-up' : 'chevron-down'}
              size={12} color={MAGENTA}/>
          </Pressable>
          {formEmojiPicker ? (
            <View style={{ gap: 9 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 5 }}>
                {STORY_EMOJIS.map((option, index) => (
                  <Pressable key={index} accessibilityRole="button"
                    accessibilityLabel={'Utiliser ' + option}
                    onPress={() => {
                      setFormEmoji(option);
                      setFormEmojiPicker(false);
                    }}
                    style={{ width: 36, height: 36, borderRadius: 12,
                      backgroundColor: theme.dark ? '#433941' : '#FFF9F4',
                      alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 21 }}>{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={() => {
                setFormEmoji(''); setFormEmojiPicker(false);
              }}><Text style={{ color: theme.muted, fontSize: 12 }}>Sans emoji</Text></Pressable>
              <TextInput accessibilityLabel="Autre emoji du souvenir"
                placeholder="Ou colle ton propre emoji"
                placeholderTextColor={theme.muted} value={formEmoji}
                onChangeText={setFormEmoji} maxLength={18}
                style={{ color: theme.foreground, fontSize: 12,
                  paddingVertical: 7, borderBottomWidth: 1,
                  borderBottomColor: theme.border }}/>
            </View>
          ) : null}
          <TextInput accessibilityLabel="Date du souvenir" value={formDate}
            onChangeText={setFormDate} maxLength={10}
            placeholder="AAAA-MM-JJ" placeholderTextColor={theme.muted}
            style={{
              borderBottomWidth: 1, borderBottomColor: theme.border,
              fontSize: 12, color: theme.foreground,
              paddingVertical: 8,
            }}/>
          <TextInput accessibilityLabel="Titre du souvenir" value={formTitle}
            onChangeText={setFormTitle} maxLength={160}
            placeholder="Un moment que tu veux garder…" placeholderTextColor={theme.muted}
            style={{
              borderBottomWidth: 1, borderBottomColor: theme.border,
              fontSize: 14, color: theme.foreground, paddingVertical: 8,
            }}/>
        </View>
      ) : null}
      <TextInput multiline accessibilityLabel="Mon commentaire personnel"
        value={formNote} onChangeText={setFormNote}
        placeholder={moment ? momentWritingPrompt(moment) :
          'Ce que j’ai ressenti, ce que j’aimerais raconter…'}
        placeholderTextColor={theme.muted}
        style={{ color: theme.foreground, fontSize: 13, lineHeight: 22,
          minHeight: 50, textAlignVertical: 'top', paddingVertical: 6 }}/>
      {formError ? <Text style={{ color: '#B24753', fontSize: 11 }}>
        {formError}
      </Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center',
        justifyContent: 'flex-end', gap: 16 }}>
        <Pressable accessibilityRole="button" onPress={closeEditor}
          style={{ paddingVertical: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Annuler</Text>
        </Pressable>
        <Pressable accessibilityRole="button"
          onPress={() => moment ? commitEdit(moment) : commitAdd()}
          style={{ backgroundColor: MAGENTA, paddingHorizontal: 15,
            paddingVertical: 10, borderRadius: 20 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
            Enregistrer
          </Text>
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
      {!publicView && found.length ? (
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
      ) : !publicView && needs.length ? (
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
          <Text style={{ ...muted, marginBottom: 12 }}>
            Les rencontres, les épreuves et les petits miracles qui ont donné
            vie à ce rêve.
          </Text>
        ) : null}
        {shown.length ? (
          <View style={{ marginTop: 3 }}>
            {shown.map((moment, i) => {
              const isHidden = !publicView && !!presentation[moment.id]?.hidden;
              const isSelected = !publicView && selected.has(moment.id);
              const note = publicView ? moment.note :
                moment.source === 'personal' ? moment.note :
                presentation[moment.id]?.note;
              // No automatically forced emoji: a small neutral botanical
              // mark keeps the journey readable until the creator chooses one.
              const emoji = publicView ? moment.emoji :
                (presentation[moment.id]?.emoji ?? moment.emoji);
              const isNewDate = i === 0 || shown[i-1].date !== moment.date;
              const actions: {
                key: string; icon: keyof typeof Ionicons.glyphMap;
                label: string; run: () => void; danger?: boolean;
              }[] = [
                { key: 'emoji', icon: 'happy-outline',
                  label: emoji ? 'Modifier / retirer l’emoji' : 'Ajouter un emoji',
                  run: () => openEmojiPicker(moment) },
                { key: 'edit', icon: 'pencil-outline',
                  label: moment.source === 'personal' ?
                    'Modifier mon souvenir' : 'Raconter ce moment',
                  run: () => moment.source === 'personal' ?
                    openEdit(moment) : beginInlineNote(moment) },
                ...(moment.source === 'recorded' &&
                  presentation[moment.id]?.note ? [{
                  key: 'clear-note', icon: 'close-circle-outline' as const,
                  label: 'Retirer mes mots',
                  run: () => {
                    onChangeDraft?.({
                      momentPresentation: {
                        ...presentation,
                        [moment.id]: {
                          ...presentation[moment.id], note: undefined,
                        },
                      },
                    });
                    setMenuId(null);
                  },
                }] : []),
                { key: 'visibility',
                  icon: isHidden ? 'eye-outline' : 'eye-off-outline',
                  label: isHidden ? 'Faire réapparaître' : 'Masquer ce moment',
                  run: () => toggleVisible(moment) },
                ...(!isHidden ? [{
                  key: 'publish',
                  icon: (isSelected ? 'checkmark-circle' : 'ellipse-outline') as
                    keyof typeof Ionicons.glyphMap,
                  label: isSelected ? 'Garder pour moi' : 'Inclure dans ma fleur',
                  run: () => togglePublic(moment),
                }] : []),
                ...(moment.source === 'personal' ? [{
                  key: 'delete', icon: 'trash-outline' as const,
                  label: 'Supprimer mon souvenir',
                  run: () => deletePersonal(moment), danger: true,
                }] : []),
              ];
              return (
                <View key={moment.id} style={{
                  position: 'relative',
                  zIndex: menuId === moment.id ? 80 :
                    emojiPickerId === moment.id ? 40 : 0,
                  opacity: isHidden ? .55 : 1,
                }}>
                  {/* One visible date per day; moments remain together. */}
                  {isNewDate ? (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      marginTop: i === 0 ? 7 : 15, marginBottom: 5,
                      paddingLeft: 9,
                    }}>
                      <View style={{ width: 6, height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.dark ? '#8CAC99' : '#6B9C80' }}/>
                      <Text style={{
                        color: theme.dark ? '#B3D1BE' : '#477C5B',
                        fontSize: 10, fontWeight: '700',
                        letterSpacing: .55, textTransform: 'uppercase',
                      }}>{dateLabel(moment.date)}</Text>
                    </View>
                  ) : null}
                  <View style={{
                    flexDirection: 'row', alignItems: 'stretch',
                  }}>
                    <View style={{
                      width: 23, alignItems: 'center',
                    }}>
                      <View style={{
                        width: 1, flex: 1,
                        backgroundColor: theme.dark ? '#5B4953' : '#E7D3C7',
                      }}/>
                    </View>
                    <View style={{
                      flex: 1, paddingBottom: 9, paddingTop: 2,
                      position: 'relative',
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start', gap: emoji ? 9 : 0,
                      }}>
                        {emoji ? (
                          <Pressable disabled={!editable}
                            accessibilityRole={editable ? 'button' : undefined}
                            accessibilityLabel={editable ?
                              'Changer l’emoji de ' + moment.title : undefined}
                            onPress={() => openEmojiPicker(moment)}
                            style={{ width: 20, minHeight: 24,
                              alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 15, lineHeight: 22 }}>{emoji}</Text>
                          </Pressable>
                        ) : null}
                        <View style={{ flex: 1, paddingTop: 1, gap: 3 }}>
                          <Text style={{
                            color: theme.foreground,
                            fontFamily: 'serif', fontSize: 15, lineHeight: 21,
                          }}>{moment.title}</Text>
                          {editable && !isHidden && inlineNoteId === moment.id ? (
                            <TextInput autoFocus multiline
                              accessibilityLabel={'Mes mots sur ' + moment.title}
                              value={inlineNote}
                              onChangeText={value => changeInlineNote(moment, value)}
                              onBlur={() => setInlineNoteId(null)}
                              placeholder={momentWritingPrompt(moment)}
                              placeholderTextColor={theme.dark ? '#B49DA6' : '#A18C94'}
                              style={{
                                padding: 0, margin: 0, minHeight: 22,
                                fontSize: 12, lineHeight: 19, fontStyle: 'italic',
                                color: theme.dark ? '#D5C8C3' : '#756A66',
                                maxWidth: 500,
                              }}/>
                          ) : note ? (
                            <Pressable disabled={!editable || isHidden}
                              accessibilityRole={editable && !isHidden ? 'button' : undefined}
                              accessibilityLabel={editable && !isHidden ?
                                'Modifier mes mots sur ' + moment.title : undefined}
                              onPress={() => beginInlineNote(moment)}
                              style={{ alignSelf: 'flex-start', paddingVertical: 1 }}>
                              <Text style={{
                                color: theme.dark ? '#CFC0BB' : '#756A66',
                                fontSize: 12, lineHeight: 19, fontStyle: 'italic',
                              }}>{note}</Text>
                            </Pressable>
                          ) : editable && !isHidden ? (
                            <Pressable accessibilityRole="button"
                              accessibilityLabel={'Raconter ce moment : ' + moment.title}
                              onPress={() => beginInlineNote(moment)}
                              style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
                              <Text style={{
                                color: theme.dark ? '#B29BAA' : '#A08894',
                                fontSize: 12, lineHeight: 19, fontStyle: 'italic',
                              }}>{momentWritingPrompt(moment)}</Text>
                            </Pressable>
                          ) : null}
                          {isHidden ? (
                            <Text style={{ color: theme.muted, fontSize: 10 }}>
                              Moment masqué
                            </Text>
                          ) : null}
                          {isSelected ? (
                            <View style={{
                              flexDirection: 'row', alignItems: 'center',
                              gap: 5, marginTop: 2,
                            }}>
                              <Ionicons name="checkmark-circle" size={12}
                                color={MAGENTA}/>
                              <Text style={{ color: MAGENTA, fontSize: 10 }}>
                                Dans ma fleur
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {editable ? (
                          <Pressable accessibilityRole="button"
                            accessibilityLabel={'Personnaliser ' + moment.title}
                            accessibilityState={{ expanded: menuId === moment.id }}
                            onPress={() => {
                              setMenuId(current =>
                                current === moment.id ? null : moment.id);
                              setEditingId(null);
                              setEmojiPickerId(null);
                            }}
                            style={{
                              width: 28, height: 28, borderRadius: 14,
                              justifyContent: 'center', alignItems: 'center',
                              backgroundColor: menuId === moment.id ?
                                (theme.dark ? '#393039' : '#F4E9E6') :
                                'transparent',
                            }}>
                            <Ionicons name="ellipsis-horizontal" size={16}
                              color={theme.muted}/>
                          </Pressable>
                        ) : null}
                      </View>
                      {editable && menuId === moment.id ? (
                        <View style={{
                          position: 'absolute', top: 41, right: 4, zIndex: 90,
                          width: 228, paddingHorizontal: 7, paddingVertical: 7,
                          borderRadius: 16,
                          backgroundColor: theme.surface,
                          borderWidth: 1,
                          borderColor: theme.dark ? '#45404A' : '#EFE7E4',
                          shadowColor: '#35252D',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: .15, shadowRadius: 20,
                          elevation: 9,
                        }}>
                          {actions.map(action => (
                            <Pressable key={action.key}
                              accessibilityRole="button" onPress={action.run}
                              style={{
                                minHeight: 36, paddingHorizontal: 10,
                                paddingVertical: 8, borderRadius: 10,
                                flexDirection: 'row', alignItems: 'center',
                                gap: 10,
                              }}>
                              <Ionicons name={action.icon} size={16}
                                color={action.danger ? '#BA5A65' : theme.muted}/>
                              <Text style={{ fontSize: 12, flex: 1,
                                color: action.danger ? '#BA5A65' :
                                  theme.foreground }}>
                                {action.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                      {editable && emojiPickerId === moment.id ? (
                        <View style={{
                          marginTop: 12, marginLeft: 1, maxWidth: 430,
                          paddingVertical: 12, paddingHorizontal: 12,
                          borderRadius: 16,
                          backgroundColor: theme.dark ? '#302A32' : '#F8F0EA',
                          gap: 10,
                        }}>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <Text style={{ color: theme.foreground,
                              fontSize: 12, fontWeight: '600' }}>
                              Un symbole pour ce souvenir
                            </Text>
                            <Pressable accessibilityRole="button"
                              accessibilityLabel="Fermer les emojis"
                              onPress={() => setEmojiPickerId(null)}
                              style={{ padding: 4 }}>
                              <Ionicons name="close" size={16}
                                color={theme.muted}/>
                            </Pressable>
                          </View>
                          <ScrollView horizontal
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ gap: 5, paddingRight: 10 }}>
                            {STORY_EMOJIS.map((option, index) => (
                              <Pressable key={index} accessibilityRole="button"
                                accessibilityLabel={'Utiliser '+ option}
                                onPress={() => chooseEmoji(moment, option)}
                                style={{
                                  width: 39, height: 40, borderRadius: 12,
                                  backgroundColor: option === emoji ?
                                    (theme.dark ? '#4F3D49' : '#EDDDE2') :
                                    (theme.dark ? '#3C353D' : '#FFF9F4'),
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                <Text style={{ fontSize: 21 }}>{option}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                          }}>
                            <TextInput value={customEmoji}
                              onChangeText={setCustomEmoji}
                              maxLength={18}
                              accessibilityLabel="Saisir un autre emoji"
                              placeholder="Ton emoji ✨"
                              placeholderTextColor={theme.muted}
                              style={{
                                flex: 1, minWidth: 75, minHeight: 35,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.border,
                                color: theme.foreground, fontSize: 13,
                                paddingVertical: 5,
                              }}/>
                            <Pressable accessibilityRole="button"
                              disabled={!customEmoji.trim()}
                              onPress={() => chooseEmoji(moment, customEmoji)}
                              style={{ paddingHorizontal: 9, paddingVertical: 8 }}>
                              <Text style={{
                                color: customEmoji.trim() ? MAGENTA : theme.muted,
                                fontWeight: '700', fontSize: 12,
                              }}>Utiliser</Text>
                            </Pressable>
                            <Pressable accessibilityRole="button"
                              onPress={() => chooseEmoji(moment, undefined)}
                              style={{ paddingVertical: 8 }}>
                              <Text style={{ color: theme.muted, fontSize: 11 }}>
                                Sans emoji
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                      {editable && editingId === moment.id ? editor(moment) : null}
                    </View>
                  </View>
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
              alignItems: 'center', gap: 9,
              paddingVertical: 11, paddingHorizontal: 15,
              borderRadius: 24, marginTop: 15,
              backgroundColor: theme.dark ? '#332934' : '#F8EAF1' }}>
            <Ionicons name="add" size={18} color={MAGENTA}/>
            <Text style={{ color: MAGENTA, fontSize: 12,
              fontWeight: '700' }}>
              {publicView ? 'Ajouter un souvenir' : 'Ajouter un souvenir'}
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
