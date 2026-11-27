# Intégration de JenLow Core

Source Core : https://github.com/JenLow-Code/core/tree/d33a0c21d746fa9fbb8478bf78a5d7e80d6c3748

Le gateway Network conserve son contrat public et sa liaison privée SECURITY. Aucun changement de domaine, de configuration Cloudflare, d'identité, de base, de profil ni de frontend n'est requis pour l'extraction. Le middleware déployé reste Network-scoped ; l'extension aux autres produits exige une validation séparée. Les anciennes sources et instructions de déploiement restent disponibles au commit Network 6be3917aabefebac74e131140f44c68152f32304. Ne pas réactiver les anciens services ni appliquer les migrations historiques en production.

Pour développer localement, cloner Core à côté de Network au commit indiqué dans core.lock.json, installer les dépendances middleware dans Core et exécuter les tests. La CI teste aussi l'intégration réelle avec le gateway Network, sans déployer ni accéder aux secrets de production.
