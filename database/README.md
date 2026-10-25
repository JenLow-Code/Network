# JenLow Network database — Cloudflare D1 / SQLite

This folder contains a six-migration, normalized V1 data model for JenLow Network. No production database has been created or modified.

## Migration map

1. Identity — users, login identities, talents, contacts, My Circle, consent, blocks and devices.
2. Dreams — owners/co-owners, collaborators, same-dream participants, private encouragements, needs, offers, phases, entries and inspiration lineage.
3. Publications — Bible editions and verses, music rights/credits, collaborator proposals, Fire/prayer saves, publication metadata, media in external object storage.
4. Communication — chats, trusted introductions, agenda, invitations, external calendars, notifications, reports and audit.
5. Invariants — title immutability, permitted phase transitions, entry types, copyright/owner republishing boundaries and introductions.
6. Extensions — Bible-app share intake, Circle-only video calls, ownership invitations, public Dream counters and feed views.

## Test

Run: python database/test_schema.py

The test uses local SQLite; it never connects to a live Cloudflare database. A GitHub Actions workflow is included. Confirm CI passed before executing any migration remotely.

## Architecture

- D1 is SQLite, not PostgreSQL. Media binaries go to R2; store references in D1.
- A Cloudflare Worker can use the D1 binding directly. Java Spring Boot would use a protected Worker API gateway or the D1 HTTP API, rather than standard PostgreSQL JDBC.
- Use opaque app-generated IDs. Validate ownership and authorization on the server, not solely in SQL.
- Only an accepted co-owner may edit a Dream. “Moi aussi” and collaborator roles are distinct. Encouragement count is private to owners, while same-dream count is public.
- Dream stage: dream -> initiation -> growth -> testimony. Titles are immutable.
- Video calls only among mutually accepted My Circle connections.
- Only Bible verses have an export workflow. Music adaptation proposals do not grant public download rights; all creators and contributors require proper legal attribution.
- External music needs source, rights and permission metadata, never a blanket assumption that a URL allows reproduction.
- Date-specific prayer saves and accepted agenda invitations are separate entities.
- Audit/retention, deletion, copyright enforcement, chat privacy, calendar OAuth and push scheduling require a backend.

## Later deployment (manual, not executed)

Configure a Worker with a D1 binding and its migrations_dir pointing to database/migrations. After creating or inspecting your D1 database:

npx wrangler d1 migrations apply jenlow-network --local

Only when reviewed and backed up:

npx wrangler d1 migrations apply jenlow-network --remote

Never commit real access credentials or member data. Migration SQL has no production sample users.
