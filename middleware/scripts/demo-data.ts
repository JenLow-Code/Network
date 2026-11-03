/**
 * Fictional demo dataset for local, preview and the beta Discovery.
 * Reuses the IDs already present in the remote D1 database (demo-user-01..10, demo-dream-XX-Y).
 * No real people, no real emails (example.invalid), no invented church affiliations, no
 * portraits standing in for members. Photos are illustrative Unsplash images with attribution.
 */
export const PHOTO = {
  guitar: '1510915361894-db8b60106cb1', library: '1507842217343-583bb7270b66', piano: '1520523839897-bd0b52f945a0',
  flowers: '1490750967868-88aa4486c946', garden: '1416879595882-3373a0480b5b', plant: '1466692476868-aef1dfb1e735',
  perform: '1516280440614-37939bbacd81', live: '1493225457124-a3eb161ffa5f', forest: '1441974231531-c6227db76b6e',
  studio: '1511379938547-c1f69419868d', mountain: '1470071459604-3b5ec3a7fe05',
} as const;
export type PhotoKey = keyof typeof PHOTO;

export type DemoUser = { n: string; name: string; city: string; country: string; bio: string; talents: [string, number, { teach?: boolean; learn?: boolean; tandem?: boolean; available?: boolean; description?: string }?][] };

export const USERS: DemoUser[] = [
  { n: '01', name: 'Camille Morel', city: 'Genève', country: 'CH', bio: 'Je chante depuis l’enfance et j’accompagne des groupes de jeunes. J’aimerais que chacun ose prendre un instrument, même sans moyens.',
    talents: [['talent-chant', 4, { teach: true, available: true, description: 'Voix, justesse et respiration ; j’aime aider les débutants à trouver leur voix.' }], ['talent-direction-louange', 4, { available: true }], ['talent-piano', 3, { tandem: true }]] },
  { n: '02', name: 'Gabriel Costa', city: 'Annemasse', country: 'FR', bio: 'Technicien son le jour, bricoleur de studios le soir. Je crois qu’un bon enregistrement ne devrait pas coûter une fortune.',
    talents: [['talent-sonorisation', 4, { available: true, teach: true }], ['talent-production-musicale', 3, { available: true }], ['talent-mixage', 3, { tandem: true }]] },
  { n: '03', name: 'Léa Schneider', city: 'Lausanne', country: 'CH', bio: 'Graphiste et illustratrice. Je dessine des lieux où l’on se sent accueilli, et j’apprends la guitare jazz à mon rythme.',
    talents: [['talent-graphisme', 5, { available: true }], ['talent-illustration', 4, { available: true }], ['talent-guitare-acoustique', 2, { learn: true }]] },
  { n: '04', name: 'Samuel Ribeiro', city: 'Lyon', country: 'FR', bio: 'Batteur et compositeur. Le rythme m’a sauvé à un moment difficile ; aujourd’hui je le transmets.',
    talents: [['talent-batterie', 5, { teach: true, available: true, description: 'Groove, lecture et jeu en groupe. Cours pour débutants et accompagnement de projets.' }], ['talent-composition', 4, { available: true }], ['talent-enseignement', 3, {}]] },
  { n: '05', name: 'Inès Carvalho', city: 'Paris', country: 'FR', bio: 'Photographe. Je cherche les histoires derrière les visages et j’apprends l’argentique pour ralentir.',
    talents: [['talent-photographie', 5, { available: true, teach: true, description: 'Portrait et reportage ; je peux documenter un projet de la première idée au résultat.' }], ['talent-video', 3, { available: true }]] },
  { n: '06', name: 'Noah Keller', city: 'Zürich', country: 'CH', bio: 'Menuisier et passionné de haute fidélité. Je répare plus que je n’achète.',
    talents: [['talent-menuiserie', 4, { available: true }], ['talent-sonorisation', 4, { available: true }], ['talent-mixage', 2, { learn: true }]] },
  { n: '07', name: 'Maya Bernard', city: 'Annecy', country: 'FR', bio: 'J’écris et j’organise. Dans mon association, j’aime faire en sorte que les bonnes personnes se rencontrent.',
    talents: [['talent-ecriture', 5, { available: true }], ['talent-organisation', 4, { available: true }], ['talent-jardinage', 3, { tandem: true }]] },
  { n: '08', name: 'Elias Fontaine', city: 'Genève', country: 'CH', bio: 'Développeur web et choriste. Je donne quelques heures par semaine pour aider des associations à s’organiser.',
    talents: [['talent-developpement-web', 4, { available: true }], ['talent-mentorat', 4, { teach: true, available: true }], ['talent-chant', 3, {}]] },
  { n: '09', name: 'Chloé Martins', city: 'Grenoble', country: 'FR', bio: 'Professeure de danse. À 34 ans, je me suis enfin mise au piano : j’ai tout à apprendre et je cherche quelqu’un de patient.',
    talents: [['talent-danse', 4, { teach: true, available: true }], ['talent-piano', 2, { learn: true, tandem: true, description: 'Débutante motivée : je cherche un professeur ou un tandem pour progresser.' }], ['talent-enseignement', 3, {}]] },
  { n: '10', name: 'Raphaël Dubois', city: 'Marseille', country: 'FR', bio: 'Luthier et artisan. Je fabrique des instruments simples pour que le prix ne soit plus une barrière.',
    talents: [['talent-menuiserie', 5, { available: true, teach: true }], ['talent-guitare-acoustique', 4, { available: true }], ['talent-basse', 3, { tandem: true }]] },
];

export type Need = { label: string; talent?: string; level?: number; category?: 'person' | 'practical' | 'financial'; slots?: number; required?: boolean; filledBy?: string[]; manual?: number; pendingFrom?: string[]; amountCents?: number; description?: string };
export type DemoDream = {
  id: string; owner: string; title: string; summary: string; phase: 'dream' | 'initiation' | 'growth' | 'testimony'; cover: PhotoKey;
  category: string; motivation?: string; goal?: string; needs?: Need[]; journal?: [string, string][]; testimony?: string; gallery?: PhotoKey[];
};

// Titles and summaries are identical to the rows already seeded remotely (branch feature/network-demo-api-20261101).
export const DREAMS: DemoDream[] = [
  { id: '01-1', owner: '01', phase: 'dream', cover: 'guitar', category: 'Musique', gallery: ['guitar', 'piano', 'perform'], title: 'Ouvrir un atelier musical pour les jeunes', summary: 'Rassembler des bénévoles et des instruments pour faire découvrir la musique à tous.', motivation: 'Beaucoup de jeunes de mon quartier n’ont jamais touché un instrument.' },
  { id: '01-2', owner: '01', phase: 'initiation', cover: 'studio', category: 'Musique', title: 'Composer un premier EP acoustique', summary: 'Écrire, enregistrer et publier six chansons avec des musiciens locaux.', motivation: 'Ces chansons parlent d’espérance ; je veux qu’elles existent ailleurs que dans mon carnet.', goal: '2027-05-31',
    needs: [
      { label: 'Guitariste acoustique', talent: 'talent-guitare-acoustique', level: 3, filledBy: ['10'], description: 'Accompagner six titres en studio, environ trois sessions.' },
      { label: 'Mixage et mastering', talent: 'talent-mixage', level: 4, pendingFrom: ['02'], description: 'Mixer six titres acoustiques et préparer un master pour la diffusion en ligne.' },
      { label: 'Photographe', talent: 'talent-photographie', level: 3, filledBy: ['05'], description: 'Une séance pour la pochette et quelques images des sessions.' },
      { label: 'Studio pour trois jours', category: 'practical', description: 'Une pièce calme avec un minimum de traitement acoustique.' },
    ] },
  { id: '01-3', owner: '01', phase: 'growth', cover: 'live', category: 'Louange', title: 'Organiser une soirée de louange', summary: 'Réunir plusieurs équipes pour un événement musical ouvert au quartier.', motivation: 'Créer un moment simple où chacun est le bienvenu, qu’il fréquente une église ou non.', goal: '2026-12-20',
    needs: [{ label: 'Technicien son', talent: 'talent-sonorisation', level: 3, filledBy: ['02'] }, { label: 'Batteur', talent: 'talent-batterie', level: 3, filledBy: ['04'] }, { label: 'Lieu d’accueil', category: 'practical', manual: 1 }],
    journal: [['2026-10-18', 'Première répétition commune : trois équipes, un seul répertoire. On a choisi huit chants.'], ['2026-10-29', 'La salle est confirmée et la sono testée. Il reste à préparer l’accueil des familles.']] },
  { id: '02-1', owner: '02', phase: 'testimony', cover: 'studio', category: 'Son', title: 'Construire un home studio accessible', summary: 'Réaliser un espace d’enregistrement de qualité avec un budget raisonnable.',
    testimony: 'Avec des panneaux fabriqués maison et du matériel d’occasion, le studio est prêt. Quatre artistes y ont déjà enregistré leurs premières maquettes gratuitement.' },
  { id: '02-2', owner: '02', phase: 'dream', cover: 'library', category: 'Témoignage', title: 'Créer un podcast de témoignages', summary: 'Recueillir et publier des histoires qui donnent de l’espoir.', motivation: 'Les histoires des gens ordinaires m’ont souvent plus aidé que les grands discours.' },
  { id: '02-3', owner: '02', phase: 'initiation', cover: 'piano', category: 'Artisanat', title: 'Restaurer un piano ancien', summary: 'Redonner vie à un piano et partager sa transformation.', motivation: 'Ce piano dormait dans une salle de quartier ; il pourrait de nouveau servir aux enfants.', goal: '2027-03-15',
    needs: [
      { label: 'Menuisier', talent: 'talent-menuiserie', level: 4, filledBy: ['10'], description: 'Reprendre le meuble et la table d’harmonie.' },
      { label: 'Pièces détachées', category: 'financial', amountCents: 45000, description: 'Marteaux, feutres et cordes.' },
      { label: 'Accordeur professionnel', category: 'practical', description: 'Un accord complet une fois la mécanique restaurée.' },
    ] },
  { id: '03-1', owner: '03', phase: 'growth', cover: 'library', category: 'Communauté', title: 'Dessiner une bibliothèque de quartier', summary: 'Imaginer un lieu de lecture chaleureux ouvert à tous.', motivation: 'Un endroit gratuit où s’asseoir, lire et rencontrer ses voisins.', goal: '2027-04-01',
    needs: [{ label: 'Menuisier', talent: 'talent-menuiserie', level: 4, filledBy: ['10'] }, { label: 'Coordination des bénévoles', talent: 'talent-organisation', level: 3, filledBy: ['07'] }, { label: 'Textes de la signalétique', talent: 'talent-ecriture', level: 2, required: false }],
    journal: [['2026-10-10', 'Plans validés avec l’association : douze étagères, un coin enfants, deux fauteuils récupérés.'], ['2026-10-27', 'Les premières étagères sont montées. Les voisins ont déjà apporté plus de deux cents livres.']] },
  { id: '03-2', owner: '03', phase: 'testimony', cover: 'guitar', category: 'Musique', title: 'Apprendre la guitare jazz', summary: 'Progresser avec un professeur et jouer un premier morceau sur scène.',
    testimony: 'Six mois de tandem, beaucoup de patience, et un premier standard joué devant quarante personnes. Mes mains tremblaient, mais je l’ai fait.' },
  { id: '03-3', owner: '03', phase: 'dream', cover: 'mountain', category: 'Art', title: 'Organiser une exposition locale', summary: 'Faire découvrir les œuvres des artistes émergents de la région.' },
  { id: '04-1', owner: '04', phase: 'initiation', cover: 'perform', category: 'Musique', title: 'Lancer un groupe de musique', summary: 'Trouver les musiciens et un local pour répéter chaque semaine.', motivation: 'Jouer ensemble, régulièrement, pour servir lors d’événements du quartier.', goal: '2027-01-31',
    needs: [
      { label: 'Bassiste', talent: 'talent-basse', level: 3, filledBy: ['10'] },
      { label: 'Chanteur ou chanteuse', talent: 'talent-chant', level: 3, description: 'Répétition le jeudi soir ; répertoire pop et gospel.' },
      { label: 'Guitariste électrique', talent: 'talent-guitare-electrique', level: 3 },
      { label: 'Local de répétition', category: 'practical', manual: 1 },
    ] },
  { id: '04-2', owner: '04', phase: 'growth', cover: 'live', category: 'Musique', title: 'Enregistrer un album en public', summary: 'Capturer l’énergie d’un concert et sortir un album live.', motivation: 'Le live, c’est là que nos morceaux prennent vie.', goal: '2027-02-14',
    needs: [{ label: 'Mixage live', talent: 'talent-mixage', level: 4, filledBy: ['02'] }, { label: 'Photographe', talent: 'talent-photographie', level: 3, filledBy: ['05'] }, { label: 'Salle de concert', category: 'practical', manual: 1 }],
    journal: [['2026-10-05', 'Date fixée et salle réservée. Nous travaillons l’ordre des morceaux.'], ['2026-10-30', 'Répétition générale enregistrée pour tester les micros : le son est prometteur.']] },
  { id: '04-3', owner: '04', phase: 'testimony', cover: 'perform', category: 'Transmission', title: 'Donner des cours de batterie', summary: 'Transmettre les bases de la batterie à des débutants.',
    testimony: 'Huit élèves ont suivi le cycle complet. Deux jouent maintenant dans l’équipe de musique de leur quartier.' },
  { id: '05-1', owner: '05', phase: 'dream', cover: 'plant', category: 'Communauté', gallery: ['plant', 'flowers'], title: 'Ouvrir un café culturel', summary: 'Créer un lieu accueillant pour la musique et les rencontres.', motivation: 'Un lieu où la photo, la musique et les conversations se croisent.' },
  { id: '05-2', owner: '05', phase: 'initiation', cover: 'mountain', category: 'Photographie', title: 'Apprendre la photographie argentique', summary: 'Photographier, développer et exposer une première série argentique.', motivation: 'Ralentir, choisir chaque image.', goal: '2027-04-30',
    needs: [{ label: 'Appareil moyen format', category: 'practical', manual: 1 }, { label: 'Mentor en argentique', talent: 'talent-mentorat', level: 4, filledBy: ['08'] }, { label: 'Accès à un laboratoire', category: 'practical', description: 'Quelques séances de développement noir et blanc.' }] },
  { id: '05-3', owner: '05', phase: 'growth', cover: 'forest', category: 'Photographie', title: 'Produire une série de portraits', summary: 'Mettre en lumière les histoires de personnes inspirantes.', goal: '2027-01-20',
    needs: [{ label: 'Textes des portraits', talent: 'talent-ecriture', level: 3, filledBy: ['07'] }, { label: 'Lieu d’exposition', category: 'practical', manual: 1 }],
    journal: [['2026-10-12', 'Sept portraits réalisés sur douze. Chaque séance commence par un café et une histoire.'], ['2026-10-28', 'Maya a écrit les trois premiers textes ; ils changent complètement la lecture des images.']] },
  { id: '06-1', owner: '06', phase: 'testimony', cover: 'studio', category: 'Artisanat', title: 'Fabriquer des enceintes haute fidélité', summary: 'Concevoir et mesurer une paire d’enceintes de référence.',
    testimony: 'Les plans sont publiés et une paire est désormais prêtée au studio associatif. Trois personnes ont déjà construit la leur.' },
  { id: '06-2', owner: '06', phase: 'dream', cover: 'piano', category: 'Artisanat', title: 'Créer un atelier de réparation musicale', summary: 'Réparer les instruments inutilisés et leur donner une seconde vie.' },
  { id: '06-3', owner: '06', phase: 'initiation', cover: 'live', category: 'Solidarité', title: 'Monter un concert caritatif', summary: 'Réunir des artistes pour soutenir une cause locale.', motivation: 'Soutenir l’épicerie solidaire du quartier avant l’hiver.', goal: '2026-12-12',
    needs: [
      { label: 'Technicien son', talent: 'talent-sonorisation', level: 4, filledBy: ['02'] },
      { label: 'Organisation de l’accueil', talent: 'talent-organisation', level: 3, filledBy: ['07'] },
      { label: 'Chanteurs', talent: 'talent-chant', level: 3, slots: 2, filledBy: ['01'] },
      { label: 'Salle de 200 places', category: 'practical' },
    ] },
  { id: '07-1', owner: '07', phase: 'growth', cover: 'library', category: 'Écriture', title: 'Écrire un livre illustré', summary: 'Écrire et illustrer un récit que les familles pourront partager.', goal: '2027-05-01',
    needs: [{ label: 'Illustratrice', talent: 'talent-illustration', level: 4, filledBy: ['03'] }, { label: 'Imprimeur', category: 'practical', manual: 1 }],
    journal: [['2026-10-08', 'Le texte est terminé : vingt-quatre doubles pages.'], ['2026-10-26', 'Léa a livré les premiers croquis. Les enfants du quartier ont choisi le personnage principal.']] },
  { id: '07-2', owner: '07', phase: 'testimony', cover: 'garden', category: 'Communauté', title: 'Développer un jardin partagé', summary: 'Transformer un terrain libre en espace collectif et fertile.',
    testimony: 'Trente familles cultivent désormais ensemble. La première récolte a été partagée lors d’un repas ouvert à tout le quartier.' },
  { id: '07-3', owner: '07', phase: 'dream', cover: 'forest', category: 'Cinéma', title: 'Réaliser un court-métrage', summary: 'Raconter une histoire simple avec une petite équipe de cinéma.' },
  { id: '08-1', owner: '08', phase: 'initiation', cover: 'perform', category: 'Musique', title: 'Monter une chorale intergénérationnelle', summary: 'Faire chanter ensemble plusieurs générations chaque semaine.', motivation: 'Que les aînés et les jeunes se rencontrent autour du chant.', goal: '2027-02-28',
    needs: [
      { label: 'Direction de chœur', talent: 'talent-direction-louange', level: 4, filledBy: ['01'] },
      { label: 'Pianiste accompagnateur', talent: 'talent-piano', level: 3, pendingFrom: ['09'] },
      { label: 'Salle associative', category: 'practical', manual: 1 },
      { label: 'Accueil des participants', talent: 'talent-accueil', level: 2, slots: 2 },
    ] },
  { id: '08-2', owner: '08', phase: 'growth', cover: 'plant', category: 'Associatif', title: 'Créer une application associative', summary: 'Créer un outil simple pour faciliter l’organisation des bénévoles.', goal: '2027-03-01',
    needs: [{ label: 'Graphiste', talent: 'talent-graphisme', level: 3, filledBy: ['03'] }, { label: 'Coordination des tests', talent: 'talent-organisation', level: 3, filledBy: ['07'] }],
    journal: [['2026-10-15', 'Première version testée par cinq bénévoles : l’inscription aux créneaux fonctionne.'], ['2026-10-31', 'Nouvelle maquette de Léa, beaucoup plus lisible sur téléphone.']] },
  { id: '08-3', owner: '08', phase: 'testimony', cover: 'live', category: 'Transmission', title: 'Former des bénévoles à la sonorisation', summary: 'Apprendre les bases du son live à une équipe locale.',
    testimony: 'Douze bénévoles formés en quatre samedis. Les événements de l’association ont maintenant leur propre équipe son.' },
  { id: '09-1', owner: '09', phase: 'dream', cover: 'flowers', category: 'Danse', gallery: ['flowers', 'perform'], title: 'Ouvrir un studio de danse', summary: 'Trouver un lieu pour accueillir des cours et des répétitions.', motivation: 'Offrir des cours accessibles aux enfants qui n’en ont pas les moyens.' },
  { id: '09-2', owner: '09', phase: 'initiation', cover: 'piano', category: 'Musique', title: 'Enregistrer des chansons pour enfants', summary: 'Produire une collection de chansons originales pour les plus petits.', motivation: 'Des chansons pour apprendre en dansant.', goal: '2027-06-15',
    needs: [{ label: 'Compositeur', talent: 'talent-composition', level: 3, filledBy: ['04'] }, { label: 'Production musicale', talent: 'talent-production-musicale', level: 3, pendingFrom: ['02'] }, { label: 'Illustrations du livret', talent: 'talent-illustration', level: 3, filledBy: ['03'] }] },
  { id: '09-3', owner: '09', phase: 'growth', cover: 'live', category: 'Événement', title: 'Organiser un festival local', summary: 'Réunir les artistes du territoire autour d’un événement accessible.', goal: '2027-07-04',
    needs: [{ label: 'Régie son', talent: 'talent-sonorisation', level: 4, filledBy: ['06'] }, { label: 'Coordination', talent: 'talent-organisation', level: 4, filledBy: ['07'] }, { label: 'Photographe', talent: 'talent-photographie', level: 3, filledBy: ['05'] }, { label: 'Autorisation municipale', category: 'practical', manual: 1 }],
    journal: [['2026-10-09', 'Autorisation obtenue pour le parc. Quinze artistes ont répondu à l’appel.'], ['2026-10-30', 'Plan de scène validé avec Noah. Les bénévoles se répartissent les postes.']] },
  { id: '10-1', owner: '10', phase: 'testimony', cover: 'guitar', category: 'Artisanat', title: 'Lancer une marque d’instruments', summary: 'Dessiner et fabriquer des instruments utiles aux musiciens.',
    testimony: 'Les vingt premières guitares d’étude sont sorties de l’atelier, dont cinq offertes à une école de musique de quartier.' },
  { id: '10-2', owner: '10', phase: 'dream', cover: 'mountain', category: 'Événement', title: 'Construire une scène mobile', summary: 'Construire une scène démontable et transportable pour des événements.' },
  { id: '10-3', owner: '10', phase: 'initiation', cover: 'studio', category: 'Solidarité', title: 'Créer une banque de matériel partagé', summary: 'Permettre aux associations d’emprunter du matériel musical.', motivation: 'Trop de matériel dort dans des placards pendant que d’autres en manquent.', goal: '2027-03-31',
    needs: [{ label: 'Développeur web', talent: 'talent-developpement-web', level: 3, filledBy: ['08'] }, { label: 'Local de stockage', category: 'practical' }, { label: 'Assurance du matériel', category: 'financial', amountCents: 60000 }] },
];

export const SAME_DREAM: [string, string][] = [['01-1', '08'], ['05-1', '07'], ['05-1', '09'], ['09-1', '03'], ['10-2', '06'], ['02-2', '07']];
export const ENCOURAGEMENTS: [string, string][] = [['01-1', '04'], ['02-2', '01'], ['03-3', '05'], ['07-3', '05'], ['09-1', '01'], ['04-2', '09']];
/** [originating Floraison, inspired Dream] */
export const LINEAGE: [string, string][] = [['07-2', '05-1'], ['02-1', '01-2']];
export const SHOWCASES: [string, string, string][] = [['04', 'talent-batterie', 'drums'], ['05', 'talent-photographie', 'camera'], ['10', 'talent-guitare-acoustique', 'acoustic-guitar'], ['01', 'talent-chant', 'singing'], ['09', 'talent-piano', 'piano']];

export const BIBLE = [
  { id: 'psaume-150-6', owner: '01', verse: 6, photo: 'library' as PhotoKey, caption: 'Le verset que je garde avant chaque répétition.' },
  { id: 'psaume-150-1', owner: '08', verse: 1, photo: 'forest' as PhotoKey, caption: null },
];
export const MUSIC = [
  { id: 'douceur', owner: '04', title: 'Douceur', asset: 'pierre-01-douceur', photo: 'piano' as PhotoKey, description: 'Un premier essai partagé pour encourager les autres à se lancer.' },
  { id: 'esperance', owner: '09', title: 'Espérance', asset: 'pierre-02-esperance', photo: 'perform' as PhotoKey, description: 'Une mélodie instrumentale en cours de création.' },
  { id: 'lumiere', owner: '02', title: 'Lumière', asset: 'pierre-03-lumiere', photo: 'studio' as PhotoKey, description: 'Une petite idée musicale, encore imparfaite mais partagée.' },
];
