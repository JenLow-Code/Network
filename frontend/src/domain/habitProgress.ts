import type { DreamHabit } from './dreamWorkspace';

/** Calendar-local dates: never use UTC ISO timestamps for a human's daily habit. */
export const habitDayKey = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0');

export const habitWeekStart = (date: string): string => {
  const d = new Date(date + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return date;
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return habitDayKey(d);
};

export const habitKey = (frequency: DreamHabit['frequency'], date: string): string =>
  frequency === 'weekly' ? habitWeekStart(date) : date;

/** Current run of consecutive completions. Today's incomplete slot doesn't break the run yet. */
export function habitStreak(habit: DreamHabit, now: Date = new Date()): number {
  const completed = new Set(habit.completed.map(key => habitKey(habit.frequency, key)));
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (habit.frequency === 'weekly') {
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  }
  const step = habit.frequency === 'weekly' ? 7 : 1;
  if (!completed.has(habitDayKey(date))) date.setDate(date.getDate() - step);
  let count = 0;
  while (count < 520 && completed.has(habitDayKey(date))) {
    count += 1;
    date.setDate(date.getDate() - step);
  }
  return count;
}

export const habitHistory = (habit: DreamHabit, now: Date = new Date()) => {
  const total = habit.frequency === 'weekly' ? 12 : 28;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (habit.frequency === 'weekly') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  const set = new Set(habit.completed.map(key => habitKey(habit.frequency, key)));
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() - (total - i - 1) * (habit.frequency === 'weekly' ? 7 : 1));
    const key = habitDayKey(date);
    return { key, completed: set.has(key) };
  });
};
