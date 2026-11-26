-- Additive security-only remediation for production databases still at migration 0008.
-- This is deliberately outside the operational migration chain. Reconcile with
-- 0010_app_api_foundation.sql in Phase B; do not mark that migration as applied.
-- No roles are assigned implicitly, including accounts named admin.
CREATE TABLE IF NOT EXISTS user_roles (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('moderator','admin')),
 granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 granted_by TEXT,
 PRIMARY KEY(user_id,role)
);
