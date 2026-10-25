# Deferred — JenLow Tools / music learning

Idea to revisit *after* Network V1 and backend:
- Stem separation / isolation (guitar, voice, bass, drums, etc.) to learn parts of a shared song.
- When an original music publisher chooses to repost an attributed collaboration, the UI can show relevant Tools recommendations (e.g., isolate guitar part, tempo slow-down) without obstructing the music itself.
- No such tools, stem processing or automatic reposting are implemented in V1.
- Research licensing, source rights, consent for processing, storage costs and audio quality before building.


## V1 collaboration access without a public download button

A public published song has no download control, but collaborators still need access to hear the original while recording their own part. Proposed V1:
1. Stream original audio to the browser/app player (access-controlled where appropriate).
2. Record a **separate** new part locally using microphone permissions, while listening with headphones; or upload the contributor's own recording.
3. Send audio as an adaptation proposal with required composer/performer/source credits.
4. Original publisher previews both layers in sync and decides whether to repost; all collaborator credits must remain attached.
5. No public master-file export/download in V1. The backend must authorize music asset access, retention and removals.
6. Warn about latency: browser playback and recording may not align precisely; a basic offset/trim tool would help, with professional online multitrack editing deferred.

**Important:** any audio that can be streamed can in principle be captured. Removing download buttons discourages downloading but does not provide effective copy protection. Don't promise that the system makes music impossible to download. Rights statements/consent remain necessary.

Planning Center integration with Services/Music Stand is only a future research option; not a current API integration or capability claim.
