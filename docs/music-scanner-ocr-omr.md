# JenLow Music — Scan intelligent : paroles et partitions

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
