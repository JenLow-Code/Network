# JenLow Network

Application Network : collaboration, musique, aspirations et découverte.

- `frontend/` : Expo / React Native.
- `api/network/` : gateway public Network.
- `core.lock.json` : révision immuable du dépôt [JenLow Core](https://github.com/JenLow-Code/core) utilisée par l'intégration CI.

Le middleware de sécurité, l'historique des migrations de la base commune et le code du Music Engine sont centralisés dans Core. Le Worker de sécurité existant, ses bindings et la base D1 ne changent pas lors de cette extraction. Les interfaces produit restent indépendantes ; toute intégration fonctionnelle future respecte les permissions et la revue Phase B.

Tests transversaux : le workflow Network and JenLow Core integration récupère la révision Core épinglée et teste le gateway Network réel contre le middleware. Les workflows de validation du schéma et de Music Engine sont maintenus dans Core. Voir [historique source](https://github.com/JenLow-Code/Network/tree/6be3917aabefebac74e131140f44c68152f32304) et [documentation Core](https://github.com/JenLow-Code/core/blob/d33a0c21d746fa9fbb8478bf78a5d7e80d6c3748/docs/core-extraction.md).
