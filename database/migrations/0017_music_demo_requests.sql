-- 0017 · D1-backed read-only Music previews, isolated from real requests.
-- A demo row links to a fictional publication; it is not an invitation or a request to an actual member.
CREATE TABLE IF NOT EXISTS demo_music_requests (
  publication_id TEXT PRIMARY KEY REFERENCES publications(id) ON DELETE CASCADE,
  talents_json TEXT NOT NULL CHECK(json_valid(talents_json))
);
