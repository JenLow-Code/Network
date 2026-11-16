# JenLow Music — Song/workspace architecture (14 November 2026)

## Identity and non-negotiables
A song is primarily a **private/shared creative project**, NOT an audio publication.
- Private creative folders/cards have rounded corners, and never display a cassette.
- Public Discovery/music publications display an authentic cassette with the **individual track's** title and artwork, not a baked-in repeated cover.
- One song can grow into many songs/arrangements/versions with source attribution retained.
- JenLow Network remains human-first, encouraging, collaborative and non-commercial. No AI-generated creative performances, popularity contest, or unlimited downloads.

## Current creation workflow
1. Open Music > **Nouveau morceau**. There is no old inline “Créer son dossier” form.
2. Name the song and select its **original language**, including French, Portuguese, German, English, Spanish, Italian or a custom entry.
3. Choose **idea only**, **import a pre-recorded piece** or **record a microphone take directly** (browser HTTPS/localhost only). The working folder is generated automatically.
4. Song metadata (editable later): title, description, original language, BPM, key, time signature, instruments, and a unique rounded cover (image uploaded locally or credited URL).

## Main information architecture
### Chant entier
- Song-level metadata, instrument badges, and inspiration/description.
- **Multiple versions** (acoustic, live, piano/vocals, etc.), each with its own actual audio file or recording. The creator can check which versions to publish.
- Once authorized and with a final premixed recording for each checked version, publish the selected versions. The first is the root; subsequent versions are linked to the **same root track** in the API.
- Musical sections are ordered and can be added, deleted, reordered, and opened as tabs.
- Talent requests and musical-style badges; translator includes from/to languages and existing level scale.
- Working suggestions and owner review of real remote audio proposals.
- Private owner notes and a real server chat for accepted collaborators on published songs.

### Intro / Couplet / Refrain / Pont / etc.
Each section is a standalone sub-workspace with:
- **Lyrics per language**, original-language first, independently editable and optionally given a section template.
- Instrument badges specific to that section.
- Individual takes: named tracks, browser file import, actual browser mic recording, audio playback.
- Sheet music: locally attached PDF/image or external document URL.
- Arrangement notes.
- Proposed changes to a track, section, lyrics, or style (work-in-progress status, retained/archived).
- Comments and notes scoped to that musical part.
- These private notes/comments are not yet real-time collaborative server messages; do not imply they were delivered.

## Browser storage
- Workspace metadata uses IndexedDB on the web, with legacy AsyncStorage import/fallback. Avoid claiming persistent success when all browser storage is denied.
- Actual recorded/uploaded draft audio and section scores are kept in IndexedDB as binary objects; only their stable local IDs are kept in the project metadata. Blob URLs are ephemeral and not persisted.
- Native support still uses AsyncStorage for metadata and needs native file recording/picker integration.
- A browser that blocks both IndexedDB and AsyncStorage cannot guarantee durable drafts.
- Local drafts do NOT sync between devices or other members yet.

## Public upload and publication
- Publishing each selected version requires rights confirmation.
- Actual audio + artwork must complete the existing JenLow media-upload API (R2 or an explicitly attributed external URL).
- The backend enforces **publisher-only** secondary versions, preserves the original creator’s name, and links each to the first track in the family via original_track_id.
- Publication never overwrites a prior recording. Failure leaves remaining versions unmarked; completed versions retain their IDs.
- Music collaboration proposals sent by others remain server controlled, with owner accept/reject/publish.
- Saved/Fire, personal music and accepted collaborations remain independent navigation categories.

## Explicit limitations (must not be disguised)
- No automatic translation provider connected. Multiple-language lyric versions are manually editable.
- No automatically synchronized multitrack mixes. A song section may hold multiple takes, but publication requires an actual final mixed file per selected version.
- Private project structure/lyrics/score/section comments/needs aren't server synced, visible to collaborators or included in published streaming metadata yet.
- The backend supports credit-linked *owner-published* versions; true branched multi-person stem compositing and section-specific server proposal publishing need future backend changes.
- Actual web microphone recording uses MediaRecorder; native iOS/Android recording still needs dedicated implementation.
- The existing Unified API authentication and R2 bindings are required for uploading and publishing public versions. A Supabase-only session cannot silently upload.
- Audio playback and file access may differ on iOS/Safari; runtime device tests remain required.
- Code validation and Expo bundling do not prove production deployment or visual QA.

## Design bar
Use JenLow's warm editorial light palette + magenta, subtle rounded private objects and minimal headers; avoid giant administrative forms, a DAW clone, decorative waveforms, or duplicate cassettes in private work.


## 14 November — song view, file hierarchy and contextual chat redesign
- **New song:** no redundant descriptive paragraphs; display title, description, one compact original-language selector and three start methods. A blank idea no longer creates artificial Intro/Couplet/Refrain sections or duration.
- **Whole-song overview:** compact permanent key data: original language, BPM, tonal key/mode, time signature, real duration if known; style badges in the song identity, not incorrectly placed in “talents searched”.
- **Instruments:** summary is derived from actual track roles (and section parts) plus optional manual instruments — the user should not have to enter an instrument list separately from their recordings.
- **Structure near the top:** add/reorder/remove Intro/Couplet/Refrain/Pont/etc.; each entry navigates to its real sub-workspace. Duration is shown only from actual attached recording metadata or explicit valid start/end points, never for an empty idea.
- **File browser:** one indexed view of versions, recordings, lyrics, scores, documents, ideas and notes. New files can be explicitly typed, given language or instrument metadata, and associated with zero, one or multiple sections. An imported full lyric text stays intact; each linked section can hold its own excerpt in sectionContent.
- **Section workspace:** displays only associated lyrics excerpts and tracks/other files, a per-section talent request, and a contextual “Écrire au groupe” action. The section does **not** get a new independent group chat.
- **One song conversation:** published songs share the existing server conversation. New migration adds optional music-section-id and title to individual messages, and the chat displays a section tag. A click returns to the relevant local section when it is present on that device. Draft projects keep clearly labelled local notes, never misrepresented as messages delivered to other members.
- **Real recording metadata:** browser imports and microphone saves attempt to read the audio duration before attaching it to versions/tracks/files. Unknown duration is displayed as “—”.
- **Permissions:** only conversation members can send/read messages, and section-context metadata is valid only in a song text conversation. The server currently cannot validate section existence because section structure is stored locally.

### Still outside current implementation
The complete file structure, per-section proposals, lyrics and messages are **not yet synchronized between participants**. A collaborator without a corresponding local project can read a chat section label but cannot open that private section. There is no production-ready multiperson document collaboration or automatic mixing/translation yet. Published song versions and public song chat use the real existing API.
