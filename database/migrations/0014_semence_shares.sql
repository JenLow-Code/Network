-- 0014 · Explicitly published Semence inspiration snapshots.
-- Private notebooks are never stored in this table. A snapshot is not a Discovery item.
-- 'friends' means authenticated members with an accepted reciprocal Circle relation
-- or a confirmed contact; READ endpoints enforce this server-side.
CREATE TABLE semence_shares (
 id TEXT PRIMARY KEY,
 author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 source_local_id TEXT NOT NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 summary TEXT NOT NULL DEFAULT '' CHECK(length(summary)<=1500),
 cover_url TEXT,
 visibility TEXT NOT NULL CHECK(visibility IN ('public','friends')),
 blocks_json TEXT NOT NULL CHECK(json_valid(blocks_json)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TEXT
);
CREATE INDEX idx_semence_shares_author
 ON semence_shares(author_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_semence_shares_visibility
 ON semence_shares(visibility,created_at DESC) WHERE deleted_at IS NULL;
