import type { DreamResource } from '@/domain/dreamWorkspace';

export const DREAM_TALENT_CHOICES: {
  title: string;
  illustration: NonNullable<DreamResource['illustration']>;
}[] = [
  { title:'Guitariste', illustration:'acoustic-guitar' },
  { title:'Guitariste électrique', illustration:'electric-guitar' },
  { title:'Batteur', illustration:'drums' },
  { title:'Chanteur', illustration:'singing' },
  { title:'Pianiste', illustration:'piano' },
  { title:'Bassiste', illustration:'bass' },
  { title:'Photographe', illustration:'camera' },
  { title:'Violoniste', illustration:'violin' },
  { title:'Violoncelliste', illustration:'cello' },
  { title:'Trompettiste', illustration:'trumpet' },
  { title:'Saxophoniste', illustration:'saxophone' },
  { title:'Contrebassiste', illustration:'double-bass' },
  { title:'Ukuléliste', illustration:'ukulele' },
  { title:'Cavaquinhiste', illustration:'ukulele' },
];
