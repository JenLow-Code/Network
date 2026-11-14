-- Music messages may refer to a section of the same musical workspace.
-- Section objects are currently local-first. The sender must be a member of
-- the protected music conversation, and the tag is contextual metadata only.
ALTER TABLE messages ADD COLUMN music_section_id TEXT;
ALTER TABLE messages ADD COLUMN music_section_title TEXT;
