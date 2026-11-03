"""Validate JenLow D1 SQL with local SQLite (no cloud access).

Checks every migration in order, the upgrade path from the eight original migrations,
the reconciled business triggers, and that the demo seed is idempotent.
"""
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parent
migrations = sorted((root / "migrations").glob("*.sql"))
assert len(migrations) >= 11, [m.name for m in migrations]


def fresh(upto=None):
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    for path in migrations:
        if upto and path.name > upto:
            break
        db.executescript(path.read_text(encoding="utf8"))
        assert db.execute("PRAGMA foreign_key_check").fetchall() == [], path.name
    return db


db = fresh()
for path in migrations:
    print("Applied", path.name)
tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
expected = {"users", "dreams", "dream_owners", "dream_collaborators", "dream_same_dream",
            "dream_encouragements", "publications", "bible_verses", "music_tracks", "music_rights",
            "contacts", "circle_members", "conversations", "messages", "agenda_events", "agenda_invites",
            "prayer_saves", "fire_saves", "introductions", "video_call_sessions", "music_collab_proposals",
            # 0009+
            "user_roles", "dream_media", "dream_blocks", "dream_habits", "dream_milestones", "talent_posts",
            "prayer_list", "fire_folders", "idempotency_keys"}
assert expected <= tables, expected - tables

db.executescript("""
INSERT INTO users(id,handle,display_name,email) VALUES
 ('u1','owner','Owner','owner@example.test'),
 ('u2','member','Member','member@example.test'),
 ('u3','helper','Helper','helper@example.test');
INSERT INTO dreams(id,title,created_by,summary) VALUES('d1','First dream','u1','An idea');
INSERT INTO dream_owners(dream_id,user_id,status) VALUES('d1','u1','accepted');
INSERT INTO dream_same_dream(dream_id,user_id) VALUES('d1','u2');
INSERT INTO dream_needs(id,dream_id,label,slots_total) VALUES('n1','d1','Batteur',1);
""")
assert db.execute("SELECT same_dream_count FROM v_dream_public_counts WHERE dream_id='d1'").fetchone()[0] == 1


def blocked(query):
    try:
        db.execute(query)
    except sqlite3.IntegrityError:
        return
    raise AssertionError("Expected rule rejection: " + query)


blocked("UPDATE dreams SET title='Changed' WHERE id='d1'")
blocked("UPDATE dreams SET phase='testimony' WHERE id='d1'")
db.execute("UPDATE dreams SET phase='initiation' WHERE id='d1'")
blocked("UPDATE dreams SET summary='Changed' WHERE id='d1'")
# 0009: needs and helpers can be managed in Germination; acceptance fills slots and never overfills.
db.execute("INSERT INTO dream_help_offers(id,need_id,dream_id,offered_by) VALUES('o1','n1','d1','u2'),('o2','n1','d1','u3')")
db.execute("UPDATE dream_help_offers SET status='accepted' WHERE id='o1'")
assert db.execute("SELECT slots_filled FROM dream_needs WHERE id='n1'").fetchone()[0] == 1
blocked("UPDATE dream_help_offers SET status='accepted' WHERE id='o2'")
db.execute("UPDATE dreams SET phase='growth' WHERE id='d1'")
blocked("INSERT INTO dream_entries(id,dream_id,author_id,entry_type,body) VALUES('e1','d1','u1','addition','Not allowed')")
db.execute("INSERT INTO dream_entries(id,dream_id,author_id,entry_type,body) VALUES('e2','d1','u1','note','Owner note in Croissance')")
blocked("INSERT INTO video_call_sessions(id,initiated_by,invited_user_id) VALUES('call1','u1','u2')")
# Floraison locks the result.
db.execute("INSERT INTO media_assets(id,owner_id,external_url,media_type,storage_status) VALUES('m1','u1','https://img.test/a.jpg','image','ready')")
db.execute("UPDATE dreams SET phase='testimony',completed_at=CURRENT_TIMESTAMP,testimony_text='Done',testimony_primary_asset_id='m1',cover_media_id='m1' WHERE id='d1'")
blocked("UPDATE dreams SET testimony_text='Rewritten' WHERE id='d1'")
blocked("INSERT INTO dream_needs(id,dream_id,label) VALUES('n2','d1','Late')")

# Upgrade path: rows created before 0009 survive and gain defaults.
old = fresh("0008_email_password_beta.sql")
old.executescript("""
INSERT INTO users(id,handle,display_name,email,account_status) VALUES('demo-user-01','mock01','Mock','m@example.invalid','deactivated');
INSERT INTO dreams(id,title,summary,phase,visibility,created_by,started_at,growing_at,completed_at,testimony_text)
 VALUES('demo-dream-02-1','Construire un home studio accessible','x','testimony','public','demo-user-01',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'Un premier résultat');
""")
for path in migrations:
    if path.name > "0008_email_password_beta.sql":
        old.executescript(path.read_text(encoding="utf8"))
assert old.execute("PRAGMA foreign_key_check").fetchall() == []
assert old.execute("SELECT count(*) FROM dreams").fetchone()[0] == 1

# Demo seed applies on a fresh schema and is idempotent.
seed = (root / "seeds" / "demo_seed.sql").read_text(encoding="utf8")
s = fresh()
s.executescript(seed)
snapshot = [s.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("users", "dreams", "publications", "dream_help_offers", "talent_posts")]
s.executescript(seed)
assert snapshot == [s.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("users", "dreams", "publications", "dream_help_offers", "talent_posts")]
assert snapshot[0] == 10 and snapshot[1] == 30, snapshot
assert s.execute("SELECT count(*) FROM users WHERE is_demo=1 AND account_status<>'deactivated'").fetchone()[0] == 0

print("PASS:", len(migrations), "migrations,", len(tables), "tables, triggers, upgrade path and idempotent demo seed")
