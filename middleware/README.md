# JenLow Network — API Worker

One Cloudflare Worker (TypeScript) on the existing D1 database `network`:

- `/v1/auth/*` — the beta email/password authentication, **same contract** as the deployed `worker-runtime.js` (same routes, payloads, `{ "error": "code" }` responses, tokens and sessions).
- `/api/*` — the application API: Dreams and their phases, needs and offers, roles, Discovery, Bible, Music, Talents, Fire and prayer, profiles, contacts and My Circle, introductions, messaging, agenda, notifications, media, moderation, privacy.
- a cron job (every 15 min) for prayer reminders, scheduled notifications and housekeeping.

Status of every feature: [`FEATURE_MATRIX.md`](FEATURE_MATRIX.md). Choices and open questions: [`DECISIONS.md`](DECISIONS.md). Audit: [`CURRENT_STATE.md`](CURRENT_STATE.md). Endpoint guide: [`docs/API.md`](docs/API.md) and [`docs/openapi.json`](docs/openapi.json) (also served at `GET /api/openapi.json`).

> **Not deployed yet.** Everything below was run locally against SQLite with all migrations; nothing has been deployed to Cloudflare from this repository.

## Layout
```text
src/index.ts            Worker entry (fetch + scheduled)
src/app.ts              routing, CORS, request ids, error envelope
src/auth/               token signing/verification, PBKDF2, /v1/auth routes (port of worker-runtime.js)
src/http/               context, router, validation, cursors, rate limits, errors
src/domain/             phases, talent levels, action policy (pure)
src/services/           access control, feed read models, Dreams, notifications, idempotency
src/modules/            route groups: dreams, publications, talents, music, bible, social, messaging, agenda, …
src/contracts/dto.ts    response types shared with the frontend adapter
src/jobs/scheduled.ts   cron work
src/worker-runtime.js   the currently deployed beta auth script (kept for rollback and interop tests)
legacy/                 the earlier, never-deployed OAuth prototype (unchanged)
test/                   62 integration + unit tests (node:test, D1-compatible SQLite adapter)
scripts/                demo seed generator, OpenAPI writer, route coverage report
```

## Commands
```sh
cd middleware
npm install
npm run typecheck        # Worker (no Node types) + tests
npm test                 # all migrations on in-memory SQLite, HTTP-level tests
npm run coverage:routes  # after npm test: writes docs/ROUTE_COVERAGE.md
npm run bundle:check     # esbuild bundle as Cloudflare ESM (node:crypto external)
npm run seed:sql         # regenerate database/seeds/demo_seed.sql from scripts/demo-data.ts
npm run openapi          # regenerate docs/openapi.json from the route table
```
Results in this repository: 62/62 tests pass; 218/218 operations have a tested success path.

## Local development with Wrangler
```sh
cp wrangler.toml.example wrangler.toml
printf 'AUTH_JWT_SECRET="%s"\nBETA_INVITE_CODE="local-invite"\n' "$(openssl rand -hex 32)" > .dev.vars
npm run db:migrate:local      # wrangler d1 migrations apply network --local
npm run db:seed:local         # demo data (idempotent)
npm run dev                   # http://localhost:8787
```
Point the app at it with `EXPO_PUBLIC_API_URL=http://localhost:8787` (add the web origin to `ALLOWED_ORIGIN`).

## Deploying (staged)
Secrets are set once per Worker and never committed:
```sh
npx wrangler secret put AUTH_JWT_SECRET      # keep the SAME value as today, or all sessions end
npx wrangler secret put BETA_INVITE_CODE
npx wrangler secret put MEDIA_SIGNING_SECRET # optional, otherwise AUTH_JWT_SECRET signs media URLs
```
1. **Back up D1:** `npx wrangler d1 export network --remote --output backup-$(date +%F).sql`.
2. **Check which migrations are applied:** `npx wrangler d1 migrations list network --remote`. If 0001–0008 were pasted into the console instead of applied with Wrangler, record them in `d1_migrations` before continuing (see `database/DEPLOY-CLOUDFLARE.md`).
3. **Apply 0009–0011:** `npm run db:migrate:remote`. They only add columns, tables, indexes and triggers.
4. **Seed demo data:** `npm run db:seed:remote` (touches only `demo-*` rows; safe to repeat).
5. **Optional media:** `npx wrangler r2 bucket create jenlow-network-media`, then uncomment `[[r2_buckets]]`.
6. **Deploy:** `npm run deploy:dry-run`, then `npm run deploy`. Same Worker name → same URL, accounts and tokens.
7. **Smoke test:** `/health` (`{"status":"ok","auth":"email-beta"}`), `/api/health/ready` (`"schema":"0011"`), `/api/discovery`, the existing *Production Auth Smoke Test* workflow.
8. **Then** deploy the frontend: Discovery now needs `/api/discovery` and shows a retry message if the API is missing.

**Rollback:** `npx wrangler rollback`, or deploy `wrangler.legacy.toml.example` (the previous script). Migrations 0009–0011 are additive; the old script ignores the new columns and tables. The old demo Worker can stay deployed; `/api/demo/*` here serves the same contract.

## Cost and external providers
Fits the Workers Free plan (one Worker, D1, cron triggers; R2 free tier: 10 GB, no egress fees). The `nodejs_compat` flag is required. Not configured, by design, until you choose a provider: push notifications (APNs/FCM/Expo), transactional email (verification, password reset), Google/Apple sign-in, Google/Outlook calendar sync, video-call media (e.g. Cloudflare Calls). The API reports these as `not_configured` instead of pretending.

## Operator tasks
- Grant moderation: `INSERT INTO user_roles(user_id, role) VALUES ('<id>', 'moderator');`
- Complete an account erasure after a deletion request: users in `account_status='deleting'`; anonymise or delete per your retention policy (legal review pending, `DECISIONS.md` §27).
