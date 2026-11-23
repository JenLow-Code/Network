# JenLow Agenda — état du front-end (23 novembre 2026)

## Sources connectées dans l'application

L'Agenda lit **en temps réel depuis les stores locaux déjà utilisés par les écrans**, sans recopier les dates dans un deuxième registre :

- **Rêves** : dates objectifs, jalons du journal de Croissance, changements de ressources (trouvée, perdue, ajoutée), réalisation de Floraison, rappel de Floraison et date de reprise après congélation.
- **Habitudes** : habitudes des rêves en Croissance et habitudes personnelles, avec mesures/validations répercutées dans l'espace de travail d'origine. Les jours futurs restent non éditables.
- **Prières** : sujets enregistrés, projetés sur le jour sélectionné selon la récurrence quotidienne, hebdomadaire ou unique existante.
- Les marqueurs du mois correspondent aux événements **réellement datés** de la projection des rêves. Une date invalide est écartée.

L'entrée Agenda ouvre le rêve concerné. Les sélecteurs sont dans `src/domain/agendaOverview.ts` ; leurs contrôles de régression sont dans `scripts/verify-agenda.cjs`.

## Ce qui n'est pas une synchronisation externe

Les rendez-vous fictifs `DEMO_AGENDA` ne sont **plus affichés comme des rendez-vous réels**. Aucun rendez-vous ne peut encore être créé automatiquement depuis une invitation tant qu'un événement backend validé (date, heure, timezone, participants et statut) n'existe pas.

L'intégration des calendriers Apple / Google / Outlook n'est **pas implémentée**. Son futur développement doit respecter :

1. Invitation acceptée par le destinataire, dates de début/fin explicites et fuseau horaire réel.
2. Export vers le calendrier natif seulement après autorisation (Expo Calendar sur iOS/Android installés).
3. OAuth avec autorisations calendrier et renouvellement de jetons côté backend pour la synchronisation bidirectionnelle Google/Outlook.
4. Gestion idempotente des récurrences, annulations, notifications, modifications et zones horaires.
5. Éviter les notifications, heures, éléments sociaux et services fictifs.

## Contrôles de livraison

Le workflow `frontend-validation.yml` vérifie les sélecteurs d'Agenda, les dates et les éléments de thème, les largeurs communes et les exports web/Android. Il **ne remplace pas** la revue visuelle sur les véritables appareils : tester jours et mois, orientation mobile, thèmes clair/sombre, titres longs et petit écran, puis vérifier que les modifications d'habitudes se reflètent dans Croissance.
