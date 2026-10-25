-- 0008: password authentication for a closed, invitation-code beta.
-- Passwords must be derived with PBKDF2-HMAC-SHA256, per-user 16-byte random salts.
-- Secrets/access codes never stored in this migration or client bundle.
CREATE TABLE email_password_credentials (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 password_iterations INTEGER NOT NULL CHECK(password_iterations BETWEEN 100000 AND 2000000),
 algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256' CHECK(algorithm='pbkdf2-sha256'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE auth_rate_limits (
 throttle_key TEXT PRIMARY KEY,
 attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 window_start INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_rate_expiry ON auth_rate_limits(expires_at);
