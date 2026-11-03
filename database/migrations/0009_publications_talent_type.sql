-- 0009 · Talent becomes a first-class publication type.
--
-- SQLite cannot change a CHECK constraint in place, so `publications` is rebuilt
-- (new table → copy → drop → rename) to allow type 'talent' and add moderation_hidden_at.
-- D1 always enforces foreign keys, and dropping a parent table deletes or blocks its child
-- rows, so every row that references a publication is first copied aside, detached, and
-- restored after the rebuild. Nothing is lost (middleware/test/migrations.test.ts puts rows
-- in every dependent table and checks them afterwards).
--
-- Every step leaves the database consistent, so this works whether or not the runner wraps
-- the file in one transaction. Back up before applying remotely (wrangler d1 export).

-- 1 · Copy dependent rows aside.
CREATE TABLE bak0009_bible_posts AS SELECT * FROM bible_posts;
CREATE TABLE bak0009_music_tracks AS SELECT * FROM music_tracks;
CREATE TABLE bak0009_music_contributors AS SELECT * FROM music_contributors;
CREATE TABLE bak0009_music_collab_proposals AS SELECT * FROM music_collab_proposals;
CREATE TABLE bak0009_music_proposal_credits AS SELECT * FROM music_proposal_credits;
CREATE TABLE bak0009_publication_media AS SELECT * FROM publication_media;
CREATE TABLE bak0009_fire_saves AS SELECT * FROM fire_saves;
CREATE TABLE bak0009_prayer_saves AS SELECT * FROM prayer_saves;
CREATE TABLE bak0009_publication_shares AS SELECT * FROM publication_shares;
CREATE TABLE bak0009_message_publications AS SELECT id, publication_id FROM messages WHERE publication_id IS NOT NULL;
CREATE TABLE bak0009_share_intents AS SELECT id, resolved_publication_id FROM external_share_intents WHERE resolved_publication_id IS NOT NULL;

-- 2 · Detach them (children before parents), and the view/trigger that name the table.
UPDATE messages SET publication_id=NULL WHERE publication_id IS NOT NULL;
UPDATE external_share_intents SET resolved_publication_id=NULL WHERE resolved_publication_id IS NOT NULL;
DELETE FROM music_proposal_credits;
DELETE FROM music_collab_proposals;
DELETE FROM music_contributors;
DELETE FROM music_tracks;
DELETE FROM bible_posts;
DELETE FROM publication_media;
DELETE FROM fire_saves;
DELETE FROM prayer_saves;
DELETE FROM publication_shares;
DROP VIEW v_feed_publications;
DROP TRIGGER trg_dream_inspiration_publication;

-- 3 · Rebuild.
CREATE TABLE publications_new (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK(type IN ('dream','bible','music','talent')),
 author_id TEXT NOT NULL REFERENCES users(id),
 dream_id TEXT REFERENCES dreams(id) ON DELETE CASCADE,
 title TEXT NOT NULL, cover_asset_id TEXT REFERENCES media_assets(id),
 visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('private','members','public')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TEXT,
 moderation_hidden_at TEXT
);
INSERT INTO publications_new(id,type,author_id,dream_id,title,cover_asset_id,visibility,created_at,updated_at,deleted_at)
 SELECT id,type,author_id,dream_id,title,cover_asset_id,visibility,created_at,updated_at,deleted_at FROM publications;
DROP TABLE publications;
ALTER TABLE publications_new RENAME TO publications;
CREATE INDEX idx_publications_feed ON publications(visibility,created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_publications_author ON publications(author_id,created_at);
CREATE UNIQUE INDEX idx_publications_one_per_dream ON publications(dream_id) WHERE type='dream' AND deleted_at IS NULL;
CREATE INDEX idx_publications_author_visible ON publications(author_id,visibility,created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_publications_type_feed ON publications(type,visibility,created_at) WHERE deleted_at IS NULL;

-- 4 · Restore the view, the trigger and every detached row.
CREATE VIEW v_feed_publications AS
 SELECT p.id,p.type,p.author_id,p.dream_id,p.title,p.cover_asset_id,p.created_at
 FROM publications p WHERE p.visibility='public' AND p.deleted_at IS NULL AND p.moderation_hidden_at IS NULL;
CREATE TRIGGER trg_dream_inspiration_publication
 BEFORE INSERT ON dream_inspirations
 WHEN NOT EXISTS(SELECT 1 FROM publications WHERE id=NEW.publication_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'inspiration publication does not exist'); END;
-- Original tracks before the adaptations that point at them.
INSERT INTO music_tracks SELECT * FROM bak0009_music_tracks ORDER BY original_track_id IS NOT NULL;
INSERT INTO music_contributors SELECT * FROM bak0009_music_contributors;
INSERT INTO music_collab_proposals SELECT * FROM bak0009_music_collab_proposals;
INSERT INTO music_proposal_credits SELECT * FROM bak0009_music_proposal_credits;
INSERT INTO bible_posts SELECT * FROM bak0009_bible_posts;
INSERT INTO publication_media SELECT * FROM bak0009_publication_media;
INSERT INTO fire_saves SELECT * FROM bak0009_fire_saves;
INSERT INTO prayer_saves SELECT * FROM bak0009_prayer_saves;
INSERT INTO publication_shares SELECT * FROM bak0009_publication_shares;
UPDATE messages SET publication_id=(SELECT b.publication_id FROM bak0009_message_publications b WHERE b.id=messages.id)
 WHERE id IN (SELECT id FROM bak0009_message_publications);
UPDATE external_share_intents SET resolved_publication_id=(SELECT b.resolved_publication_id FROM bak0009_share_intents b WHERE b.id=external_share_intents.id)
 WHERE id IN (SELECT id FROM bak0009_share_intents);

-- 5 · Clean up.
DROP TABLE bak0009_bible_posts;
DROP TABLE bak0009_music_tracks;
DROP TABLE bak0009_music_contributors;
DROP TABLE bak0009_music_collab_proposals;
DROP TABLE bak0009_music_proposal_credits;
DROP TABLE bak0009_publication_media;
DROP TABLE bak0009_fire_saves;
DROP TABLE bak0009_prayer_saves;
DROP TABLE bak0009_publication_shares;
DROP TABLE bak0009_message_publications;
DROP TABLE bak0009_share_intents;
