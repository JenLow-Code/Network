"""Validate JenLow D1 SQL with local SQLite (no cloud access)."""
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parent
migrations = sorted((root / "migrations").glob("*.sql"))
assert len(migrations) >= 6
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for path in migrations:
    print("Applying", path.name)
    db.executescript(path.read_text(encoding="utf8"))
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []

tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
expected = {"users","dreams","dream_owners","dream_collaborators","dream_same_dream",
 "dream_encouragements","publications","bible_verses","music_tracks","music_rights",
 "contacts","circle_members","conversations","messages","agenda_events","agenda_invites",
 "prayer_saves","fire_saves","introductions","video_call_sessions","music_collab_proposals"}
assert expected <= tables, expected - tables

db.executescript("""
INSERT INTO users(id,handle,display_name,email) VALUES
 ('u1','owner','Owner','owner@example.test'),
 ('u2','member','Member','member@example.test');
INSERT INTO dreams(id,title,created_by,summary) VALUES('d1','First dream','u1','An idea');
INSERT INTO dream_owners(dream_id,user_id,status) VALUES('d1','u1','accepted');
INSERT INTO dream_same_dream(dream_id,user_id) VALUES('d1','u2');
""")
assert db.execute("SELECT same_dream_count FROM v_dream_public_counts WHERE dream_id='d1'").fetchone()[0] == 1
def blocked(query):
    try: db.execute(query)
    except sqlite3.IntegrityError: return
    raise AssertionError("Expected rule rejection: " + query)
blocked("UPDATE dreams SET title='Changed' WHERE id='d1'")
blocked("UPDATE dreams SET phase='testimony' WHERE id='d1'")
db.execute("UPDATE dreams SET phase='initiation' WHERE id='d1'")
blocked("UPDATE dreams SET summary='Changed' WHERE id='d1'")
db.execute("UPDATE dreams SET phase='growth' WHERE id='d1'")
blocked("INSERT INTO dream_entries(id,dream_id,author_id,entry_type,body) VALUES('e1','d1','u1','addition','Not allowed')")
blocked("INSERT INTO video_call_sessions(id,initiated_by,invited_user_id) VALUES('call1','u1','u2')")
print("PASS:",len(migrations),"migrations,",len(tables),"tables, lifecycle and consent checks")
