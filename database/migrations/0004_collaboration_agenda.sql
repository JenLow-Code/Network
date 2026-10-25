-- 0004 · Messaging, introductions, agenda, notifications and safety.
CREATE TABLE conversations (
 id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('direct','group','system','dream')),
 dream_id TEXT REFERENCES dreams(id), title TEXT,
 created_by TEXT REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE conversation_members (
 conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_read_at TEXT, muted_until TEXT, left_at TEXT,
 PRIMARY KEY(conversation_id,user_id)
);
CREATE INDEX idx_conversation_members_user ON conversation_members(user_id,left_at);
CREATE TABLE messages (
 id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 sender_id TEXT REFERENCES users(id),
 message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text','publication','system','asset','agenda_invite')),
 body TEXT,
 publication_id TEXT REFERENCES publications(id),
 media_id TEXT REFERENCES media_assets(id),
 agenda_event_id TEXT,
 sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, edited_at TEXT, deleted_at TEXT
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id,sent_at,id);
CREATE TABLE message_reactions (
 message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reaction TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(message_id,user_id,reaction)
);
CREATE TABLE introductions (
 id TEXT PRIMARY KEY,
 initiated_by TEXT NOT NULL REFERENCES users(id),
 introduced_user_id TEXT NOT NULL REFERENCES users(id),
 dream_owner_id TEXT NOT NULL REFERENCES users(id),
 dream_id TEXT NOT NULL REFERENCES dreams(id),
 need_id TEXT REFERENCES dream_needs(id),
 message TEXT,
 introduced_status TEXT NOT NULL DEFAULT 'pending' CHECK(introduced_status IN ('pending','accepted','declined')),
 owner_status TEXT NOT NULL DEFAULT 'pending' CHECK(owner_status IN ('pending','accepted','declined')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','connected','cancelled')),
 group_conversation_id TEXT REFERENCES conversations(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT,
 CHECK(initiated_by <> introduced_user_id AND introduced_user_id <> dream_owner_id)
);
CREATE INDEX idx_introductions_inbox ON introductions(introduced_user_id,introduced_status);
CREATE INDEX idx_introductions_owner ON introductions(dream_owner_id,owner_status);
-- API requires requester/introduced to be accepted Circle members; both
-- recipients must approve before creating a shared conversation.

CREATE TABLE agenda_events (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
 creator_id TEXT NOT NULL REFERENCES users(id),
 source_type TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('manual','lesson','dream','service','prayer','other')),
 source_id TEXT, dream_id TEXT REFERENCES dreams(id),
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
 location_text TEXT, online_meeting_url TEXT,
 status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','confirmed','cancelled','completed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(ends_at > starts_at)
);
CREATE INDEX idx_agenda_events_starts ON agenda_events(starts_at,status);
CREATE TABLE agenda_invites (
 event_id TEXT NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 invited_by TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 invited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, responded_at TEXT,
 PRIMARY KEY(event_id,user_id)
);
CREATE INDEX idx_agenda_invites_user ON agenda_invites(user_id,status);
CREATE TABLE calendar_connections (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('google','outlook','apple','ics')),
 external_account_id TEXT, credential_secret_ref TEXT,
 sync_direction TEXT NOT NULL DEFAULT 'export' CHECK(sync_direction IN ('export','import','bidirectional')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','error')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_sync_at TEXT,
 UNIQUE(user_id,provider,external_account_id)
);
CREATE TABLE calendar_exports (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
 connection_id TEXT NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
 external_event_id TEXT, sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending','synced','error','removed')),
 last_attempt_at TEXT, UNIQUE(event_id,connection_id)
);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 notification_type TEXT NOT NULL, actor_id TEXT REFERENCES users(id),
 entity_type TEXT, entity_id TEXT, title TEXT NOT NULL, body TEXT,
 scheduled_at TEXT, delivered_at TEXT, read_at TEXT,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','cancelled')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user ON notifications(user_id,read_at,created_at);
CREATE INDEX idx_notifications_due ON notifications(status,scheduled_at);
CREATE TABLE notification_deliveries (
 id TEXT PRIMARY KEY, notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 device_id TEXT REFERENCES user_devices(id), channel TEXT NOT NULL CHECK(channel IN ('push','email','in_app')),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed')),
 attempted_at TEXT, provider_message_id TEXT, error_code TEXT
);
CREATE TABLE reports (
 id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL REFERENCES users(id),
 target_type TEXT NOT NULL CHECK(target_type IN ('user','dream','publication','message','music')),
 target_id TEXT NOT NULL, reason_code TEXT NOT NULL, description TEXT,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT, handled_by TEXT REFERENCES users(id)
);
CREATE INDEX idx_reports_status ON reports(status,created_at);
CREATE TABLE moderation_actions (
 id TEXT PRIMARY KEY, report_id TEXT REFERENCES reports(id),
 moderator_id TEXT NOT NULL REFERENCES users(id),
 target_type TEXT NOT NULL, target_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('warn','hide','restore','remove','suspend','unsuspend')),
 explanation TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE audit_log (
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id),
 operation TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
 metadata_json TEXT CHECK(metadata_json IS NULL OR json_valid(metadata_json)),
 occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 request_id TEXT
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type,entity_id,occurred_at);
