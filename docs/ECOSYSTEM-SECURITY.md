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

## Production bridge remediation

Production D1 had zero legacy credentials and zero active legacy sessions; the admin was already linked to Supabase and active. A narrowly scoped version of the existing live Worker was uploaded with strict inheritance of the existing bindings (5c8986f4-35a0-452d-8144-e583b532ea51). It retires custom password/register/refresh/logout routes (410), rejects email-only account linking and rate-limits Supabase exchange. It is not the full rewritten TypeScript middleware. The existing Google project and redirect configuration remain unchanged. Preview smoke tests are required before promoting. Real sign-in and broader session/security acceptance remain required.

The preview HTTP smoke passed (run 45445006789), and the hotfix was promoted to 100% production traffic. Previous rollback version: 5c99d936-d4c3-4306-97b5-cb8391240dc4. This is a narrow runtime hotfix, not deployment of the rewritten middleware. Production smoke and valid-user login verification remain required.
