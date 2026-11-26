-- Technical identity and authorization only. No operational profile fields.
CREATE TABLE IF NOT EXISTS product_profiles (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product TEXT NOT NULL CHECK(product IN ('network','tools','production','live')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','disabled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,product),
 UNIQUE(id,user_id,product)
);
CREATE TABLE IF NOT EXISTS product_role_grants (
 profile_id TEXT NOT NULL REFERENCES product_profiles(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('moderator','admin')),
 granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 PRIMARY KEY(profile_id,role)
);
CREATE TABLE IF NOT EXISTS provider_sessions (
 id TEXT PRIMARY KEY,
 provider_session_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 profile_id TEXT NOT NULL,
 product TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 last_activity_at INTEGER NOT NULL,
 verified_at INTEGER NOT NULL,
 revoked_at INTEGER,
 FOREIGN KEY(profile_id,user_id,product) REFERENCES product_profiles(id,user_id,product) ON DELETE CASCADE,
 UNIQUE(provider_session_id,product)
);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_user ON provider_sessions(user_id,product,revoked_at);
