# Decisions

Technical choices made during implementation, and product questions that remain open.
Open questions are marked **Open** and were resolved conservatively and reversibly.

## Identity and sessions
1. **One token issuer.** The API trusts only JenLow HS256 tokens (`iss jenlow-network-api`, `aud jenlow-network`), the ones the live beta Worker already issues. The unified Worker keeps the same name, URL, routes and response shapes, so the cutover is invisible to existing testers. Rollback: `wrangler rollback` or `wrangler.legacy.toml.example`.
2. **Frontend sign-in is left as it is on `main` (Supabase), by the owner's decision (3 Nov 2026)**, so testing is not interrupted. The API does not accept Supabase tokens, so the app currently calls it anonymously: public reads (Discovery, details, profiles) work; anything personal (own drafts, Fire, offers, messages) needs a JenLow token. **Open, later:** connect the two — either the app signs in through the Worker (`/v1/auth/*`, already live), or the Worker verifies Supabase tokens and maps them to a JenLow account. The API side is ready for the first option.
3. **`node:crypto` PBKDF2 + `nodejs_compat`.** Workers' WebCrypto refuses PBKDF2 above 100,000 iterations and existing hashes use 210,000. Same choice as the deployed script.
4. **Token storage (for when the app signs in to the API).** `frontend/src/lib/api/session.ts` keeps the access token in memory and the rotating refresh token in `sessionStorage` (web) or AsyncStorage (native; move to `expo-secure-store` in a future native build). Not active while sign-in stays on Supabase.
5. **Demo profiles never authenticate.** They stay `deactivated` with no credentials; `users.is_demo=1` lets their content appear in Discovery during the beta (`DISCOVERY_INCLUDE_DEMO`, default `true`).

## Dream phases
6. **Phase names.** Stored values stay `dream/initiation/growth/testimony` (no data rewrite, triggers untouched). The API exposes `semence/germination/croissance/floraison` plus a localized `phaseLabel`; it accepts all three vocabularies on input. Mapping lives only in `src/domain/phases.ts`.
7. **Semence → Germination** requires a cover image (the Dream becomes public and Discovery requires an image) and makes it public (or members-only on request), as the current UI's "Faire germer" confirmation says. A target date is **not** required here because the UI collects it in Germination.
8. **Germination → Croissance** is owner-confirmed (never automatic) and requires a valid target date and every **required** need fully confirmed. Needs default to required, matching the UI's "all resources confirmed" rule; optional needs (`isRequired:false`) never block. The Dream conversation is created in the same transaction, exactly once (deterministic id + unique index), with accepted owners (admins) and accepted collaborators — never "Moi aussi" participants.
9. **Croissance → Floraison** requires a non-empty story and at least one photograph; afterwards the story, result images, cover, target date and motivation are locked by triggers. No reverse transitions. **Open:** reopening overdue Dreams was mentioned historically; not built.
10. **Legacy Floraisons** (completed before 0009, no cover/result image) may receive one first image, once, so the 7 remote demo Floraisons can appear in Discovery. Their original testimony text stays locked; the richer demo story is attached as a public `testimony` journal entry.

## Editable fields (from `frontend/src/domain/dreamWorkspace.ts`)
| Field | Semence | Germination | Croissance | Floraison |
| --- | --- | --- | --- | --- |
| Title | never | never | never | never |
| Summary ("Mon but") | ✓ | — | — | — |
| Cover, motivation, target date, paused, category, visibility | ✓ | ✓ | ✓ | — |
| Needs (create/edit/delete) | ✓ | ✓ | ✓ | — |
| Semence studio blocks | ✓ | — | — | — |
| Notes | ✓ | ✓ | ✓ | — |
| Inspiration additions | ✓ | ✓ | — | — |
| Progress journal, habits | — | — | ✓ | — |

## Collaboration
11. **Needs and offers.** `slots_filled = manual_confirmed + accepted offers`, enforced by triggers. Accepting an offer fills a slot inside the database; the existing `CHECK(slots_filled<=slots_total)` aborts a second acceptance, so concurrency cannot overfill. Offers are accepted in Germination and Croissance (needs may be added in Croissance per the UI).
12. **Roles stay distinct.** An accepted helper becomes an accepted *collaborator* (credited with the need label), never an owner. Co-ownership requires an explicit invitation and acceptance. Only the creator removes co-owners; anyone can leave; a Dream always keeps one accepted owner. Deletion: creator, or the sole remaining owner.
13. **Visibility of internal content.** Semence studio blocks: owners only. Habits and milestones: owners and accepted collaborators. Journal entries carry their own visibility (`owners`, `participants`, `public`; progress entries default to public). Encouragement counts: accepted owners only, never returned to the encourager.
14. **Circle requires an existing contact** and reciprocal acceptance; contacts are never promoted automatically. **Open** if you prefer Circle invitations without a prior contact.
15. **Introductions** need the initiator and the introduced person to be in an accepted Circle, the Dream in Germination, and both the introduced person and the Dream creator to accept. The resulting group conversation includes all three. **Open:** whether the introducer should be in that conversation.
16. **Direct messages and internal shares** are limited to contacts or Circle members, to prevent unsolicited messaging.

## Content
17. **Talent is a publication type** (owner decision, 3 Nov 2026). Migration `0009` rebuilds `publications` to allow `type='talent'`; dependent rows (Fire saves, prayers, shares, Bible posts, music tracks and credits, message links) are copied aside and restored, so nothing is lost. The showcase detail lives in `talent_publications` (like `bible_posts`, `music_tracks`); one showcase per member talent, unpublish/publish toggles it. Fire, prayer, sharing, reports and moderation therefore work on talents exactly as on other publications.
18. **Action policy** mirrors `frontend/src/domain/publicationRules.ts` exactly (e.g. Fire is not offered on Germination Dreams). The server enforces it on every mutation. Semence includes "Moi aussi" because the brief places it in the Semence detail.
19. **Discovery ranking** is transparent reverse-chronological order. No engagement-based boosting.
20. **Fire vs prayer.** Fire uses `fire_saves`. Prayer uses the new `prayer_list` (start date + once/daily/weekly, exactly the UI model) — no fabricated dates. Dated, notifying reminders use the existing `prayer_saves` and are opt-in.
21. **Bible.** Only Louis Segond 1910 (public domain), Psalm 150, is seeded. Other editions require a licence (`import_allowed=1`); export only when `export_allowed=1`.
22. **Music.** Publishing requires an explicit rights confirmation; non-original work must name a source or permission. There is no download route. Only the original publisher can republish an accepted adaptation (API check + existing SQL trigger), and every original and proposal credit is copied. Withdrawal hides the track and closes open proposals. Demo audio uses `app-asset:<name>` references to clips bundled in the app.

## Platform
23. **Media.** Uploads are streamed through the Worker to R2 (no S3 credentials in clients), validated by declared size and magic bytes, and served through hour-aligned HMAC-signed URLs with Range support, always `Content-Disposition: inline`. Without an R2 binding, uploads answer 503.
24. **Realtime.** Polling (`/api/updates`, `?after=`). A Durable Object fan-out was not justified for the beta.
25. **Notifications** store a message key and parameters, rendered in the reader's locale (fr/en today; de/pt fall back to fr). Push and email are recorded as `not_configured`; push tokens are stored hashed only.
26. **Rate limits** reuse the D1 window table: auth (per IP), writes, social actions, reports, uploads, searches (per member). Anonymous reads are not D1-limited to avoid doubling D1 writes; use Cloudflare's edge rate limiting if scraping appears.
27. **Account deletion** deactivates immediately and revokes sessions/devices; erasure or anonymisation is an operator step. **Open (legal review):** retention periods and what to anonymise vs delete.
