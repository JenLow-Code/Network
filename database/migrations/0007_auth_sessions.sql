-- 0007 Authenticated sessions, rotate refresh tokens and protect public display
CREATE TABLE auth_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 refresh_token_hash TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT NOT NULL,
 revoked_at TEXT,
 last_used_at TEXT,
 client_type TEXT NOT NULL DEFAULT 'app' CHECK(client_type IN ('app','web'))
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id,revoked_at);
CREATE INDEX idx_auth_sessions_expiry ON auth_sessions(expires_at);
