-- 0010 · Application API foundation (additive; no table rebuilds, no data rewrites).
--
-- Every change below is ADD COLUMN, new table, new index, or a trigger replaced by a more
-- precise one. (The one table rebuild, `publications`, is isolated in 0009.)
--
-- Phase codes stay as stored ('dream','initiation','growth','testimony'). The API maps
-- them to semence / germination / croissance / floraison (middleware/src/domain/phases.ts).

------------------------------------------------------------------------------------------
-- Identity, roles, preferences
------------------------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1));
ALTER TABLE users ADD COLUMN featured_publication_id TEXT REFERENCES publications(id);
ALTER TABLE users ADD COLUMN avatar_media_id TEXT REFERENCES media_assets(id);
CREATE INDEX idx_users_demo ON users(is_demo) WHERE is_demo=1;

ALTER TABLE user_preferences ADD COLUMN appearance TEXT NOT NULL DEFAULT 'system'
  CHECK(appearance IN ('system','light','dark'));
ALTER TABLE user_preferences ADD COLUMN notification_opt_outs TEXT NOT NULL DEFAULT '[]'
  CHECK(json_valid(notification_opt_outs));
ALTER TABLE user_preferences ADD COLUMN quiet_hours_start TEXT
  CHECK(quiet_hours_start IS NULL OR quiet_hours_start GLOB '[0-2][0-9]:[0-5][0-9]');
ALTER TABLE user_preferences ADD COLUMN quiet_hours_end TEXT
  CHECK(quiet_hours_end IS NULL OR quiet_hours_end GLOB '[0-2][0-9]:[0-5][0-9]');

-- Moderation/admin roles are granted by operators in SQL only, never through the API.
CREATE TABLE user_roles (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('moderator','admin')),
 granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 granted_by TEXT,
 PRIMARY KEY(user_id,role)
);

CREATE INDEX idx_user_blocks_reverse ON user_blocks(blocked_id,blocker_id);

------------------------------------------------------------------------------------------
-- Media metadata (binaries live in R2 or an attributed external URL)
------------------------------------------------------------------------------------------
ALTER TABLE media_assets ADD COLUMN purpose TEXT CHECK(purpose IS NULL OR purpose IN (
 'avatar','dream_cover','dream_gallery','dream_result','dream_block','music_audio','music_cover',
 'music_proposal','talent_sample','bible_image','message_attachment'));
ALTER TABLE media_assets ADD COLUMN attribution TEXT;
ALTER TABLE media_assets ADD COLUMN source_name TEXT;
ALTER TABLE media_assets ADD COLUMN original_filename TEXT;
ALTER TABLE media_assets ADD COLUMN upload_expires_at TEXT;
CREATE INDEX idx_media_pending ON media_assets(storage_status,upload_expires_at) WHERE storage_status='pending';

------------------------------------------------------------------------------------------
-- Dreams: fields used by the current UI
------------------------------------------------------------------------------------------
ALTER TABLE dreams ADD COLUMN motivation TEXT;
ALTER TABLE dreams ADD COLUMN goal_date TEXT
  CHECK(goal_date IS NULL OR goal_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]');
ALTER TABLE dreams ADD COLUMN paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1));
ALTER TABLE dreams ADD COLUMN category TEXT;
ALTER TABLE dreams ADD COLUMN cover_media_id TEXT REFERENCES media_assets(id);
ALTER TABLE dreams ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1);

-- A Dream's publication (read model for Discovery/profiles) always mirrors the Dream's
-- visibility and deletion, so a private or deleted Dream can never linger in a feed.
CREATE TRIGGER trg_dream_publication_visibility
 AFTER UPDATE OF visibility ON dreams
 WHEN NEW.visibility <> OLD.visibility
 BEGIN UPDATE publications SET visibility=NEW.visibility, updated_at=CURRENT_TIMESTAMP WHERE dream_id=NEW.id AND type='dream'; END;
CREATE TRIGGER trg_dream_publication_deleted
 AFTER UPDATE OF deleted_at ON dreams
 WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
 BEGIN UPDATE publications SET deleted_at=NEW.deleted_at, updated_at=CURRENT_TIMESTAMP WHERE dream_id=NEW.id AND deleted_at IS NULL; END;

-- Replace the blanket "summary + cover frozen after Semence" rule with the rules the
-- current UI implements (frontend/src/domain/dreamWorkspace.ts canEditField):
--   summary: editable in Semence only · cover: editable until Floraison · Floraison result frozen.
DROP TRIGGER trg_dream_core_immutable_after_start;
CREATE TRIGGER trg_dream_summary_locked_after_semence
 BEFORE UPDATE OF summary ON dreams
 WHEN OLD.phase <> 'dream' AND NEW.summary <> OLD.summary
 BEGIN SELECT RAISE(ABORT,'Dream summary locked after Semence'); END;
-- A Floraison's existing cover and result image never change. Rows completed before this
-- migration (no cover/result image recorded) may receive one first image, once.
CREATE TRIGGER trg_dream_cover_locked_in_floraison
 BEFORE UPDATE OF cover_asset_key,cover_media_id ON dreams
 WHEN OLD.phase='testimony'
  AND coalesce(OLD.cover_media_id,OLD.cover_asset_key) IS NOT NULL
  AND (coalesce(NEW.cover_asset_key,'') <> coalesce(OLD.cover_asset_key,'') OR
       coalesce(NEW.cover_media_id,'') <> coalesce(OLD.cover_media_id,''))
 BEGIN SELECT RAISE(ABORT,'Dream cover locked in Floraison'); END;
CREATE TRIGGER trg_dream_floraison_locked
 BEFORE UPDATE OF testimony_text,testimony_primary_asset_id,completed_at,motivation,goal_date ON dreams
 WHEN OLD.phase='testimony' AND (
  coalesce(NEW.testimony_text,'') <> coalesce(OLD.testimony_text,'') OR
  (OLD.testimony_primary_asset_id IS NOT NULL AND coalesce(NEW.testimony_primary_asset_id,'') <> OLD.testimony_primary_asset_id) OR
  coalesce(NEW.completed_at,'') <> coalesce(OLD.completed_at,'') OR
  coalesce(NEW.motivation,'') <> coalesce(OLD.motivation,'') OR
  coalesce(NEW.goal_date,'') <> coalesce(OLD.goal_date,''))
 BEGIN SELECT RAISE(ABORT,'Floraison result is locked'); END;

------------------------------------------------------------------------------------------
-- Needs / resources: categories, required level, owner confirmation, counters
------------------------------------------------------------------------------------------
ALTER TABLE dream_needs ADD COLUMN category TEXT NOT NULL DEFAULT 'person'
  CHECK(category IN ('person','practical','financial','logistics'));
ALTER TABLE dream_needs ADD COLUMN required_level INTEGER CHECK(required_level IS NULL OR required_level BETWEEN 1 AND 5);
ALTER TABLE dream_needs ADD COLUMN description TEXT;
ALTER TABLE dream_needs ADD COLUMN is_required INTEGER NOT NULL DEFAULT 1 CHECK(is_required IN (0,1));
ALTER TABLE dream_needs ADD COLUMN amount_cents INTEGER CHECK(amount_cents IS NULL OR amount_cents>0);
ALTER TABLE dream_needs ADD COLUMN currency TEXT CHECK(currency IS NULL OR length(currency)=3);
ALTER TABLE dream_needs ADD COLUMN illustration TEXT;
-- Slots the owner confirmed without a helper offer (e.g. a rehearsal room they secured).
-- Invariant kept by triggers: slots_filled = manual_confirmed + accepted offers.
ALTER TABLE dream_needs ADD COLUMN manual_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(manual_confirmed>=0);
ALTER TABLE dream_needs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dream_needs ADD COLUMN updated_at TEXT;

-- The UI lets owners manage resources in Semence, Germination and Croissance; only Floraison
-- is frozen. The old triggers froze needs entirely after Semence, which made it impossible
-- to record an accepted helper in Germination.
DROP TRIGGER trg_dream_needs_locked_update;
DROP TRIGGER trg_dream_needs_locked_delete;
DROP TRIGGER trg_dream_needs_locked_insert;
CREATE TRIGGER trg_dream_needs_locked_insert
 BEFORE INSERT ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=NEW.dream_id) = 'testimony'
 BEGIN SELECT RAISE(ABORT,'needs are locked in Floraison'); END;
CREATE TRIGGER trg_dream_needs_locked_update
 BEFORE UPDATE ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) = 'testimony'
 BEGIN SELECT RAISE(ABORT,'needs are locked in Floraison'); END;
CREATE TRIGGER trg_dream_needs_locked_delete
 BEFORE DELETE ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) = 'testimony'
 BEGIN SELECT RAISE(ABORT,'needs are locked in Floraison'); END;
CREATE TRIGGER trg_dream_needs_no_delete_with_helpers
 BEFORE DELETE ON dream_needs
 WHEN EXISTS(SELECT 1 FROM dream_help_offers WHERE need_id=OLD.id AND status='accepted')
 BEGIN SELECT RAISE(ABORT,'release accepted helpers before removing a need'); END;

ALTER TABLE dream_help_offers ADD COLUMN talent_id TEXT REFERENCES talents(id);
ALTER TABLE dream_help_offers ADD COLUMN responded_by TEXT REFERENCES users(id);

CREATE TRIGGER trg_offer_insert_pending
 BEFORE INSERT ON dream_help_offers
 WHEN NEW.status <> 'pending'
   OR NOT EXISTS(SELECT 1 FROM dream_needs WHERE id=NEW.need_id AND dream_id=NEW.dream_id)
 BEGIN SELECT RAISE(ABORT,'offers start pending and must match their Dream need'); END;
-- Accepting an offer fills a slot. The CHECK(slots_filled<=slots_total) on dream_needs aborts
-- the whole UPDATE when a need is already full, so two concurrent acceptances cannot overfill.
CREATE TRIGGER trg_offer_accept_fills_slot
 AFTER UPDATE OF status ON dream_help_offers
 WHEN NEW.status='accepted' AND OLD.status<>'accepted'
 BEGIN UPDATE dream_needs SET slots_filled=slots_filled+1, updated_at=CURRENT_TIMESTAMP WHERE id=NEW.need_id; END;
CREATE TRIGGER trg_offer_release_frees_slot
 AFTER UPDATE OF status ON dream_help_offers
 WHEN OLD.status='accepted' AND NEW.status<>'accepted'
 BEGIN UPDATE dream_needs SET slots_filled=slots_filled-1, updated_at=CURRENT_TIMESTAMP WHERE id=NEW.need_id; END;
CREATE TRIGGER trg_offer_no_delete_accepted
 BEFORE DELETE ON dream_help_offers
 WHEN OLD.status='accepted'
 BEGIN SELECT RAISE(ABORT,'release an accepted offer before deleting it'); END;
CREATE TRIGGER trg_need_manual_confirm_counter
 BEFORE UPDATE OF manual_confirmed ON dream_needs
 WHEN NEW.manual_confirmed <> OLD.manual_confirmed
  AND NEW.slots_filled - OLD.slots_filled <> NEW.manual_confirmed - OLD.manual_confirmed
 BEGIN SELECT RAISE(ABORT,'manual confirmations must move slots_filled by the same amount'); END;

------------------------------------------------------------------------------------------
-- Journal entries: dated entries and visibility; owner notes allowed during Croissance
------------------------------------------------------------------------------------------
ALTER TABLE dream_entries ADD COLUMN entry_date TEXT
  CHECK(entry_date IS NULL OR entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]');
ALTER TABLE dream_entries ADD COLUMN visibility TEXT NOT NULL DEFAULT 'owners'
  CHECK(visibility IN ('owners','participants','public'));
DROP TRIGGER trg_dream_entries_by_phase;
CREATE TRIGGER trg_dream_entries_by_phase
 BEFORE INSERT ON dream_entries
 WHEN NOT EXISTS(
  SELECT 1 FROM dreams d WHERE d.id=NEW.dream_id AND (
   (d.phase IN ('dream','initiation') AND NEW.entry_type IN ('note','addition')) OR
   (d.phase='growth' AND NEW.entry_type IN ('note','progress_comment')) OR
   (d.phase='testimony' AND NEW.entry_type='testimony')
  ))
 BEGIN SELECT RAISE(ABORT,'entry type not permitted for Dream phase'); END;

-- Each phase is entered once (phases are monotonic), which makes transition retries idempotent.
CREATE UNIQUE INDEX idx_dream_phase_history_once ON dream_phase_history(dream_id,to_phase);

------------------------------------------------------------------------------------------
-- Dream workspace content shown in the current UI
------------------------------------------------------------------------------------------
CREATE TABLE dream_media (
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 media_id TEXT NOT NULL REFERENCES media_assets(id),
 role TEXT NOT NULL CHECK(role IN ('gallery','result','semence')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 caption TEXT,
 added_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(dream_id,media_id)
);
CREATE INDEX idx_dream_media_role ON dream_media(dream_id,role,sort_order);
CREATE TRIGGER trg_dream_media_result_locked
 BEFORE INSERT ON dream_media
 WHEN (SELECT phase FROM dreams WHERE id=NEW.dream_id)='testimony'
 BEGIN SELECT RAISE(ABORT,'Floraison media is locked'); END;
CREATE TRIGGER trg_dream_media_result_no_delete
 BEFORE DELETE ON dream_media
 WHEN OLD.role='result' AND (SELECT phase FROM dreams WHERE id=OLD.dream_id)='testimony'
 BEGIN SELECT RAISE(ABORT,'Floraison media is locked'); END;

-- Semence studio composition (frontend DreamBlock). Style properties are presentation data.
CREATE TABLE dream_blocks (
 id TEXT PRIMARY KEY,
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 position INTEGER NOT NULL DEFAULT 0,
 kind TEXT NOT NULL,
 title TEXT,
 content TEXT NOT NULL DEFAULT '',
 props_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(props_json)),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dream_blocks_dream ON dream_blocks(dream_id,position);
CREATE TRIGGER trg_dream_blocks_semence_insert BEFORE INSERT ON dream_blocks
 WHEN (SELECT phase FROM dreams WHERE id=NEW.dream_id) <> 'dream'
 BEGIN SELECT RAISE(ABORT,'Semence composition is editable only in Semence'); END;
CREATE TRIGGER trg_dream_blocks_semence_update BEFORE UPDATE ON dream_blocks
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) <> 'dream'
 BEGIN SELECT RAISE(ABORT,'Semence composition is editable only in Semence'); END;
CREATE TRIGGER trg_dream_blocks_semence_delete BEFORE DELETE ON dream_blocks
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) <> 'dream'
 BEGIN SELECT RAISE(ABORT,'Semence composition is editable only in Semence'); END;

CREATE TABLE dream_habits (
 id TEXT PRIMARY KEY,
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(trim(title))>0),
 frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly')),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 archived_at TEXT
);
CREATE INDEX idx_dream_habits_dream ON dream_habits(dream_id);
CREATE TABLE dream_habit_checks (
 habit_id TEXT NOT NULL REFERENCES dream_habits(id) ON DELETE CASCADE,
 day TEXT NOT NULL CHECK(day GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
 checked_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(habit_id,day)
);
CREATE TABLE dream_milestones (
 id TEXT PRIMARY KEY,
 dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(trim(title))>0),
 due_date TEXT NOT NULL CHECK(due_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
 done_at TEXT,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dream_milestones_dream ON dream_milestones(dream_id,due_date);
CREATE TRIGGER trg_dream_milestones_locked BEFORE INSERT ON dream_milestones
 WHEN (SELECT phase FROM dreams WHERE id=NEW.dream_id)='testimony'
 BEGIN SELECT RAISE(ABORT,'milestones are locked in Floraison'); END;

------------------------------------------------------------------------------------------
-- Conversations: one Dream group per Dream, one direct thread per pair, idempotent sends
------------------------------------------------------------------------------------------
ALTER TABLE conversations ADD COLUMN last_message_at TEXT;
ALTER TABLE conversations ADD COLUMN direct_key TEXT;
CREATE UNIQUE INDEX idx_conversations_one_per_dream ON conversations(dream_id) WHERE type='dream';
CREATE UNIQUE INDEX idx_conversations_direct_key ON conversations(direct_key) WHERE direct_key IS NOT NULL;
CREATE INDEX idx_conversations_activity ON conversations(last_message_at);
ALTER TABLE conversation_members ADD COLUMN archived_at TEXT;
ALTER TABLE messages ADD COLUMN client_message_id TEXT;
CREATE UNIQUE INDEX idx_messages_client_id ON messages(conversation_id,sender_id,client_message_id)
 WHERE client_message_id IS NOT NULL;

------------------------------------------------------------------------------------------
-- Notifications: dedupe and deep links
------------------------------------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN dedupe_key TEXT;
ALTER TABLE notifications ADD COLUMN deep_link TEXT;
ALTER TABLE notifications ADD COLUMN category TEXT;
CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX idx_notifications_user_recent ON notifications(user_id,created_at);

------------------------------------------------------------------------------------------
-- Talents: profile fields, samples and showcases (publication type 'talent', see 0009)
------------------------------------------------------------------------------------------
ALTER TABLE user_talents ADD COLUMN description TEXT;
ALTER TABLE user_talents ADD COLUMN experience TEXT;
ALTER TABLE user_talents ADD COLUMN illustration TEXT;
ALTER TABLE user_talents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
  CHECK(visibility IN ('public','members','private'));
CREATE TABLE user_talent_media (
 user_id TEXT NOT NULL,
 talent_id TEXT NOT NULL,
 media_id TEXT NOT NULL REFERENCES media_assets(id),
 sort_order INTEGER NOT NULL DEFAULT 0,
 caption TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,talent_id,media_id),
 FOREIGN KEY(user_id,talent_id) REFERENCES user_talents(user_id,talent_id) ON DELETE CASCADE
);
-- A talent showcase is a publication of type 'talent' (0009) plus this detail row, like
-- bible_posts and music_tracks. One showcase per member talent: unpublishing soft-deletes the
-- publication and publishing again restores the same one.
CREATE TABLE talent_publications (
 publication_id TEXT PRIMARY KEY REFERENCES publications(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,
 talent_id TEXT NOT NULL,
 FOREIGN KEY(user_id,talent_id) REFERENCES user_talents(user_id,talent_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_talent_publications_one ON talent_publications(user_id,talent_id);
CREATE TRIGGER trg_talent_publication_matches
 BEFORE INSERT ON talent_publications
 WHEN NOT EXISTS(SELECT 1 FROM publications WHERE id=NEW.publication_id AND type='talent' AND author_id=NEW.user_id)
 BEGIN SELECT RAISE(ABORT,'talent showcase must be a talent publication by the talent owner'); END;
-- Removing a member talent retires its showcase from every feed.
CREATE TRIGGER trg_talent_publication_removed
 AFTER DELETE ON talent_publications
 BEGIN UPDATE publications SET deleted_at=coalesce(deleted_at,CURRENT_TIMESTAMP) WHERE id=OLD.publication_id; END;
-- Encouragement on a talent showcase: count visible to the talent owner only.
CREATE TABLE talent_encouragements (
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(publication_id,user_id)
);

------------------------------------------------------------------------------------------
-- Prayer list (no fabricated dates) and Fire folders
------------------------------------------------------------------------------------------
-- prayer_saves (0003) stays for explicit dated reminders. prayer_list holds the member's
-- prayer selection exactly as the UI models it: a start day and a repetition.
CREATE TABLE prayer_list (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 repeat_mode TEXT NOT NULL DEFAULT 'daily' CHECK(repeat_mode IN ('once','daily','weekly')),
 start_date TEXT CHECK(start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,publication_id)
);
CREATE INDEX idx_prayer_list_publication ON prayer_list(publication_id);
CREATE TABLE fire_folders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 60),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fire_folders_user ON fire_folders(user_id);
CREATE TABLE fire_folder_items (
 folder_id TEXT NOT NULL REFERENCES fire_folders(id) ON DELETE CASCADE,
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(folder_id,publication_id)
);

------------------------------------------------------------------------------------------
-- Publications: Bible captions, music metadata and rights withdrawal
------------------------------------------------------------------------------------------
ALTER TABLE bible_posts ADD COLUMN caption TEXT;
ALTER TABLE music_tracks ADD COLUMN description TEXT;
ALTER TABLE music_tracks ADD COLUMN song_author TEXT;
-- Time-coded lyric lines supplied by the artist: [{"time":seconds,"text":"..."}]. Never generated.
ALTER TABLE music_tracks ADD COLUMN lyrics_json TEXT CHECK(lyrics_json IS NULL OR json_valid(lyrics_json));
ALTER TABLE music_tracks ADD COLUMN withdrawn_at TEXT;

------------------------------------------------------------------------------------------
-- Agenda visibility (addresses are public only when the organiser chooses)
------------------------------------------------------------------------------------------
ALTER TABLE agenda_events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
  CHECK(visibility IN ('private','invitees','public'));
ALTER TABLE agenda_events ADD COLUMN cancelled_at TEXT;
CREATE INDEX idx_agenda_events_creator ON agenda_events(creator_id,starts_at);

------------------------------------------------------------------------------------------
-- Idempotency for high-impact writes
------------------------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 idem_key TEXT NOT NULL CHECK(length(idem_key) BETWEEN 8 AND 120),
 route TEXT NOT NULL,
 response_status INTEGER NOT NULL,
 response_body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,idem_key,route)
);
CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);
