/**
 * JenLow Network demo publications (mock data).
 *
 * A publication has exactly one content type: a Dream, a Music recording,
 * or a Bible image/reference. Photos are illustrative Unsplash images.
 * A shared Bible image can later be populated by the native share-in extension.
 */
import type {
  Publication,
  PersonPublication,
  DreamPublication,
  MusicPublication,
  BiblePublication,
} from '@/domain/publication';

/** Stable photo IDs from Unsplash; we will replace these demo images with member uploads. */
export const publications: Publication[] = [
  {
    id: 'louange',
    type: 'dream',
    title: 'Jouer dans une équipe de louange',
    author: 'Sarah',
    phase: 'Initiation',
    summary: 'Apprendre à accompagner les chants à la guitare et rejoindre une équipe de louange.',
    motivation: 'Partager la musique et servir ensemble.',
    needs: ['Guitare', 'Tandem'],
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=900&q=82',
    imageAlt: 'Acoustic guitar',
  },
  {
    id: 'psaume-150',
    type: 'bible',
    title: 'Psaume 150:6',
    author: 'Léa',
    reference: 'Psaume 150:6',
    referenceId: 'psalm-150',
    highlightedVerse: 6,
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=82',
    imageAlt: 'Bookshelves in a library',
  },
  {
    id: 'premier-chant',
    type: 'music',
    title: 'Mon premier morceau',
    author: 'David',
    songAuthor: 'Auteur non renseigné',
    audioIndex: 0,
    description: 'Un premier essai partagé pour encourager les autres à se lancer.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=900&q=82',
    imageAlt: 'Piano keyboard',
  },
  {
    id: 'jardin',
    type: 'dream',
    title: 'Un jardin pour accueillir',
    author: 'Gustav',
    phase: 'Rêve',
    summary: 'Imaginer un lieu chaleureux où les gens peuvent se retrouver et partager.',
    needs: ['Jardinage', 'Entraide'],
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=82',
    imageAlt: 'Colourful flowers in a garden',
  },
  {
    id: 'espoir',
    type: 'music',
    title: 'Espérance',
    author: 'Helena',
    songAuthor: 'Auteur non renseigné',
    audioIndex: 1,
    description: 'Une mélodie instrumentale en cours de création.',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=82',
    imageAlt: 'Musician performing',
  },
  {
    id: 'ensemble',
    type: 'dream',
    title: 'Créer une équipe de musique',
    author: 'Arnaud',
    phase: 'Croissance',
    summary: 'Former une petite équipe pour faire de la musique et servir ensemble.',
    motivation: 'Créer de vraies rencontres grâce à la musique.',
    logs: ['Première rencontre de musiciens', 'Choix des premiers morceaux'],
    needs: ['Batterie', 'Piano', 'Chant'],
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=82',
    imageAlt: 'Live music performance',
  },
  {
    id: 'psaume-150-1',
    type: 'bible',
    title: 'Psaume 150:1',
    author: 'Noah',
    reference: 'Psaume 150:1',
    referenceId: 'psalm-150',
    highlightedVerse: 1,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=82',
    imageAlt: 'Sunlight in the forest',
  },
  {
    id: 'lumiere',
    type: 'music',
    title: 'Lumière',
    author: 'Mila',
    songAuthor: 'Auteur non renseigné',
    audioIndex: 2,
    description: 'Une petite idée musicale, encore imparfaite mais partagée.',
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=900&q=82',
    imageAlt: 'Acoustic guitar detail',
  },
  {
    id: 'photos',
    type: 'dream',
    title: 'Partager la beauté de la création',
    author: 'Esther',
    phase: 'Témoignage',
    summary: 'Une série de photographies réalisées et partagées avec la communauté.',
    needs: ['Photographie'],
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=82',
    imageAlt: 'Sunlit forest',
  },
];

export const personPublications: PersonPublication[] = [
  {
    id: 'person-sarah',
    type: 'talent',
    title: 'Guitariste',
    author: 'Sarah',
    talents: ['Guitare', 'Louange'],
    skill: 'Guitariste',
    level: 'Débutant',
    instrument: 'guitar',
    seeking: ['Tandem', 'Professeur'],
    description:
      'Passionnée de guitare et de louange, Sarah souhaite partager la musique et progresser avec d’autres.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=82',
    imageAlt: 'Profile example',
  },
  {
    id: 'person-arnaud',
    type: 'talent',
    title: 'Batteur',
    author: 'Arnaud',
    talents: ['Musique', 'Collaboration'],
    skill: 'Batteur',
    level: 'Intermédiaire',
    instrument: 'drums',
    seeking: ['Tandem', 'Élèves'],
    description:
      'Arnaud aime réunir des musiciens autour de projets communs et collaborer avec des talents variés.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=82',
    imageAlt: 'Profile example',
  },
  {
    id: 'person-esther',
    type: 'talent',
    title: 'Photographe',
    author: 'Esther',
    talents: ['Photographie'],
    skill: 'Photographe',
    level: 'Confirmée',
    instrument: 'camera',
    seeking: ['Élèves'],
    description:
      'Esther partage son regard sur la création à travers la photographie et de nouvelles rencontres.',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=82',
    imageAlt: 'Profile example',
  },
];
export const dreams = publications.filter((p): p is DreamPublication => p.type === 'dream');
export const musics = publications.filter((p): p is MusicPublication => p.type === 'music');
export const biblePosts = publications.filter((p): p is BiblePublication => p.type === 'bible');
export const findPublication = (id: string) => publications.find(item => item.id === id);
export const verseText = 'Que tout ce qui respire loue l’Éternel ! Louez l’Éternel !';
export const verseExcerpt = (p: BiblePublication) =>
  p.highlightedVerse === 1 ? psalm150[0] : psalm150[5];
export const psalm150 = [
  'Louez l’Éternel ! Louez Dieu dans son sanctuaire ! Louez-le dans l’étendue, où éclate sa puissance !',
  'Louez-le pour ses hauts faits ! Louez-le selon l’immensité de sa grandeur !',
  'Louez-le au son de la trompette ! Louez-le avec le luth et la harpe !',
  'Louez-le avec le tambourin et avec des danses ! Louez-le avec les instruments à cordes et le chalumeau !',
  'Louez-le avec les cymbales sonores ! Louez-le avec les cymbales retentissantes !',
  verseText,
];
