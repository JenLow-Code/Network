# Production Supabase → JenLow authentication bridge

## What this release does

The existing `jenlow-network-auth` Worker is the **only** target. Its
`src/worker-runtime.js` now exposes:

`POST /v1/auth/supabase/exchange` with header
`Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`.

It calls Supabase Auth `/auth/v1/user` server-side and accepts only a
non-anonymous user with a verified **email**. It looks up the unique
`auth_identities(provider='oidc',provider_subject='supabase:<uuid>')`
binding, links an existing user by the same verified email, or creates a
new user and preferences. It verifies the final mapping before returning
a 15-minute JenLow access JWT. It **never** stores a second refresh token
or changes existing passwords and account relationships.

The current production D1 database already has `users`,
`user_preferences` and `auth_identities`. **Do not apply 0009–0012
migrations or deploy the whole unified API for this change.**

## Deployment safeguards

- Keep the same Worker name and database ID.
- Preserve the **existing** `AUTH_JWT_SECRET` and `BETA_INVITE_CODE`.
  Never overwrite or rotate them just to roll out this endpoint.
- Keep the Worker `nodejs_compat` flag and compatibility date.
- Use the existing frontend Supabase project. The publishable key is a
  public config value and may be set as Worker
  `SUPABASE_PUBLISHABLE_KEY` for rotation; its current value is included
  as a **public fallback** in the Worker source.
- The deployment must **not** accidentally remove D1 and secret bindings.
- Back up the previous Worker version ID. Versions expire unless active,
  so do not assume long-term rollback is available.
- A production authentication request must never be sent to a demo
  endpoint or fall back to an anonymous account.

## Release procedure (from a Cloudflare-authenticated workstation)

```sh
git checkout main
cd middleware
npm install
cp wrangler.legacy.toml.example wrangler.legacy.toml
# Compile before upload, without changing the deployed Worker.
npx wrangler deploy --config wrangler.legacy.toml --dry-run --keep-vars
# Stage a new version WITHOUT deploying it.
npx wrangler versions upload --config wrangler.legacy.toml --keep-vars --strict --message "Supabase verified identity bridge"
```

The legacy config uses the existing Worker name, existing DB binding,
existing CORS origin, and `nodejs_compat`. Inspect the staged version
in the Cloudflare dashboard or:

```sh
npx wrangler versions view <NEW_VERSION_ID> --name jenlow-network-auth
npx wrangler deployments list --name jenlow-network-auth
```

Confirm the four existing bindings still exist:
`AUTH_JWT_SECRET` (secret),
`BETA_INVITE_CODE` (secret),
`DB` (D1), and `ALLOWED_ORIGIN` (plain text).

Then deploy the inspected version, retaining the previous version ID
for rollback:

```sh
npx wrangler versions deploy <NEW_VERSION_ID>@100% --name jenlow-network-auth -y
```

To revert without rolling back D1:

```sh
npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100% --name jenlow-network-auth -y
```

## Tests before calling the release complete

1. `GET /health` returns status `ok`, and anonymous `GET /v1/auth/me`
   returns **401**.
2. Anonymous `POST /v1/auth/supabase/exchange` returns **401**.
3. A forged bearer returns **401**; a valid Supabase token from a
   **confirmed email** returns **200** and a short-lived JenLow JWT.
4. That returned JWT succeeds at `GET /v1/auth/me` and reports the
   same verified email and `active` account.
5. Repeat login with the same Supabase user: same JenLow member ID,
   no duplicated user, existing aspirations and music ownership intact.
6. Suspended/deactivated users are denied, even when Supabase login
   is valid. An invalid/expired token is denied and cannot access
   Discovery.
7. Browser: signed out direct link to `/discover` opens **Login**.
   Signed in with a valid linked account: opens Discovery after both
   checks, with no extra password prompt.
8. Re-test the two-hour trust check, seven-day inactivity policy, and
   CORS from `https://network.jenlow.net`.

The existing `Production Auth Smoke Test` also tests old
email/password login. At the time this bridge was prepared, the live
Worker returned `503 password_auth_unavailable` for that separate
legacy route (instead of the test's expected 401 for an unknown email).
Do **not** hide or misrepresent that outstanding issue as a bridge
test failure/success.

## Scope limitations

This only connects Supabase login to JenLow's identity and legacy auth
token issuer. The current legacy Worker still does **not** serve the
unified `/api/*` application routes. Their future migration, backend
authorization of private posts, media, music and messages require their
own verified release. A successful bridge test does **not** prove those
resources are protected.
