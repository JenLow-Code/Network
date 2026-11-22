# JenLow Music — Scan intelligent : paroles et partitions

## État implémenté (22 novembre 2026)

- Capture → **+ → Scanner** ; les photos JPG/PNG/WebP importées isolément ouvrent ce même parcours. Les photos déjà importées proposent **Reconnaître le document** depuis leurs détails.
- **Texte** : OCR assisté par Google Gemma 4 Vision via le Worker privé `jenlow-music-scan`; résultat éditable en paroles ou note, et original conservé.
- **Partition** : transcription visuelle **expérimentale** des notes en événements MIDI, audition et contrôle utilisateur obligatoires avant enregistrement. **Ce n'est pas encore un moteur OMR de niveau Audiveris** et la fidélité rythmique ou polyphonique n'est pas garantie.
- Worker séparé Cloudflare Workers AI (binding AI + D1, authentification Supabase, quotas, taille limitée, consentement avant analyse, pas de stockage serveur de la photo). Le modèle `@cf/google/gemma-4-26b-a4b-it` a été choisi après qu'un modèle Meta a opposé une restriction de licence EU. Un test réel de vision (image de test) et la réponse publique `/health` ont été vérifiés. Les scans complexes doivent encore être testés avec des partitions réelles.
- **Suppression** : corbeille par entrée Capture, demande de confirmation, nettoyage local et protection des entrées liées à des versions musicales.
- Limites actuelles du scanner : entrée **photo/image** uniquement (pas encore de PDF multipage ni de fichiers `.mxl`). Les documents scannés doivent être conservés localement dans le navigateur qui les a importés. Les fichiers MusicXML natifs sont importés sans OCR.



## Régression sur une photographie à quatre portées (22 novembre 2026)

Une photographie de chant harmonisé (clé de sol + clé de fa, sur deux systèmes)
a été reconnue comme « 27 notes » regroupées sur seulement trois instants.
**Ce résultat n'est pas une transcription musicale** : il représente trois
accords synthétiques à la place de plusieurs mesures. Le nombre de notes
seul ne doit jamais valider une numérisation.

Mesures de protection implémentées :
- Inspection locale des pixels de l'image : recherche de groupes de cinq lignes
  parallèles (portées) et cadrage de la zone musicale.
- Double contrôle de couverture : nombre d'instants distincts, durée du
  résultat en temps musicaux, confrontation au nombre de portées/systèmes.
- Renvoi de `scan_incomplete_score` plutôt qu'un « succès » si les notes
  sont concentrées sur quelques instants, avec tentative d'un second modèle.
- L'interface refuse d'enregistrer le résultat comme partition jouable lorsque
  le contrôle échoue, et garde le scan d'origine disponible.
- Tests automatisés sur 4 portées **synthétiques**, sans déposer la
  photographie privée de l'utilisatrice dans GitHub.

**Limitation non résolue :** Gemma/Qwen sont des modèles généralistes de vision,
et non des moteurs OMR spécialisés. Même un résultat passant ces contrôles
n'est pas garanti juste sur les voix, mesures, soupirs, rythmes ou liaisons.
Pour promettre la reconnaissance fidèle d'une partition complète, il faut
intégrer et valider un moteur OMR dédié avec export MusicXML, par exemple
Audiveris dans un service Java conteneurisé, ou une API OMR spécialisée
(F​lat Interactive Jobs) avec identifiants, consentement et budget configurés.
Ne pas activer un fournisseur externe payant ni transmettre des partitions
privées à un prestataire tiers sans autorisation.

## Décision UX

Les photos isolées n'ont plus de rôle créatif dans Capture. L'entrée « Scanner » aura deux choix distincts :

1. **Scanner un texte** : photographier ou importer un document (image/PDF, y compris manuscrit) ; extraire le texte ; afficher l'original et la transcription en comparaison ; corriger ; enregistrer comme *Paroles* ou *Note*.
2. **Scanner une partition** : photographier/importer une partition imprimée (image/PDF) ; lancer la reconnaissance musicale (OMR) ; afficher la partition source face à l'interprétation MusicXML ; corriger les notes, rythmes, silences, clés, mesures et voix ; écouter ; enregistrer comme *Partition* dans Capture.

Un fichier texte dactylographié ou DOCX conserve sa voie d'import direct. Les fichiers MusicXML peuvent déjà être importés comme vrais événements jouables, sans prétendre qu'une image a été reconnue.

## Garanties produit

- **L'original n'est jamais remplacé.** Il est privé et attaché à la transcription. Si le scan échoue, il reste disponible sans fausse conversion.
- **Aucune publication automatique** et aucune transcription présentée comme certaine avant contrôle humain.
- Ne pas confondre l'OCR (caractères, manuscrits) avec l'OMR (symboles musicaux).
- Garder le rendu JenLow : Capture = liste sobre (titre/date/aperçu), pas de photos décoratives ; la transcription textuelle apparaît comme une ligne de texte ; la partition comme une mini-portée avec bouton lecture.
- Les brouillons locaux restent privés sur cet appareil ; un transfert à un service externe exige un consentement clair indiquant le prestataire, la durée de rétention et les modalités de traitement.
- Préserver les fichiers images déjà importés. Ne pas faire de migration destructive.

## Pipeline OCR — textes imprimés et manuscrits

Entrée : caméra arrière sur mobile, sélection d'un document existant sur desktop, PDF multipage. Prétraitement : recadrage, orientation, correction de perspective, contraste (en conservant la source). Envoi à **un service OCR autorisé** ; candidats documentés : Google Cloud Vision DOCUMENT_TEXT_DETECTION ou Azure Document Intelligence Read. Les secrets sont conservés côté serveur, jamais dans Expo Web.

Sortie normalisée :
```ts
type TextScanResult={
  lines:{text:string;confidence?:number;page:number;
    bounds?:[number,number,number,number]}[];
  plainText:string;
  language?:string;
  engine:string;
  warning?:string[];
};
```

UI de révision : manuscrit à gauche, transcription éditable à droite ; correction par ligne ; distinction des sauts de ligne / couplets ; langue détectée ou choisie ; bouton « Ajouter aux paroles » / « Ajouter aux notes ». Tester au minimum FR, DE, EN et PT, manuscrit cursif et imprimé, accents et retours à la ligne. Le texte reconnu doit rester modifiable et traçable à son original.

**Aucun service OCR ni secret n'est configuré dans le changement actuel.** Ne pas afficher « OCR terminé » sans réponse réelle du moteur.

## Pipeline OMR — partitions

Priorité : **partitions imprimées** à une portée (puis piano 2 portées / voix multiples). Le moteur Audiveris est conçu pour convertir la notation occidentale imprimée en MusicXML ; **les partitions manuscrites ne sont pas prises en charge**. Ne pas promettre le manuscrit musical comme disponible.

Architecture cible :
```
Capture (photo / PDF) -> Worker API avec authentification
  -> stockage temporaire privé
  -> tâche OMR dans un environnement compatible Java / conteneur
  -> MusicXML -> validation et corrections dans l'éditeur JenLow
  -> MusicNotationEvent[] + original préservé -> bouton Écouter
```

Les **Cloudflare Workers classiques ne peuvent pas exécuter Audiveris Java nativement**. Prévoir un conteneur/service séparé pour l'OMR, avec file d'attente et gestion des délais, si la plateforme le permet. La synchronisation doit protéger les scans privés, limiter la taille/pages, éviter les URL publiques permanentes et supprimer les fichiers de travail après traitement.

Première intégration déjà livrée : l'import de MusicXML non compressé (`.xml`/`.musicxml`) alimente `musicEvents`, la lecture MIDI et l'éditeur existants. L'import d'image/PDF **n'est pas** traité comme s'il contenait déjà des notes reconnues. Les fichiers `.mxl`, les répétitions, nuances, ornements et instruments multipistes devront être traités/validés séparément avant de promettre une restitution fidèle.

## Critères d'acceptation à mesurer

1. Le scan photo/texte produit **du vrai texte reconnu**, jamais une chaîne fabriquée ; le texte manuscrit est révisable caractère par caractère et les sauts de ligne sont préservés.
2. Un scan de partition imprimée produit des notes, silences et temps détectés, jouables à une vitesse définie par la partition ou vérifiée par l'utilisateur.
3. Les erreurs potentielles sont visibles (symboles incertains, voix/mesures incompatibles) ; la validation de l'utilisateur précède l'intégration.
4. La relecture/édition ne modifie pas le scan d'origine ; l'import reste récupérable en cas d'échec ou de fermeture.
5. Tests sur au moins 20 pages de paroles (dactylographiées et manuscrites) et 20 pages de partitions (simple, accords, deux portées, variations de métrique, photo inclinée) ; compter séparément exactitude OCR et erreur de notes OMR.
6. Vérifier consommation, latence, coût et protection des données ; désactiver explicitement la fonction si le moteur externe n'est pas configuré, sans présenter un faux succès.

## Documentation de référence

- OCR : https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-read
- OCR : https://docs.cloud.google.com/vision/docs/handwriting
- OMR : https://audiveris.github.io/audiveris/_pages/handbook/
- OMR CLI : https://audiveris.github.io/audiveris/_pages/guides/advanced/cli/
