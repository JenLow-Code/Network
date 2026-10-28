import { publications, personPublications } from './publications';
const known: Record<string, string[]> = {
  Sarah: ['Guitare', 'Louange'],
  Arnaud: ['Musique', 'Collaboration'],
  Gustav: ['Jardinage'],
  Esther: ['Photographie'],
  David: ['Piano'],
  Helena: ['Musique'],
  Mila: ['Guitare'],
  Léa: [],
  Noah: [],
};
export const people = Array.from(
  new Set([...publications, ...personPublications].map(p => p.author)),
).map(name => ({
  name,
  talents: known[name] || [],
  posts: publications.filter(p => p.author === name),
  skills: personPublications.filter(p => p.author === name),
}));
export const personPath = (name: string) => ({
  pathname: '/member/[name]' as const,
  params: { name },
});
