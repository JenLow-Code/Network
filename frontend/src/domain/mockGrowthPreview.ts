import type { DreamEntry } from './dreamWorkspace';
import { habitDayKey } from './habitProgress';

/**
 * FRONTEND PREVIEW ONLY: these numbers and events are fictitious.
 * Never persist them, send notifications, write API records or expose them publicly.
 * A synced dream must never use the preview.
 */
export function canPreviewGrowth(dream: DreamEntry): boolean {
  return !dream.serverDreamId && dream.phase === 'Croissance';
}
export function isSeedGrowthPreview(dream: DreamEntry): boolean {
  return canPreviewGrowth(dream) && (dream.id === 'ensemble' || dream.id === 'louange');
}

const offsetDate=(daysAgo:number,now:Date):string=>{
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  day.setDate(day.getDate()-daysAgo);
  return habitDayKey(day);
};

export function sampleGrowthPreview(now:Date=new Date()){
  return {
    prayers: {today:9,yesterday:7,total:16},
    encouragements: {today:1,yesterday:2,total:3},
    events: [
      {id:'demo-resource-8',date:offsetDate(8,now),
        kind:'resource' as const,title:'Matériel de répétition trouvé'},
      {id:'demo-document-4',date:offsetDate(4,now),
        kind:'document' as const,title:'Plan de répétition.pdf ajouté'},
    ],
  };
}
