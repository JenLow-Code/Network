# JenLow ecosystem security foundation

One ecosystem account with independent product profiles and authorization. The current code is Network-scoped; cross-product token issuance and profile storage are not implemented.

## Reset

Retired functional middleware code, tests, OMR and demo/scan Workers remain on archive/backend-before-reset-2026-11-24. They have been removed from this working branch. Frontend and database migrations/data remain untouched. The security branch deliberately serves only authentication, identity and health/documentation routes. Retired feature routes return 404.

Existing account IDs, password hashes and token audience are preserved. Other products need distinct token audiences, product-scoped roles and explicit access rules. Never share a signing secret between independent products.

## Release gates

- Typecheck, automated security tests, bundle check, staging login and authorization tests.
- Existing unlinked accounts require a trusted explicit linking procedure. Verify the admin account without changing its ownership or creating a duplicate.
- Validate Google, email, refresh, expiry, logout, suspension and actual CORS. Issued JWTs currently remain valid until expiry unless the account is disabled; immediate session revocation and the two-hour/seven-day policy require further implementation/verification.
- Extracted resource policies are conservative and incomplete for future operations. Shared media, group messaging, specialized music/talent visibility, invitation lifecycle, role scoping and cross-product access need explicit checks and positive/negative integration tests before enabling those endpoints.
- Staging requires a separate database and secrets. Do not deploy over a live functional API. The existing frontend expects retired functional endpoints; the isolated security Worker alone cannot replace the application.
- Authorization is enforced centrally for active routes. Future backends must independently authorize each resource and operation. No claim of total security is made.
