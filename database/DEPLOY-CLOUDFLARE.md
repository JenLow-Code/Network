# Installing the JenLow Network schema in Cloudflare D1

This repo does not contain credentials or a real D1 database UUID. Creating a database and applying migrations are separate actions. Use a NEW EMPTY D1 database for these initial migrations.

1. In Cloudflare Dashboard > Workers & Pages > D1 SQL database > Create database, name it jenlow-network.
2. Copy its Database ID from the D1 dashboard.
3. Copy database/wrangler.toml.example to database/wrangler.toml and replace REPLACE_WITH_REAL_D1_DATABASE_UUID with the ID. Do not commit this local configuration.
4. From the repository root in a terminal with Node.js available, run:
   npx wrangler login
   npx wrangler d1 migrations apply jenlow-network --config database/wrangler.toml --local
5. If the local migration passes, run:
   npx wrangler d1 migrations apply jenlow-network --config database/wrangler.toml --remote
6. Verify the installation:
   npx wrangler d1 execute jenlow-network --config database/wrangler.toml --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
7. View the tables in Cloudflare D1 dashboard and check d1_migrations has six rows.

If you lack a terminal, each migration may be pasted into the D1 SQL Console in order (0001 through 0006), but this bypasses Wrangler's migration tracking; prefer Wrangler to make future upgrades safer.

The frontend remains an independent demo. Installing SQL tables alone does NOT make Google/Apple login, data synchronization or account deletion functional. Do not bind D1 to the public frontend Worker unless it runs server-side trusted API endpoints. Never expose database credentials in browser code.

Caution: Initial migration files contain CREATE TABLE statements, not safe to blindly replay over populated tables. Backup first when updating production.
