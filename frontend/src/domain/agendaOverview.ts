import type { DreamEntry } from './dreamWorkspace';

export type DreamCalendarKind = 'goal' | 'milestone' | 'resource' | 'achievement' | 'reminder' | 'resume';

export type DreamCalendarItem = {
  id: string;
  dreamId: string;
  date: string;
  title: string;
  description: string;
  kind: DreamCalendarKind;
  /** Dates originating in the dream remain local calendar days, never UTC conversions. */
  phase: DreamEntry['phase'];
};

/** Reject partial, impossible and time-zone-dependent dates before rendering a calendar item. */
export function calendarDay(value?: string): string | null {
  const day = value?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(day + 'T12:00:00');
  const local = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
  return local === day ? day : null;
}

/** Agenda is a projection of already-saved dream data: no duplicate storage,
 * fabricated appointments, network writes or automatic publication. */
export function dreamCalendarItems(dreams: readonly DreamEntry[]): DreamCalendarItem[] {
  const result: DreamCalendarItem[] = [];
  const push = (
    dream: DreamEntry,
    kind: DreamCalendarKind,
    identifier: string,
    date: string | undefined,
    title: string,
    description: string,
  ) => {
    const valid = calendarDay(date);
    if (!valid) return;
    result.push({ id: dream.id + ':' + kind + ':' + identifier,
      dreamId: dream.id, phase: dream.phase, date: valid, kind, title, description });
  };

  for (const dream of dreams) {
    push(dream, 'goal', 'date', dream.goalDate, dream.title, 'Date objectif');
    for (const log of dream.milestones || []) {
      push(dream, 'milestone', log.id, log.date, log.title, 'Journal · ' + dream.title);
    }
    for (const event of dream.growthEvents || []) {
      const label = event.kind === 'need_found' ? 'Ressource trouvée' :
        event.kind === 'need_lost' ? 'Ressource perdue' : 'Ressource ajoutée';
      push(dream, 'resource', event.id, event.date, event.title,
        label + ' · ' + dream.title);
    }
    const achieved = dream.testimony?.date ||
      dream.flowerDraft?.achievedOn || dream.fruitAt;
    push(dream, 'achievement', 'reality', achieved,
      dream.title, 'Rêve réalisé');
    push(dream, 'reminder', 'flower', dream.flowerDraft?.reminderDate,
      dream.title, 'Rappel de floraison');
    if (dream.paused && dream.pauseUntil) {
      const end = calendarDay(dream.pauseUntil);
      if (end) {
        const resume = new Date(end + 'T12:00:00');
        resume.setDate(resume.getDate() + 1);
        const day = [resume.getFullYear(), String(resume.getMonth() + 1).padStart(2, '0'),
          String(resume.getDate()).padStart(2, '0')].join('-');
        push(dream, 'resume', 'pause', day, dream.title, 'Fin de la pause');
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) ||
    a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

export function dreamItemsForDay(items: readonly DreamCalendarItem[], day: string) {
  return items.filter(item => item.date === day);
}

export function markedDreamDays(items: readonly DreamCalendarItem[], year: number, month: number) {
  const prefix = year + '-' + String(month + 1).padStart(2, '0') + '-';
  return new Set(items.filter(item => item.date.startsWith(prefix)).map(item => item.date));
}
