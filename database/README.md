# JenLow Network database — Cloudflare D1 / SQLite

Database `network` (binding `DB`, id `62ca4199-a913-4444-b176-b5d18c8817d1`), shared by the API Worker in `middleware/`.

## Migrations
1. `0001` Identity — users, login identities, talents, contacts, My Circle, consent, blocks, devices.
2. `0002` Dreams — owners/co-owners, collaborators, "Moi aussi", private encouragements, needs, offers, phases, entries, lineage.
3. `0003` Publications — Bible editions and verses, music rights/credits/proposals, Fire and prayer saves, media metadata (binaries in R2).
4. `0004` Communication — chats, trusted introductions, agenda, calendars, notifications, reports, audit.
5. `0005` Invariants — immutable titles, forward-only phases, publisher-only reposts, dual-consent introductions.
6. `0006` Extensions — Bible-app share intake, Circle-only video calls, ownership invitations, public counters and feed views.
7. `0007` Auth sessions (rotating refresh tokens).
8. `0008` Email/password beta credentials and rate limits.
9. `0009` **Talent becomes a publication type.** Rebuilds `publications` (SQLite cannot change a `CHECK` in place) to allow `type='talent'` and add `moderation_hidden_at`. Every row that references a publication is copied aside and restored, so nothing is lost; each step keeps foreign keys consistent.
10. `0010` **Application API foundation** — demo flag, roles, Dream fields used by the UI (motivation, target date, cover, version), need categories/levels/confirmations, offer-driven slot counting, journal visibility, Semence blocks, habits, milestones, Dream media, talent showcase details (`talent_publications`), prayer list, Fire folders, idempotency keys, conversation/notification uniqueness. Replaces four triggers with rules matching the current UI (see `middleware/DECISIONS.md`).
11. `0011` Talent taxonomy (33 talents) and moderation visibility columns.
12. `0012` Bible reference data: 66 books and Louis Segond 1910 (public domain), Psalm 150 only.

`0010`–`0012` are additive (ADD COLUMN, new tables, indexes, triggers, reference rows). Back up before applying `0009` remotely (`wrangler d1 export`).

Phase values stay `dream → initiation → growth → testimony`; the API presents them as Semence → Germination → Croissance → Floraison.

## Seeds
`seeds/demo_seed.sql` — fictional demo dataset (10 deactivated profiles, 30 Dreams in all phases, needs filled through accepted offers, journals, talents, Bible and music posts). Generated from `middleware/scripts/demo-data.ts`; idempotent; touches only `demo-*` ids; never contains real people, emails or church affiliations.

## Tests
```sh
python database/test_schema.py   # all migrations, triggers, upgrade path, idempotent seed (local SQLite)
cd middleware && npm test        # API-level tests on the same migrations
```

## Applying (with Wrangler, from `middleware/`)
```sh
npx wrangler d1 export network --remote --output backup.sql   # back up first
npx wrangler d1 migrations list network --remote
npx wrangler d1 migrations apply network --local               # rehearse locally
npx wrangler d1 migrations apply network --remote
npx wrangler d1 execute network --remote --file=../database/seeds/demo_seed.sql
```
Never commit credentials or member data.

## Importing more Scripture
Only import editions whose licence allows it. Insert the edition with `import_allowed=1` (and `export_allowed` per licence), then its verses into `bible_verses (edition_id, book_id, chapter, verse, text)`.
