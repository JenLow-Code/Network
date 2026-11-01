import { publications, personPublications } from './publications';
const demoProfiles: Record<string, { bio: string; church?: string }> = {
  Sarah: { bio: 'Passionnée de guitare et de louange, j’aimerais progresser et faire de la musique avec d’autres.' },
  Arnaud: { bio: 'J’aime rassembler les musiciens autour de projets communs et apprendre en collaborant.' },
  Esther: { bio: 'Je photographie la beauté du quotidien et partage mes découvertes avec les autres.' },
};
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
  bio: demoProfiles[name]?.bio || personPublications.find(p => p.author === name)?.description || '',
  church: demoProfiles[name]?.church,
  talents: known[name] || [],
  posts: publications.filter(p => p.author === name),
  skills: personPublications.filter(p => p.author === name),
}));
export const personPath = (name: string) => ({
  pathname: '/member/[name]' as const,
  params: { name },
});
