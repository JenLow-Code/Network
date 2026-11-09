import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamGrowthEvent, DreamMilestone, DreamResource } from '@/domain/dreamWorkspace';
import { buildGrowthDays, countVerifiedPrayers, type GrowthDay } from '@/domain/growthTimeline';
import { habitDayKey, habitDreamProgress } from '@/domain/habitProgress';
import { canPreviewGrowth, isSeedGrowthPreview, sampleGrowthPreview } from '@/domain/mockGrowthPreview';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { PrayerIcon } from '@/icons/PrayerIcon';
import { HabitSquareGrid } from './HabitSquareGrid';

const GREEN = '#27845B';
const PINK = '#D71D77';
const BLUE = '#397F9E';
const LIME = '#A1BA44';

const localLabel = (date: string, today: string): string => {
  if (date === today) return 'AUJOURD’HUI';
  const parsed = new Date(date + 'T12:00:00');
  return Number.isNaN(parsed.getTime()) ? date :
    parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
};

const colorFor = (category: DreamResource['category']) =>
  category === 'person' ? PINK : category === 'financial' ? LIME : BLUE;
const categoryTitle = (category: DreamResource['category']) =>
  category === 'person' ? 'Talent' : category === 'financial' ? 'Financement' : 'Ressource';

type PreviewEvent = { id: string; date: string; title: string; kind: 'resource' | 'document' };
type ActivityCount = { delta?: number; total?: number };
type DaySocial = { prayers?: ActivityCount; encouragements?: ActivityCount; fictitious?: boolean };
type LogbookDay = GrowthDay & { previewEvents: PreviewEvent[]; social?: DaySocial };

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const positiveCount = (value: unknown): value is number =>
  validCount(value) && value > 0;
const validDay = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

function SocialLine({ title, icon, color, value }: {
  title: string; icon: 'prayer' | 'heart'; color: string; value: ActivityCount;
}) {
  const theme = useAppTheme();
  const delta = positiveCount(value.delta) ? '+' + value.delta : null;
  const total = validCount(value.total) ? String(value.total) : null;
  if (!delta && !total) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 27 }}>
    {icon === 'prayer' ? <PrayerIcon size={16} color={color} /> :
      <Ionicons name="heart-outline" size={17} color={color} />}
    <Text style={{ flex: 1, fontSize: 12, color: theme.foreground }}>{title}</Text>
    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.foreground }}>
      {delta || ''}{delta && total ? ' / ' : ''}{total || ''}
    </Text>
    {!delta && total ? <Text style={{ color: theme.muted, fontSize: 10 }}>au total</Text> : null}
  </View>;
}

/** Compact habit progress belongs to TODAY only, without a daily duplicate.
 * The grid stays one row high until its owner explicitly expands it. */
function CurrentHabitSummary({ dream, onManage }: {
  dream: DreamEntry; onManage: () => void;
}) {
  const theme = useAppTheme();
  const habits = dream.habits || [];
  if (!habits.length) return null;
  const visible = habits.slice(0, 3);
  return <View style={{ marginTop: 2, gap: 11 }}>
    {visible.map(habit => {
      const progress = habitDreamProgress(habit, dream.goalDate, dream.growthStartedAt);
      const color = habit.color || GREEN;
      return <View key={habit.id} style={{ gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{
            width: 26, height: 26, borderWidth: 1.5, borderColor: color,
            borderRadius: 15, alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 14, lineHeight: 19 }}>{habit.emoji || '🌱'}</Text>
          </View>
          <Text style={{
            flex: 1, color: theme.foreground, fontSize: 12, fontWeight: '600',
          }} numberOfLines={1}>{habit.title}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>
            {progress.planned === null ? progress.completed : progress.completed + ' / ' + progress.planned}
          </Text>
          {progress.streak > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="flame-outline" size={12} color={color} />
            <Text style={{ fontSize: 10, fontWeight: '700', color }}>{progress.streak}</Text>
          </View> : null}
        </View>
        <HabitSquareGrid habit={habit} planned={progress.planned}
          completed={progress.completed} color={color} />
      </View>;
    })}
    {habits.length > visible.length ? <Pressable accessibilityRole="button"
      onPress={onManage} style={{ alignSelf: 'flex-end', paddingVertical: 5 }}>
      <Text style={{ color: GREEN, fontSize: 11 }}>
        Voir les {habits.length - visible.length} autres habitudes
      </Text>
    </Pressable> : null}
  </View>;
}

export function GrowthLogbook({
  dream, editable, onWrite, onRetry, onManageHabits,
}: {
  dream: DreamEntry;
  editable: boolean;
  onWrite: () => void;
  onRetry: (log: DreamMilestone) => void;
  onManageHabits: () => void;
}) {
  const theme = useAppTheme();
  const [allOpen, setAllOpen] = useState(false);
  const [preview, setPreview] = useState(() => isSeedGrowthPreview(dream));
  const showPreview = canPreviewGrowth(dream) && preview;
  const example = showPreview ? sampleGrowthPreview() : null;
  const now = new Date();
  const today = habitDayKey(now);
  const todayWritten = (dream.milestones || []).some(log => log.date === today);

  // Leaves are generated only by actual dated events or explicitly labelled demo activity.
  // Routine habit check-ins NEVER create their own daily leaves.
  const byDate = new Map<string, LogbookDay>(
    buildGrowthDays(dream).map(day => [day.date, { ...day, previewEvents: [] }]),
  );
  const getDay = (date: string): LogbookDay => {
    let day = byDate.get(date);
    if (!day) {
      day = { date, notes: [], changes: [], documents: [], previewEvents: [] };
      byDate.set(date, day);
    }
    return day;
  };

  if (example) {
    getDay(today).social = {
      prayers: { delta: example.prayers.today, total: example.prayers.total },
      encouragements: { delta: example.encouragements.today, total: example.encouragements.total },
      fictitious: true,
    };
    for (const event of example.events) {
      getDay(event.date).previewEvents.push(event);
    }
  } else {
    // These optional records can only come from trusted dated source events.
    // The all-time totals alone are NOT evidence that something happened today.
    for (const stats of dream.socialDailyActivity || []) {
      // Historical prayer/encouragement changes never spawn repetitive leaves.
      // Only today's currently verified activity belongs in the current leaf.
      if (stats.date !== today || !validDay(stats.date) ||
        (!positiveCount(stats.prayers) && !positiveCount(stats.encouragements))) continue;
      const day = getDay(stats.date);
      const previous = day.social || {};
      day.social = {
        prayers: positiveCount(stats.prayers) ? {
          delta: (previous.prayers?.delta || 0) + stats.prayers,
          total: validCount(stats.prayerTotal) ? stats.prayerTotal : previous.prayers?.total,
        } : previous.prayers,
        encouragements: positiveCount(stats.encouragements) ? {
          delta: (previous.encouragements?.delta || 0) + stats.encouragements,
          total: validCount(stats.encouragementTotal) ? stats.encouragementTotal :
            previous.encouragements?.total,
        } : previous.encouragements,
      };
    }
    // If another event already created today's leaf, show verified aggregate totals
    // without inventing today's increment. Never create a new leaf from these totals.
    const activeToday = byDate.get(today);
    if (activeToday) {
      const verifiedPrayers = countVerifiedPrayers(dream);
      const verifiedEncouragements = validCount(dream.encouragementCount)
        ? dream.encouragementCount : null;
      const existing = activeToday.social || {};
      if (verifiedPrayers !== null && !existing.prayers?.total) {
        existing.prayers = { ...existing.prayers, total: verifiedPrayers };
      }
      if (verifiedEncouragements !== null && !existing.encouragements?.total) {
        existing.encouragements = { ...existing.encouragements, total: verifiedEncouragements };
      }
      activeToday.social = existing;
    }
  }

  const timeline = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  const shown = allOpen ? timeline : timeline.slice(0, 12);
  const todayHasActivity = byDate.has(today);

  return <View style={{ gap: 11, marginTop: 10, marginBottom: 22 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
      <Text style={{ color: theme.foreground, fontSize: 21, fontWeight: '700' }}>Logbook</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={onManageHabits}
          accessibilityLabel="Gérer les habitudes"
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
          <Ionicons name="calendar-outline" color={GREEN} size={19} />
        </Pressable>
        {editable ? <Pressable onPress={onWrite} accessibilityRole="button"
          accessibilityLabel={todayWritten ? 'Compléter la feuille du jour' : 'Écrire une feuille aujourd’hui'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}>
          <Ionicons name="leaf-outline" color={GREEN} size={18} />
          <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>
            {todayWritten ? 'Compléter aujourd’hui' : 'Écrire aujourd’hui'}
          </Text>
        </Pressable> : null}
      </View>
    </View>
    {canPreviewGrowth(dream) ? <Pressable accessibilityRole="button"
      onPress={() => setPreview(!preview)}
      style={{ alignSelf: 'flex-start', paddingVertical: 3, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Ionicons name="flask-outline" color={theme.muted} size={14} />
      <Text style={{ fontSize: 10, color: theme.muted }}>
        {showPreview ? 'Aperçu fictif actif · masquer' : 'Afficher des événements fictifs pour tester'}
      </Text>
    </Pressable> : null}
    {shown.length === 0 ? <View style={{ paddingVertical: 15, gap: 7, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center', lineHeight: 19 }}>
        Les moments vécus dans ce rêve apparaîtront ici.
      </Text>
    </View> : null}
    {shown.map((group, index) => <View key={group.date} style={{
      flexDirection: 'row', gap: 10, minHeight: 53,
    }}>
      <View style={{ width: 23, alignItems: 'center' }}>
        <Ionicons name="leaf-outline" size={22} color={GREEN} style={{ marginTop: 1 }} />
        {index < shown.length - 1 ? <View style={{
          flex: 1, width: 1, marginTop: 4, marginBottom: -2,
          backgroundColor: '#A4BDAF',
        }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={{ color: GREEN, fontWeight: '700', fontSize: 11, letterSpacing: .4, lineHeight: 23 }}>
            {localLabel(group.date, today)}
          </Text>
          {group.social?.fictitious ? <Text style={{
            fontSize: 9, color: theme.muted,
          }}>DÉMO</Text> : null}
        </View>
        {group.notes.map(log => <View key={log.id} style={{ gap: 7 }}>
          <Text style={{
            color: theme.foreground, fontFamily: HANDWRITING_FAMILY, fontSize: 22, lineHeight: 31,
          }}>{log.title}</Text>
          {log.publicationState === 'failed' && editable ? <Pressable accessibilityRole="button"
            onPress={() => onRetry(log)}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="refresh-outline" size={13} color={PINK} />
            <Text style={{ color: PINK, fontSize: 11 }}>Réessayer la publication</Text>
          </Pressable> : null}
        </View>)}
        {group.social?.prayers ? <SocialLine title="Prières" icon="prayer" color={PINK}
          value={group.social.prayers} /> : null}
        {group.social?.encouragements ? <SocialLine title="Encouragements" icon="heart" color={GREEN}
          value={group.social.encouragements} /> : null}
        {/* One compact habit grid in today's meaningful leaf only; older days never repeat it. */}
        {group.date === today && todayHasActivity && (dream.habits || []).length > 0 ?
          <CurrentHabitSummary dream={dream} onManage={onManageHabits} /> : null}
        {group.changes.map((event: DreamGrowthEvent) => {
          const color = colorFor(event.category);
          const icon = event.category === 'person' ? 'people-outline' :
            event.category === 'financial' ? 'wallet-outline' : 'cube-outline';
          const label = event.kind === 'need_added' ? 'Nouveau besoin' :
            event.kind === 'need_found' ? 'Trouvé' : 'À retrouver';
          return <View key={event.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={icon} size={17} color={color} />
            <Text style={{ color: theme.foreground, fontSize: 12, lineHeight: 19, flex: 1 }}>
              <Text style={{ fontWeight: '700', color }}>{categoryTitle(event.category)} · </Text>
              {event.title + ' · ' + label}
            </Text>
          </View>;
        })}
        {group.documents.map(doc => <Pressable key={doc.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/my-dream/library/[id]', params: { id: dream.id } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="document-text-outline" size={17} color={BLUE} />
          <Text style={{ color: theme.foreground, fontSize: 12, lineHeight: 19, flex: 1 }}>
            <Text style={{ fontWeight: '700', color: BLUE }}>Document · </Text>
            {doc.title + (doc.version > 1 ? ' · v' + doc.version : '') + ' ajouté'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.muted} />
        </Pressable>)}
        {group.previewEvents.map(event => <View key={event.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={event.kind === 'document' ? 'document-text-outline' : 'cube-outline'}
            size={17} color={BLUE} />
          <Text style={{ fontSize: 12, lineHeight: 19, color: theme.foreground, flex: 1 }}>
            {event.title}
          </Text>
          <Text style={{ fontSize: 9, color: theme.muted }}>Démo</Text>
        </View>)}
      </View>
    </View>)}
    {!allOpen && timeline.length > shown.length ? <Pressable accessibilityRole="button"
      onPress={() => setAllOpen(true)} style={{ alignSelf: 'center', padding: 10 }}>
      <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>
        Voir le reste du parcours ({timeline.length - shown.length})
      </Text>
    </Pressable> : null}
  </View>;
}
