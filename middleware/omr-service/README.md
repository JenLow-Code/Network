# JenLow Music — OMR réel (Python + Audiveris)

Cette API utilise **Audiveris 5.11.0** pour reconnaître les partitions imprimées en MusicXML. Elle ne demande plus à un LLM de deviner les notes à partir de l’image.

## Flux prévu

1. Capture JenLow garde l’image originale localement. L’utilisateur autorise explicitement son envoi.
2. Le Worker vérifie l’identité Supabase et applique son quota.
3. Le Worker appelle le conteneur Python `/v1/score` avec un secret interne.
4. Python améliore le contraste sans déformer le rythme, lance Audiveris en mode batch, puis extrait le MusicXML.
5. Le MusicXML est interprété en conservant **partie, portée, clé, voix, numéro de mesure, hauteur et durée**.
6. JenLow permet d’écouter **Tout**, la **mélodie / main droite** ou la **main gauche / basse** avant l’enregistrement.
7. Les données restent marquées `needs_review` : l’exactitude n’est jamais automatiquement garantie.

## Développement

Créer une image Docker avec `docker build -t jenlow-omr middleware/omr-service`.
Le service requiert la variable serveur `OMR_API_SECRET` (secret aléatoire de 32 caractères minimum). Ne jamais mettre ce secret dans Expo ni dans GitHub.
Le conteneur écoute au port 8000. Le Worker attend `OMR_ORIGIN` (adresse HTTPS du service interne) et `OMR_API_TOKEN` (identique à `OMR_API_SECRET`). Ces variables sont **à configurer comme secrets du Worker**, pas dans le frontend.

Tests hors moteur : depuis `middleware/omr-service`, installer `requirements-dev.txt` et lancer `python -m pytest -q tests`. Le pipeline GitHub vérifie la séparation des portées et les mesures sur une fixture synthétique.

**Non encore validé :** compilation Docker, reconnaissance sur la vraie photo « Je suis heureux », précision des voix, accords, liaisons, nuances ou reprises. Un test de parseur n’est pas un test OMR de bout en bout.

## Déploiement

Le dépôt contient le backend Python et le Worker de liaison, mais **aucun conteneur Audiveris n'est actuellement confirmé en production**. La route score doit retourner `omr_required` plutôt que de produire de faux accords tant que la configuration n’est pas complète. Déployer le conteneur sur une plateforme privée compatible Docker (par exemple Cloudflare Containers, sous réserve de configuration et du tarif), puis créer les secrets du Worker et vérifier `/health` ainsi qu’une vraie conversion d’image.

## Limites / licence

Audiveris reconnaît les **partitions imprimées** de notation occidentale et ne prend pas en charge les partitions manuscrites. Son moteur peut encore se tromper. Les originaux doivent être conservés et l’utilisateur doit corriger toute ambiguïté.

Audiveris est sous licence **AGPL-3.0**. Une intégration dans un service réseau impose de vérifier les obligations de mise à disposition du code ; séparer les composants en deux processus ne supprime pas automatiquement ces obligations. Une revue juridique/licence est nécessaire avant une utilisation commerciale.

Sources : https://audiveris.github.io/audiveris/_pages/guides/advanced/cli/ et https://github.com/Audiveris/audiveris/releases/tag/5.11.0.
