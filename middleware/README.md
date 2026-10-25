# JenLow Network — beta authentication Worker

## What is deployed
The **Cloudflare Workers Free** beta authentication Worker is implemented by `src/worker-runtime.js`, deployed as `jenlow-network-auth`.

Public endpoint: https://jenlow-network-auth.jenlow-production.workers.dev

- `GET /health`
- `POST /v1/auth/email/register` with `{displayName,email,password,inviteCode}` (12+ character password)
- `POST /v1/auth/email/login` with `{email,password}`
- `POST /v1/auth/refresh` with `{refreshToken}`
- `GET /v1/auth/me` with `Authorization: Bearer <accessToken>`
- `POST /v1/auth/logout` with `{refreshToken}`

Passwords are PBKDF2-HMAC-SHA256 salted hashes. Short-lived JWT access tokens and hashed, rotating refresh tokens are backed by D1. Per-IP application throttling protects signup and login. Registration requires a secret **beta invitation code**, provided to test users separately from GitHub.

## Not ready for public launch
- Email verification and password recovery need a transactional email provider. Arbitrary-recipient sending with Cloudflare Email Service requires Workers Paid as of October 2026. Beta accounts are not verified; do not use them as trusted contact identities yet.
- Native secure session persistence and token refreshing are not wired to the frontend: after page reload the tester may need to sign in again.
- Google/Apple OAuth in `src/index.ts` is a **separate incomplete future implementation**, NOT currently served by the deployed beta worker. Their buttons remain disabled.
- Account erasure, profile synchronization, Dreams, messages, calendar synchronization, server-side app authorization and anti-bot CAPTCHA remain future features.
- The ten mock accounts are **deactivated** and have **no passwords or related activity**. Their addresses use the reserved example.invalid domain.

## Deploying the same production script
Copy `wrangler.toml.example` to `wrangler.toml`, then configure the two secrets using `wrangler secret put AUTH_JWT_SECRET` and `wrangler secret put BETA_INVITE_CODE`. Never commit their values. Deploy `src/worker-runtime.js`, not the incomplete `src/index.ts` OAuth prototype.

When setting up real Google/Apple sign-in, merge their verified-token route into the same auth Worker and run an end-to-end security test before enabling buttons.

## Test phones
The web preview runs on https://network.jenlow-production.workers.dev/ (or network.jenlow.net once verified and routed). Sign up with a personal email, a unique 12+ character password, and the beta invitation code supplied privately by the project owner. Reload may require logging in again until session restoration is implemented.
