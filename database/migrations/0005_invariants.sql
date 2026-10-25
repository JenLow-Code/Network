-- 0005 · Enforce fundamental Dream and content-integrity invariants in SQLite.
CREATE TRIGGER trg_dream_title_immutable
 BEFORE UPDATE OF title ON dreams
 WHEN NEW.title <> OLD.title
 BEGIN SELECT RAISE(ABORT,'dream title cannot be changed after creation'); END;
CREATE TRIGGER trg_dream_phase_progression
 BEFORE UPDATE OF phase ON dreams
 WHEN NEW.phase <> OLD.phase AND NOT (
   (OLD.phase='dream' AND NEW.phase='initiation') OR
   (OLD.phase='initiation' AND NEW.phase='growth') OR
   (OLD.phase='growth' AND NEW.phase='testimony')
 )
 BEGIN SELECT RAISE(ABORT,'invalid Dream phase transition'); END;
CREATE TRIGGER trg_dream_core_immutable_after_start
 BEFORE UPDATE OF summary,cover_asset_key ON dreams
 WHEN OLD.phase <> 'dream'
  AND (NEW.summary <> OLD.summary OR coalesce(NEW.cover_asset_key,'') <> coalesce(OLD.cover_asset_key,''))
 BEGIN SELECT RAISE(ABORT,'core Dream fields locked after initiation'); END;
CREATE TRIGGER trg_dream_needs_locked_update
 BEFORE UPDATE ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) <> 'dream'
 BEGIN SELECT RAISE(ABORT,'existing Dream needs cannot be changed in this phase'); END;
CREATE TRIGGER trg_dream_needs_locked_delete
 BEFORE DELETE ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=OLD.dream_id) <> 'dream'
 BEGIN SELECT RAISE(ABORT,'existing Dream needs cannot be removed after initiation'); END;
CREATE TRIGGER trg_dream_needs_locked_insert
 BEFORE INSERT ON dream_needs
 WHEN (SELECT phase FROM dreams WHERE id=NEW.dream_id) NOT IN ('dream','initiation')
 BEGIN SELECT RAISE(ABORT,'new needs allowed only before growth'); END;
CREATE TRIGGER trg_dream_entries_by_phase
 BEFORE INSERT ON dream_entries
 WHEN NOT EXISTS(
  SELECT 1 FROM dreams d WHERE d.id=NEW.dream_id AND (
   (d.phase='dream' AND NEW.entry_type IN ('note','addition')) OR
   (d.phase='initiation' AND NEW.entry_type IN ('note','addition')) OR
   (d.phase='growth' AND NEW.entry_type='progress_comment') OR
   (d.phase='testimony' AND NEW.entry_type='testimony')
  ))
 BEGIN SELECT RAISE(ABORT,'entry type not permitted for Dream phase'); END;
-- Integrity across migration order: publication table was created in 0003.
CREATE TRIGGER trg_dream_inspiration_publication
 BEFORE INSERT ON dream_inspirations
 WHEN NOT EXISTS(SELECT 1 FROM publications WHERE id=NEW.publication_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'inspiration publication does not exist'); END;
CREATE TRIGGER trg_dream_testimony_asset
 BEFORE UPDATE OF testimony_primary_asset_id ON dreams
 WHEN NEW.testimony_primary_asset_id IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.testimony_primary_asset_id)
 BEGIN SELECT RAISE(ABORT,'testimony asset does not exist'); END;
-- Rights check: no blanket right to republish or download a track.
CREATE TRIGGER trg_music_repost_only_original_publisher
 BEFORE INSERT ON music_tracks
 WHEN NEW.original_track_id IS NOT NULL
  AND NEW.publisher_id <> (SELECT publisher_id FROM music_tracks WHERE id=NEW.original_track_id)
 BEGIN SELECT RAISE(ABORT,'only original publisher may repost adaptation'); END;
CREATE TRIGGER trg_intro_consent_before_connected
 BEFORE UPDATE OF status ON introductions
 WHEN NEW.status='connected' AND (NEW.introduced_status<>'accepted' OR NEW.owner_status<>'accepted')
 BEGIN SELECT RAISE(ABORT,'both parties must accept introduction'); END;
-- Server must ALSO enforce caller identity, ownership, permissions, credit integrity,
-- content moderation, uploads, rights confirmation and event participant authorization.
