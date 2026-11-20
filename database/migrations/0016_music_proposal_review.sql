-- 0016 · Private review workflow for received music collaboration proposals.
-- The canonical 'submitted' status is deliberately retained during testing and
-- archiving: neither action is a response to the collaborator.
ALTER TABLE music_collab_proposals
  ADD COLUMN review_state TEXT NOT NULL DEFAULT 'pending'
  CHECK(review_state IN ('pending','testing','archived'));
ALTER TABLE music_collab_proposals
  ADD COLUMN review_started_at TEXT;
ALTER TABLE music_collab_proposals
  ADD COLUMN archive_until TEXT;
ALTER TABLE music_collab_proposals
  ADD COLUMN archived_once_at TEXT;
CREATE INDEX idx_music_review_expiry
  ON music_collab_proposals(review_state,archive_until);
