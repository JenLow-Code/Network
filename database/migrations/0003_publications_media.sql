-- 0003 · File metadata, publications, Scripture, music, credits & collaborations.
-- Large binary media is stored in R2, not D1.
CREATE TABLE media_assets (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
 r2_key TEXT UNIQUE, external_url TEXT,
 media_type TEXT NOT NULL CHECK(media_type IN ('image','audio','video','document')),
 mime_type TEXT, bytes INTEGER CHECK(bytes>=0), duration_ms INTEGER CHECK(duration_ms>=0),
 width INTEGER, height INTEGER, checksum_sha256 TEXT,
 storage_status TEXT NOT NULL DEFAULT 'pending' CHECK(storage_status IN ('pending','ready','quarantined','removed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT,
 CHECK ((r2_key IS NOT NULL) <> (external_url IS NOT NULL))
);
CREATE INDEX idx_media_owner ON media_assets(owner_id,media_type);
CREATE TABLE publications (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK(type IN ('dream','bible','music')),
 author_id TEXT NOT NULL REFERENCES users(id),
 dream_id TEXT REFERENCES dreams(id) ON DELETE CASCADE,
 title TEXT NOT NULL, cover_asset_id TEXT REFERENCES media_assets(id),
 visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('private','members','public')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TEXT
);
CREATE INDEX idx_publications_feed ON publications(visibility,created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_publications_author ON publications(author_id,created_at);
CREATE UNIQUE INDEX idx_publications_one_per_dream ON publications(dream_id) WHERE type='dream' AND deleted_at IS NULL;
CREATE TABLE bible_editions (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, language_code TEXT NOT NULL,
 copyright_notice TEXT, source_url TEXT, redistribution_license TEXT,
 import_allowed INTEGER NOT NULL DEFAULT 0 CHECK(import_allowed IN (0,1)),
 export_allowed INTEGER NOT NULL DEFAULT 0 CHECK(export_allowed IN (0,1))
);
CREATE TABLE bible_books (
 id TEXT PRIMARY KEY, book_code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 sort_order INTEGER NOT NULL UNIQUE, chapter_count INTEGER NOT NULL CHECK(chapter_count>0)
);
CREATE TABLE bible_verses (
 edition_id TEXT NOT NULL REFERENCES bible_editions(id),
 book_id TEXT NOT NULL REFERENCES bible_books(id),
 chapter INTEGER NOT NULL CHECK(chapter>0), verse INTEGER NOT NULL CHECK(verse>0),
 text TEXT NOT NULL, PRIMARY KEY(edition_id,book_id,chapter,verse)
);
CREATE INDEX idx_bible_chapter ON bible_verses(edition_id,book_id,chapter);
CREATE TABLE bible_posts (
 publication_id TEXT PRIMARY KEY REFERENCES publications(id) ON DELETE CASCADE,
 edition_id TEXT NOT NULL REFERENCES bible_editions(id),
 book_id TEXT NOT NULL REFERENCES bible_books(id),
 chapter INTEGER NOT NULL CHECK(chapter>0), start_verse INTEGER NOT NULL CHECK(start_verse>0),
 end_verse INTEGER NOT NULL CHECK(end_verse>=start_verse),
 imported_from_app TEXT, source_uri TEXT, custom_image_asset_id TEXT REFERENCES media_assets(id)
);
CREATE TABLE music_rights (
 id TEXT PRIMARY KEY, publisher_id TEXT NOT NULL REFERENCES users(id),
 original_creator_name TEXT NOT NULL, rights_holder_name TEXT NOT NULL,
 original_source_url TEXT, license_type TEXT NOT NULL CHECK(license_type IN ('own_work','explicit_permission','open_license','other')),
 permission_evidence_ref TEXT, attribution_text TEXT NOT NULL,
 adaptations_allowed INTEGER NOT NULL DEFAULT 1 CHECK(adaptations_allowed IN (0,1)),
 reviewed_status TEXT NOT NULL DEFAULT 'pending' CHECK(reviewed_status IN ('pending','approved','rejected','revoked')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT
);
CREATE TABLE music_tracks (
 id TEXT PRIMARY KEY, publication_id TEXT NOT NULL UNIQUE REFERENCES publications(id) ON DELETE CASCADE,
 publisher_id TEXT NOT NULL REFERENCES users(id),
 audio_asset_id TEXT REFERENCES media_assets(id),
 external_stream_url TEXT, cover_asset_id TEXT REFERENCES media_assets(id),
 rights_id TEXT NOT NULL REFERENCES music_rights(id),
 original_track_id TEXT REFERENCES music_tracks(id),
 duration_ms INTEGER CHECK(duration_ms>=0), clip_start_ms INTEGER NOT NULL DEFAULT 0 CHECK(clip_start_ms>=0),
 downloadable INTEGER NOT NULL DEFAULT 0 CHECK(downloadable=0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(audio_asset_id IS NOT NULL OR external_stream_url IS NOT NULL)
);
CREATE INDEX idx_music_track_origin ON music_tracks(original_track_id);
CREATE TABLE music_contributors (
 track_id TEXT NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
 credit_order INTEGER NOT NULL CHECK(credit_order>=0),
 user_id TEXT REFERENCES users(id),
 display_name TEXT NOT NULL, contribution TEXT NOT NULL,
 PRIMARY KEY(track_id,credit_order)
);
CREATE TABLE music_collab_proposals (
 id TEXT PRIMARY KEY, original_track_id TEXT NOT NULL REFERENCES music_tracks(id),
 proposed_by TEXT NOT NULL REFERENCES users(id),
 audio_asset_id TEXT REFERENCES media_assets(id),
 external_audio_url TEXT, description TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','accepted','rejected','withdrawn','published')),
 publisher_response TEXT, published_track_id TEXT REFERENCES music_tracks(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, responded_at TEXT,
 CHECK(audio_asset_id IS NOT NULL OR external_audio_url IS NOT NULL)
);
CREATE INDEX idx_music_proposals_track ON music_collab_proposals(original_track_id,status);
CREATE TABLE music_proposal_credits (
 proposal_id TEXT NOT NULL REFERENCES music_collab_proposals(id) ON DELETE CASCADE,
 credit_order INTEGER NOT NULL, contributor_id TEXT REFERENCES users(id),
 display_name TEXT NOT NULL, contribution TEXT NOT NULL,
 PRIMARY KEY(proposal_id,credit_order)
);
CREATE TABLE publication_media (
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 media_id TEXT NOT NULL REFERENCES media_assets(id), sort_order INTEGER NOT NULL DEFAULT 0,
 caption TEXT, PRIMARY KEY(publication_id,media_id)
);
CREATE TABLE fire_saves (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,publication_id)
);
CREATE TABLE prayer_saves (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 scheduled_for TEXT NOT NULL,
 reminder_status TEXT NOT NULL DEFAULT 'none' CHECK(reminder_status IN ('none','scheduled','sent','cancelled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,publication_id,scheduled_for)
);
CREATE INDEX idx_prayer_schedule ON prayer_saves(user_id,scheduled_for);
CREATE TABLE publication_shares (
 id TEXT PRIMARY KEY, publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
 shared_by TEXT NOT NULL REFERENCES users(id), channel TEXT NOT NULL CHECK(channel IN ('internal','external')),
 shared_to_user_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shares_pub ON publication_shares(publication_id,created_at);
