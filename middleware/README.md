# JenLow Network authentication Worker

Authentication API starter for Cloudflare D1. Endpoints:
- POST /v1/auth/exchange {provider:"google"|"apple",idToken,nonce?}: verifies provider-signed OIDC JWT via Google/Apple JWKS, issuer, audience, expiry; creates account on first verified sign-in
- POST /v1/auth/refresh {refreshToken}: rotates hashed opaque refresh token
- POST /v1/auth/logout {refreshToken}
- GET /v1/auth/me with bearer token
- POST /v1/account/deletion-request with bearer token (deactivates account, revokes sessions; **not complete data erasure**)
- GET /v1/dreams/:id/participants: only an accepted Dream owner can retrieve identities of members who said "Moi aussi"
- GET /health

Configuration:
1. Copy wrangler.toml.example to wrangler.toml and add actual D1 UUID.
2. Set GOOGLE_CLIENT_IDS and APPLE_CLIENT_IDS to comma-separated *public OAuth client IDs* from provider portals.
3. Set secret: npx wrangler secret put AUTH_JWT_SECRET (>=32 random chars).
4. Apply D1 migrations 0001-0007 **before** deploy.
5. npm install && npm run typecheck && npm run deploy from middleware directory.
6. Native app must acquire idToken using approved Google/Apple sign-in SDK or AuthSession with correct audience, then exchange through HTTPS and store refresh token in device secure storage, not AsyncStorage.

Security notes: no email-password login; email field in current frontend is demo only. OAuth buttons are placeholders until native provider IDs, mobile redirects, and SDK acquisition are integrated. Do NOT ship a fake login as actual security. D1 auth requires server-side binding, never expose DB/token secrets to browsers. TLS, rate limiting (WAF), privacy notices, user blocking and account erasure workflows remain deployment tasks. Ensure the configured origin is the only web client origin; native clients have no Origin header. Refresh replay beyond single token rotation is not a full device/session risk engine. Account deletion endpoint is a deactivation request, not irreversible data purging.
