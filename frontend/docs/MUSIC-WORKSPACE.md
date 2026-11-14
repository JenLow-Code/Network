# JenLow Music — working folder architecture (14 November 2026)

## Non-negotiable product direction

**A song is a creation workspace first, a public music publication second.**

- **Private and shared workspaces** show **rounded** creative folders/cards; they must **not** display cassette imagery.
- **Public discovery and public published song detail** retain the approved JenLow cassette artwork and square-corner publication treatment.
- A song folder can organize: title, cover, multilingual lyrics, a lyrics template, song sections, individual audio stems, requests for specific talents and proposed musical styles, collaboration proposals (whole song or one section), and an attached project discussion.
- Users must distinguish **my original songs**, **songs I collaborate on but do not own**, and **saved or bookmarked music from others**.
- Derivative releases must preserve original attribution and credits. Nothing replaces the original recording.
- Avoid public comments, popularity competitions, payments, generic Spotify-style streaming UI, AI-generated creative content, or mixing private and public objects.
- The wider music design continues to be human-first, collaborative and supportive.

## Implemented in this iteration

1. Music landing view with tabs for personal pieces, accepted collaborations, saved music, and public discovery.
2. Durable private local-first folders keyed by the user's account email (or guest storage).
3. Editable sections, lyrics in multiple manually maintained languages, and a supplied lyrics outline template.
4. Named individual audio tracks; external HTTPS references and real R2 imports on the web when unified API auth and R2 are connected. Stable media IDs are stored rather than expiring signed URLs.
5. A separate final mix requirement and rights acknowledgement before attempting server publication.
6. Talent requests (five-level selector), translator direction, and musical style tags.
7. Local proposal notes for stems, section edits, lyrics and style; integrate/archive/restore local states.
8. Server-backed audio proposals for public music, including credits, accept/reject/publish owner actions.
9. Automatically created group conversation for newly published songs. Legacy songs initialize the conversation on first authorized open. Original publisher and accepted collaborators can use the group chat; pending proposers cannot.
10. Local, clearly designated private notes in a draft's Discussion tab, separate from online group chat.
11. A shared collaboration folder accessible after acceptance, containing available published information, contributions and server chat.

## Current technical boundaries — do not misrepresent

- The local private folder is stored on the **current device only** in AsyncStorage. Private lyrics, structure, stems, talent/style needs, and informal proposal notes are **not yet synchronized** with the server.
- Existing public music publication uses the server's **single rendered audio master**, not a mixer of independent stems. The user must provide a ready mix. No client-side multitrack rendering is claimed.
- Real file upload requires the unified JenLow API access token and configured R2. Supabase-only frontend login does not suffice until authentication is unified.
- The original server proposal endpoint accepts audio adaptations; text-only and section-scoped collaboration proposals require backend extensions.
- Translation is **manual** for now. Do not invent an automatic translation result or imply a service is connected.
- Shared workspace metadata for accepted collaborators is currently limited to material supported by existing public APIs and actual chat. Full private folder sync and permissions are future work.
- The published song's public lyrics cannot yet represent the full multilingual local lyric library without a backend schema/API change.
- The displayed cassette in public music remains independent of the rounded private folder.
- No public download button for songs.

## Next engineering milestones

- Server-side persistent projects with privacy/roles: owner, accepted collaborator and listener.
- Per-section and per-track proposal models with accepted/rejected/archived states (real data), including score/lyrics/style changes and audit trails.
- Multitrack storage and preview/safe final mix rendering, linked to version lineage.
- Rich multilingual lyric versions, provenance/source text, human review and opt-in translation provider.
- Publish and synchronize collaboration and style invitations into the real Discovery/Talents matching flow.
- Enforce permissions and credits when creating branching derivative versions.
- Account/session unification, comprehensive mobile-native file picking and real collaborative tests.

## Developer rule

Never claim a local note or local proposal was sent to another person. Never display a fake track as uploaded or a song as published until the server confirms it.
