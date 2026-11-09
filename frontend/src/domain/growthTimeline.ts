import type { DreamEntry, DreamGrowthEvent, DreamHabit, DreamMilestone, DreamResource } from './dreamWorkspace';
import { habitDayKey, habitKey } from './habitProgress';
import { isNeedFound } from './dreamResourceRecovery';

export type TimelineHabit = Pick<DreamHabit, 'id' | 'title' | 'color' | 'emoji'>;
export type GrowthDay = {
  date: string;
  notes: DreamMilestone[];
  habits: TimelineHabit[];
  changes: DreamGrowthEvent[];
};
const validDay = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Derived from actual workspace state. Historical activity is never simulated. */
export function buildGrowthDays(dream: DreamEntry): GrowthDay[] {
  const byDate = new Map<string, GrowthDay>();
  const get = (date: string): GrowthDay => {
    let entry=byDate.get(date);
    if (!entry) {
      entry={date,notes:[],habits:[],changes:[]};
      byDate.set(date,entry);
    }
    return entry;
  };
  for (const note of dream.milestones || []) {
    if (validDay(note.date)) get(note.date).notes.push(note);
  }
  for (const event of dream.growthEvents || []) {
    if (validDay(event.date)) get(event.date).changes.push(event);
  }
  for (const habit of dream.habits || []) {
    for (const rawDay of new Set(habit.completed)) {
      if (!validDay(rawDay)) continue;
      // A weekly period key is *not* the date on which the person completed
      // the habit. Use the real calendar date when present; otherwise omit it.
      const completedOn = habit.frequency === 'weekly'
        ? habit.achievedOn?.[habitKey('weekly',rawDay)]
        : rawDay;
      if (completedOn && validDay(completedOn)) {
        const day=get(completedOn);
        if (!day.habits.some(h=>h.id===habit.id)) {
          day.habits.push({id:habit.id,title:habit.title,color:habit.color,emoji:habit.emoji});
        }
      }
    }
  }
  return Array.from(byDate.values())
    .sort((a,b)=>b.date.localeCompare(a.date));
}

export const countVerifiedPrayers = (dream: DreamEntry): number | null =>
  typeof dream.prayerCount === 'number' && Number.isInteger(dream.prayerCount) &&
  dream.prayerCount >= 0 ? dream.prayerCount : null;

export function growthResourceEvents(
  before: DreamResource[],
  after: DreamResource[],
  date: string = habitDayKey(new Date()),
): Omit<DreamGrowthEvent,'id'>[] {
  const was = new Map(before.map(need=>[need.id,need]));
  const changes: Omit<DreamGrowthEvent,'id'>[] = [];
  for (const need of after) {
    const previous=was.get(need.id);
    if (!previous) {
      if (!isNeedFound(need)) {
        changes.push({date,kind:'need_added',needId:need.id,title:need.title,category:need.category});
      }
      continue;
    }
    const prior=isNeedFound(previous),current=isNeedFound(need);
    if (prior===current) continue;
    changes.push({
      date,kind:current?'need_found':'need_lost',needId:need.id,
      title:need.title,category:need.category,
    });
  }
  return changes;
}
