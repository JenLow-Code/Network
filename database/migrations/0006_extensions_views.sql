-- 0006 · External share inbox, collaboration permissions, video and derived counters.
CREATE TABLE external_share_intents (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content_type TEXT NOT NULL CHECK(content_type IN ('bible_verse','music_link')),
 source_app TEXT, source_uri TEXT, raw_text TEXT,
 resolved_publication_id TEXT REFERENCES publications(id),
 import_status TEXT NOT NULL DEFAULT 'pending' CHECK(import_status IN ('pending','resolved','rejected')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT
);
CREATE INDEX idx_external_share_user ON external_share_intents(user_id,import_status);

CREATE TABLE video_call_sessions (
 id TEXT PRIMARY KEY, initiated_by TEXT NOT NULL REFERENCES users(id),
 invited_user_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'inviting' CHECK(status IN ('inviting','accepted','declined','ended','missed')),
 started_at TEXT, ended_at TEXT, provider_room_ref TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(initiated_by <> invited_user_id)
);
CREATE INDEX idx_video_calls_user ON video_call_sessions(invited_user_id,created_at);
CREATE TRIGGER trg_call_circle_only
 BEFORE INSERT ON video_call_sessions
 WHEN NOT EXISTS(
  SELECT 1 FROM circle_members cm JOIN circle_requests cr ON cr.id=cm.circle_request_id
  WHERE cm.user_id=NEW.initiated_by AND cm.member_user_id=NEW.invited_user_id
  AND cr.status='accepted'
 )
 BEGIN SELECT RAISE(ABORT,'video calling requires accepted My Circle relationship'); END;

CREATE TABLE dream_owner_invitations (
 id TEXT PRIMARY KEY, dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 invited_by_user_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','revoked')),
 message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, answered_at TEXT,
 UNIQUE(dream_id,invited_user_id)
);
CREATE INDEX idx_owner_invitations_inbox ON dream_owner_invitations(invited_user_id,status);

CREATE VIEW v_dream_public_counts AS
 SELECT d.id AS dream_id,
   (SELECT count(*) FROM dream_same_dream m WHERE m.dream_id=d.id) AS same_dream_count,
   (SELECT count(*) FROM dream_lineage l WHERE l.originating_dream_id=d.id) AS inspired_dream_count
 FROM dreams d WHERE d.deleted_at IS NULL;
-- Deliberately NO encouragement counts in public view. Owner-only via API.
CREATE VIEW v_dream_needs_remaining AS
 SELECT dn.id AS need_id,dn.dream_id,dn.label,dn.talent_id,
 dn.slots_total-dn.slots_filled AS open_slots
 FROM dream_needs dn WHERE dn.slots_total>dn.slots_filled;
CREATE VIEW v_feed_publications AS
 SELECT p.id,p.type,p.author_id,p.dream_id,p.title,p.cover_asset_id,p.created_at
 FROM publications p WHERE p.visibility='public' AND p.deleted_at IS NULL;
