# Applying the JenLow Network schema to Cloudflare D1

The production database already exists: **`network`**, id `62ca4199-a913-4444-b176-b5d18c8817d1`, used by the `jenlow-network-auth` Worker. Do not create a new one.

Run these from `middleware/` with `wrangler.toml` copied from `wrangler.toml.example` (it points `migrations_dir` at `../database/migrations`).

1. Back up: `npx wrangler d1 export network --remote --output backup-$(date +%F).sql`
2. See what Wrangler has recorded: `npx wrangler d1 migrations list network --remote`
3. **If 0001–0008 were applied by pasting SQL in the dashboard** (so `d1_migrations` is empty or partial), Wrangler would try to re-run them and fail on `CREATE TABLE`. Record them first:
   ```sh
   npx wrangler d1 execute network --remote --command "CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO d1_migrations(name) VALUES ('0001_identity.sql'),('0002_dreams.sql'),('0003_publications_media.sql'),('0004_collaboration_agenda.sql'),('0005_invariants.sql'),('0006_extensions_views.sql'),('0007_auth_sessions.sql'),('0008_email_password_beta.sql');"
   ```
   Only do this after confirming those tables exist (`SELECT name FROM sqlite_master WHERE type='table'`).
4. Rehearse locally: `npx wrangler d1 migrations apply network --local`
5. Apply: `npx wrangler d1 migrations apply network --remote` (0009–0011, additive).
6. Seed demo data: `npx wrangler d1 execute network --remote --file=../database/seeds/demo_seed.sql`
7. Verify: `curl …/api/health/ready` returns `"schema":"0011"`.

Installing tables alone enables nothing for members; the Worker in `middleware/` provides the API. Never expose D1 credentials to the frontend.
