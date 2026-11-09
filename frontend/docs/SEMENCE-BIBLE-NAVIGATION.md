# JenLow Network — Semence, Bible & dream navigation (November 2026)

## Level 3 Semence
- Two tabs: Inspirations and Notes. The Notes label can be renamed directly on the active tab. Existing block content and local private notes remain attached to the Dream.
- Notes blocks expand with their content; no inner scrolling. Multiple private notebooks/subtabs are a **future design exploration**, not part of the current release.
- Inspirations use a reference picker: photography, quotation, Bible verse, Publication, source document, link, audio/video. Generic written thoughts belong in Notes.
- The Publication picker loads a searchable Discovery-like grid **only when opened**. Selected items store the actual publication ID, with manual ID fallback. Semence is unlisted, never included in the public Discovery picker.
- The Bible verse picker uses Louis Segond 1910: choose a book/chapter/verse or type a reference (e.g. Jean 3:16). The selected text/reference are saved in the Semence inspiration.

## Bible library
- **Source**: public-domain Louis Segond 1910. Licence confirmation: https://ebible.org/fraLSG/copyright.htm . Machine-readable book files: https://github.com/midvash/bible-data/tree/main/versions/fr/lsg/books .
- Profile > Ma Bible enables download of all 66 books into the device's local AsyncStorage, one compact book per key. Reading a book individually caches that book. Interrupted downloads can resume.
- Offline full-text search is available for locally cached books. A reference can be browsed online without a full download if the remote data source is available.
- Sharing a verse uses the native share sheet. Publishing uses the existing authenticated `POST /api/bible/posts` API and **only reports success after the API confirms it**. The deployed middleware/database must include a selected book/chapter's actual verse records; the present checked-in seed contains Psalm 150 only. Do not advertise all 31,102 verses as publicly publishable until the Bible database is imported, indexed and tested.
- If local storage is insufficient, online reading still works but download-all reports incomplete. Native media file-picking/desktop EPUB export are separate scope.

## Level 1 ↔ Level 3
- Active dreams (Semence, Germination, Croissance) open Level 3 directly. Back returns to the previous Level 1 screen. Level 2 remains the immersive potential-fruit/Floraison view.
- Long-pressing a dream tile in My Space or the phase list reveals the objective date and the available actions: details, inspirations or documents, private notes, chat (Croissance onward), co-owners and participants (when relevant).
- People screens show accepted local co-owners and confirmed resource people; authorized server participant data is fetched only with a server Dream ID. No fabricated names/participants.

## Verification
Run `cd frontend && npm run typecheck`, `npx expo export --platform web`, and `npx expo export --platform android`. Browser/device interaction tests and production Worker deployment are distinct from successful source builds.
