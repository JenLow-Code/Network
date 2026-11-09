import type { DreamEntry, DreamGrowthEvent, DreamMilestone, DreamResource } from './dreamWorkspace';
import { habitDayKey } from './habitProgress';
import { isNeedFound } from './dreamResourceRecovery';

export type TimelineDocument = { id:string; title:string; version:number };
export type GrowthDay = {
  date: string;
  notes: DreamMilestone[];
  documents: TimelineDocument[];
  changes: DreamGrowthEvent[];
};
const validDay = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Derived exclusively from actual workspace data; demo previews are separate. */
export function buildGrowthDays(dream: DreamEntry): GrowthDay[] {
  const byDate = new Map<string, GrowthDay>();
  const get = (date: string): GrowthDay => {
    let entry=byDate.get(date);
    if (!entry) {
      entry={date,notes:[],documents:[],changes:[]};
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
  // Document uploads are meaningful dated milestones; routine habit check-ins
  // update one ongoing progress summary rather than creating daily leaf entries.
  for (const doc of dream.documents || []) {
    doc.versions.forEach((version, index) => {
      const dateValue = new Date(version.addedAt);
      if (Number.isNaN(dateValue.getTime())) return;
      const date=habitDayKey(dateValue);
      get(date).documents.push({
        id:version.id, title:doc.name, version:index+1,
      });
    });
  }
  return Array.from(byDate.values())
    .sort((a,b)=>b.date.localeCompare(a.date));
}

/** Logs become immutable 24 hours after creation.
 * Legacy logs without creation timestamps are only editable on their dated calendar day. */
export function canEditGrowthLog(log:DreamMilestone, now:Date=new Date()):boolean {
  if(log.createdAt) {
    const created=Date.parse(log.createdAt);
    const elapsed=now.getTime()-created;
    return Number.isFinite(created)&&elapsed>=0&&elapsed<24*60*60*1000;
  }
  return log.date===habitDayKey(now);
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
