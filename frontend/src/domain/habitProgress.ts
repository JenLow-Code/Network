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

export const habitHistory = (habit: DreamHabit, now: Date = new Date(), total = habit.frequency === 'weekly' ? 12 : 28) => {
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


// Sum goal-period quantities without double counting completed periods and measurements.
// A period with a legacy completion but no measurement contributes its configured target.
export function habitDreamProgress(
  habit: DreamHabit,
  goalDate?: string,
  dreamStartedAt?: string,
  now: Date = new Date(),
): {completed:number;planned:number|null;remaining:number|null;unit:string;streak:number} {
  const target=habit.target&&habit.target>0?habit.target:1;
  const unit=habit.unit||'fois';
  const today=habitDayKey(now);
  const keys=new Set([
    ...habit.completed.map(key=>habitKey(habit.frequency,key)),
    ...Object.keys(habit.measurements||{}).map(key=>habitKey(habit.frequency,key)),
  ]);
  let completed=0;
  for(const key of keys){
    if(key>today)continue;
    const measured=habit.measurements?.[key];
    completed+=Math.max(0,measured??(habit.completed.some(done=>habitKey(habit.frequency,done)===key)?target:0));
  }
  completed=Math.round(completed*100)/100;
  const valid=(value?:string)=>!!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
    !Number.isNaN(new Date(value+'T12:00:00').getTime());
  if(!valid(goalDate))return {completed,planned:null,remaining:null,unit,streak:habitStreak(habit,now)};
  const firstKnown=[...keys].sort()[0];
  const started=valid(habit.startedAt)?habit.startedAt!:
    valid(dreamStartedAt?.slice(0,10))?dreamStartedAt!.slice(0,10):
    firstKnown||today;
  const startKey=habitKey(habit.frequency,started);
  const endKey=habitKey(habit.frequency,goalDate!);
  if(startKey>endKey)return {completed,planned:0,remaining:0,unit,streak:habitStreak(habit,now)};
  const start=new Date(startKey+'T12:00:00');
  const end=new Date(endKey+'T12:00:00');
  const periods=1+Math.round((end.getTime()-start.getTime())/(habit.frequency==='weekly'?7:1)/86400000);
  const planned=Math.round(Math.max(0,periods*target)*100)/100;
  const remaining=Math.max(0,Math.round((planned-completed)*100)/100);
  return {completed,planned,remaining,unit,streak:habitStreak(habit,now)};
}
