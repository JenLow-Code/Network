-- 0002 · Dream ownership, states, membership, encouragement, needs & lineage.
CREATE TABLE dreams (
 id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK(length(trim(title))>0),
 summary TEXT NOT NULL DEFAULT '', cover_asset_key TEXT,
 phase TEXT NOT NULL DEFAULT 'dream' CHECK(phase IN ('dream','initiation','growth','testimony')),
 visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('private','members','public')),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 started_at TEXT, growing_at TEXT, completed_at TEXT, deleted_at TEXT,
 testimony_text TEXT, testimony_primary_asset_id TEXT,
 CHECK(phase <> 'testimony' OR (completed_at IS NOT NULL AND length(trim(coalesce(testimony_text,'')))>0))
);
CREATE INDEX idx_dreams_phase_visible ON dreams(phase,visibility,created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_dreams_creator ON dreams(created_by,created_at);
CREATE TABLE dream_owners (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 invited_by TEXT REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','removed')),
 invited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, accepted_at TEXT, removed_at TEXT,
 PRIMARY KEY(dream_id,user_id)
);
CREATE INDEX idx_dream_owners_user ON dream_owners(user_id,status);
CREATE TABLE dream_collaborators (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','offered','accepted','declined','removed')),
 role_title TEXT, invited_by TEXT REFERENCES users(id),
 accepted_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(dream_id,user_id)
);
CREATE INDEX idx_dream_collaborators_user ON dream_collaborators(user_id,status);
CREATE TABLE dream_same_dream (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(dream_id,user_id)
);
CREATE INDEX idx_same_dream_user ON dream_same_dream(user_id);
CREATE TABLE dream_encouragements (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(dream_id,user_id)
);
-- encouragement count: query only if requester is an accepted dream owner.
CREATE TABLE dream_needs (
 id TEXT PRIMARY KEY, dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 talent_id TEXT REFERENCES talents(id), label TEXT NOT NULL,
 slots_total INTEGER NOT NULL DEFAULT 1 CHECK(slots_total>0),
 slots_filled INTEGER NOT NULL DEFAULT 0 CHECK(slots_filled>=0 AND slots_filled<=slots_total),
 note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(dream_id,label)
);
CREATE INDEX idx_dream_needs_talent ON dream_needs(talent_id,dream_id);
CREATE TABLE dream_help_offers (
 id TEXT PRIMARY KEY, need_id TEXT NOT NULL REFERENCES dream_needs(id) ON DELETE CASCADE,
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 offered_by TEXT NOT NULL REFERENCES users(id),
 message TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','withdrawn')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, responded_at TEXT,
 UNIQUE(need_id,offered_by)
);
CREATE INDEX idx_help_offers_dream_status ON dream_help_offers(dream_id,status);
CREATE TABLE dream_entries (
 id TEXT PRIMARY KEY, dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES users(id),
 entry_type TEXT NOT NULL CHECK(entry_type IN ('note','addition','progress_comment','testimony')),
 body TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 edited_at TEXT, deleted_at TEXT
);
CREATE INDEX idx_dream_entries_dream ON dream_entries(dream_id,created_at);
CREATE TABLE dream_phase_history (
 id TEXT PRIMARY KEY, dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 from_phase TEXT CHECK(from_phase IN ('dream','initiation','growth','testimony')),
 to_phase TEXT NOT NULL CHECK(to_phase IN ('dream','initiation','growth','testimony')),
 changed_by TEXT NOT NULL REFERENCES users(id),
 changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reason TEXT
);
CREATE INDEX idx_dream_phase_history ON dream_phase_history(dream_id,changed_at);
CREATE TABLE dream_inspirations (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 publication_id TEXT NOT NULL,
 added_by TEXT NOT NULL REFERENCES users(id),
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(dream_id,publication_id)
);
CREATE INDEX idx_inspirations_publication ON dream_inspirations(publication_id);
CREATE TABLE dream_lineage (
 originating_dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 inspired_dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(originating_dream_id <> inspired_dream_id),
 PRIMARY KEY(originating_dream_id,inspired_dream_id)
);
CREATE INDEX idx_dream_lineage_child ON dream_lineage(inspired_dream_id);
-- The API must enforce immutable dream titles, phase-specific changes,
-- membership authorization, monotonic phases, last-owner protection,
-- phase-specific actions, and valid statuses.
