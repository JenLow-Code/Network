# JenLow security middleware
Security-only staging foundation. Functional code has been removed from this branch and archived separately. Never deploy over the live API. Existing user IDs, login and Network-scoped token contracts are preserved. No cross-product profile storage or token issuance has been implemented.
Run npm install, npm run typecheck, npm test, npm run bundle:check. Use an isolated staging Worker and database. Existing unlinked accounts require trusted linking and real login verification.
