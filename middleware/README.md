# JenLow security middleware

The active source is a TypeScript-only security foundation. Functional services are removed from this branch and preserved on the dedicated archive branch.

- authentication: password and Supabase identity routes.
- sessions: Network-scoped access tokens. Refresh and logout handlers currently in authentication/routes.ts.
- authorization: roles, resource ownership and relationship checks.
- privacy: visibility, blocking and consent.
- policies: product-specific permission checks, not CRUD or processing.
- security: request limits, validation, rate limiting and audit helpers.
- core: routing, D1 and configuration.

Run npm install, npm run typecheck, npm test, npm run bundle:check in middleware. Use a separate staging Worker and D1 test database. Never deploy this branch directly over the production Worker: feature routes intentionally return 404 and existing unlinked identities require a verified linking procedure. Product-scoped identity/profile storage and immediate JWT revocation are not yet implemented.
