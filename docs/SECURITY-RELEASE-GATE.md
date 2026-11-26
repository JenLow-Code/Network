# Consolidated security release candidate

This branch integrates the security foundation with the currently accepted production frontend. The scanner and OMR service are independent runtime services and deliberately preserved with their regression tests. The existing deployed authentication Worker remains unchanged; its previous runtime source is retained until replacement and rollback are verified.

No production deployment or database migration is authorized by this branch. The production D1 inventory shows that the security readiness contract's user_roles table is absent; actual authenticated identity resolution requires that table. Do not invent roles or create the production table before Phase B approval. Resolve the authorization schema at the review boundary, then validate the candidate against isolated staging and preserve the existing login during cutover. Real Supabase authentication, session revocation and cross-product authorization remain explicit release gates.
