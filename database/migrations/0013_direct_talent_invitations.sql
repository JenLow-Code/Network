-- 0013 · Owner-initiated, consent-based talent requests tied to exact Dream needs.
-- A request NEVER fills a need on send. A recipient must explicitly accept.
-- Accepted requests reference a real accepted dream_help_offers row (whose triggers
-- update slots_filled). Revocation releases that offer and notifies the invitee.
CREATE TABLE dream_need_invitations (
  id TEXT PRIMARY KEY,
  dream_id TEXT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  need_id TEXT NOT NULL REFERENCES dream_needs(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  invited_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','removed')),
  offer_id TEXT REFERENCES dream_help_offers(id),
  message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT,
  removed_at TEXT,
  UNIQUE(need_id,invited_user_id),
  CHECK(invited_by <> invited_user_id),
  CHECK(status <> 'accepted' OR offer_id IS NOT NULL)
);
CREATE INDEX idx_need_invitations_recipient ON dream_need_invitations(invited_user_id,status,created_at);
CREATE INDEX idx_need_invitations_owner ON dream_need_invitations(dream_id,status);
CREATE TRIGGER trg_need_invitation_match
  BEFORE INSERT ON dream_need_invitations
  WHEN NOT EXISTS(
    SELECT 1 FROM dream_needs n WHERE n.id=NEW.need_id AND n.dream_id=NEW.dream_id AND n.category='person'
  )
  BEGIN SELECT RAISE(ABORT,'invitation must target a talent need in its Dream'); END;
