# JenLow Network — current state (audit of 3 November 2026)

Audit of `main` at `07c54d9` before this work, plus what changed. Statuses are what was
observed, not what earlier notes claimed.

## Before this work

| Area | Observed state |
| --- | --- |
| `frontend/` | Expo SDK 58 / Expo Router app, ~10k lines. **Every screen reads `src/mocks/*` or device-local AsyncStorage.** Discovery, Dream detail, profiles, Fire, prayers, agenda, chat, Circle, music, Bible: local demo data only. |
| Frontend auth | `app/login.tsx` → `AuthProvider` → **Supabase Auth** (email + Google). The invite-code field was collected but never sent. `src/lib/authApi.ts` (Cloudflare Worker client) existed but was unused. |
| `middleware/src/worker-runtime.js` | **Live** as `jenlow-network-auth` (`GET /health` → `{"status":"ok","auth":"email-beta"}`, checked 3 Nov via web fetch). Email/password beta auth: PBKDF2-SHA256 ×210,000 via `node:crypto`, HS256 15-min JWT, rotating refresh tokens in D1, per-IP throttling, invite code. |
| `middleware/src/index.ts` | Unfinished Google/Apple OAuth prototype (jose). Not deployed. Its WebCrypto PBKDF2 path cannot verify 210,000-iteration hashes on Workers (100,000 cap). |
| Demo API | **Live** as `jenlow-network-demo-api` (`/health` → 10 demo users). Code only on unmerged branch `feature/network-demo-api-20261101` (`backend/demo-api/`). Not used by the frontend on `main`. |
| Remote D1 `network` (`62ca4199-…`) | Holds `demo-user-01…10` (handles `mock01…mock10`, deactivated, no credentials) and 30 `demo-dream-XX-Y` rows (verified through the demo API). No publications for them. Applied migration list could not be read from this environment (no Cloudflare credentials). |
| `database/` | 8 migrations, 58 tables, 12 triggers, 3 views; `test_schema.py` in CI. |
| CI | Middleware typecheck only (no tests); D1 schema check; frontend typecheck + Expo export; live auth smoke test. |
| Other branches | `design/discovery-editorial-cards-20261028`, `fix/dream-detail-readability-20261030` are fully merged; `feature/biro-script-local-preview` is behind `main`. |
| Repo oddity | `Network-editorial` is a gitlink (submodule entry) with no `.gitmodules`. Left untouched. |

### Schema rules that contradicted the current UI
- `trg_dream_needs_locked_update` blocked **every** update to `dream_needs` after Semence, so an accepted helper could never fill a slot in Germination.
- `trg_dream_core_immutable_after_start` froze the cover after Semence; the UI allows cover changes until Floraison.
- `trg_dream_entries_by_phase` forbade owner notes during Croissance; the UI allows them.
- `publications.type` only allows `dream|bible|music`, but the UI shows Talent cards. Widening the `CHECK` needs a table rebuild, which in D1 (foreign keys always on) would cascade-delete Fire saves, Bible posts and music tracks.

## After this work

| Area | State | Evidence |
| --- | --- | --- |
| Unified Worker (`middleware/src/index.ts`) | `/health`, 7 `/v1/*` (5 unchanged auth routes + 2 legacy aliases), 210 `/api/*` operations, cron | 62 automated tests; all 218 operations have a tested success path (`docs/ROUTE_COVERAGE.md`) |
| Auth compatibility | Accounts, hashes, tokens and refresh rotation interoperate with the deployed `worker-runtime.js` | `test/auth.test.ts` runs both implementations on one database |
| Migrations | `0009`–`0011` additive; fresh install and upgrade from the reproduced remote state pass | `test/migrations.test.ts`, `database/test_schema.py` |
| Demo data | `database/seeds/demo_seed.sql`, reuses remote IDs, idempotent | seeded twice in tests with identical counts |
| Frontend | Auth, session restore, Discovery, Dream/Music/Talent/Bible details and public profiles read the API; other screens unchanged (local demo) | Stub-typechecked only (npm registry unavailable here); see `FEATURE_MATRIX.md` |
| Deployment | **Not deployed.** No Cloudflare credentials in this environment. | — |
| Push to `main` | **Not pushed.** GitHub was not linked for the session; commits are local. | — |
