# JenLow ecosystem security foundation — approved direction

One JenLow identity; independently activated product profiles for Network, Tools,
Production and future applications. Authentication does not implicitly activate a
product profile or confer rights to its resources.

## Layer boundaries

- frontend: presentation and interactions.
- middleware: authentication, sessions, authorization, privacy, resource policies,
  security controls and account identity. Shared across the ecosystem.
- backend: new functional services, organized by feature; no reuse of archived
  functional implementations as the design foundation.
- database: persistence, schema, constraints and triggers. No schema changes in this step.

Target middleware folders: authentication, sessions, authorization, privacy,
policies, security, core, tests. Existing path structure is retained temporarily
to avoid breaking the deployed login and to extract existing authorization safely.

## Identity and privacy design

- Supabase verifies the upstream identity; JenLow maintains a stable account ID.
- Each product has its own profile activation and product-scoped membership,
  roles, visibility, and consent. Cross-product data access is denied by default.
- Each product has a distinct token audience. Do not broaden the existing Network
  token audience or reuse a Network role in another product.
- Prefer a shared identity issuer with audience-scoped tokens and explicit
  resource authorization; do not share a signing secret across independent services.
- Backend must independently enforce middleware authorization at the operation and
  resource boundary. Network product policies remain product-specific.
- Only the identity and genuinely common security mechanisms become shared.
- Existing Network user IDs and data ownership remain stable. Profile migration
  and cross-product schema are a later decision; not implemented here.

## Retirement and release sequence

The pre-reset source snapshot is stored on archive/backend-before-reset-2026-11-24.
The working branch is refactor/ecosystem-security-foundation. Do not merge or
deploy until permissions embedded in functional routes have been extracted and
verified, existing frontend dependencies are accounted for, and security tests pass.
This first commit fixes the missing unified Supabase route and tightens token parsing.
No deployed Worker, database, or frontend is changed. Existing functional files
are still present pending safe extraction; they are not the new backend.

## Confirmed risks to resolve

- The legacy runtime links accounts solely on an email match. The new unified
  exchange denies unbound existing accounts with identity_link_required. Existing
  linked accounts keep their ID. A trusted, verified account linking/migration
  procedure and a real test with the existing admin account are required before
  switching runtime; no automatic account transfer.
- Existing access rules live in services/access.ts, domain/actions.ts, domain/phases.ts
  and inline in functional handlers, not only in a single middleware file. Inventory
  and extract permissions for aspirations, music, profiles, publications, agenda,
  messaging, media, blocking, and moderation before retiring those handlers.
- Router auth metadata is not itself an enforcement mechanism; ensure required
  routes are guarded centrally and independently at the resource boundary.
- Supabase egress, session expiry, logout/revocation, CORS, and real deployed
  configuration need live verification. No blanket security assurance is made.
