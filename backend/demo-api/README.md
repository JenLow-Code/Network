# JenLow Network · Demo API

Read-only demo users and dreams for design/integration testing.

## Endpoints
- `GET /api/demo/users` — 10 mock users, each with nested `dreams`.
- `GET /api/demo/users/demo-user-01` — one mock user and their dreams.
- `GET /api/demo/dreams` — flat list of mock dreams.
- `GET /api/demo/dreams?userId=demo-user-01` — one author's dreams.
- `GET /health` — D1 connectivity and demo user count.

Pagination: `?limit=10&offset=0`. No credentials needed: **these endpoints exclusively return fictional public data**. They do not expose email addresses or authentication data. Never generalize the read policy to real accounts.

## Architecture
- Cloudflare Worker `jenlow-network-demo-api`, TypeScript, D1 database `network`.
- Supabase remains responsible for authentication, as specified in `frontend/src/lib/supabaseClient.ts`.
- Database phases currently use `dream | initiation | growth | testimony`. The frontend editorial labels must be mapped deliberately rather than changing the persisted enum silently.
- Existing mock users `demo-user-01` through `demo-user-10` are reused; the SQL adds 30 fictional dreams.
- Seed SQL is idempotent, using known IDs and `INSERT OR IGNORE`.

## Reproduce
From `backend/demo-api` (with your Cloudflare account configured):
```sh
npx wrangler d1 execute network --remote --file=seed-demo.sql
npx wrangler deploy
```
**Important:** The remote D1 database is shared with the current network environment. Only seed this SQL against the intended account/database. Never use production email addresses or user login sessions for these mock profiles.

This API is intentionally isolated from the existing `network` frontend Worker and is not used for real-user authorization.
