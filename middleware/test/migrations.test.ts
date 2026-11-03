import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestD1, applyMigrations, migrationFiles, MIGRATIONS_DIR, SEEDS_DIR } from './helpers/d1.ts';
import { createApp } from './helpers/app.ts';

const count = (db: TestD1, sql: string) => Number((db.raw.prepare(sql).get() as Record<string, number>).n);
const seed = () => readFileSync(join(SEEDS_DIR, 'demo_seed.sql'), 'utf8');

test('fresh install applies 0001–0012 with no FK violations', () => {
  const db = new TestD1();
  const applied = applyMigrations(db);
  assert.equal(applied.length, migrationFiles().length);
  assert.ok(applied.length >= 12);
  assert.deepEqual(db.raw.prepare('PRAGMA foreign_key_check').all(), []);
  assert.ok(count(db, "SELECT count(*) AS n FROM sqlite_master WHERE type='table'") >= 70);
  // Original invariants are still there (title immutability, monotonic phases, intro consent, Circle-only calls).
  for (const name of ['trg_dream_title_immutable', 'trg_dream_phase_progression', 'trg_intro_consent_before_connected', 'trg_call_circle_only', 'trg_music_repost_only_original_publisher'])
    assert.equal(count(db, `SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND name='${name}'`), 1, name);
});

test('upgrade from the reproduced remote state (0001–0008 + demo rows) keeps data and adds the new model', () => {
  const db = new TestD1();
  applyMigrations(db, '0008_email_password_beta.sql');
  // Representative existing rows: demo users and dreams exactly as deployed, plus a beta member with a session.
  db.exec(readFileSync(join(import.meta.dirname, 'fixtures', 'remote-before.sql'), 'utf8'));
  db.exec(`INSERT INTO users(id,handle,display_name,email) VALUES('beta-1','jl_beta1','Beta Tester','beta@example.test');
    INSERT INTO email_password_credentials(user_id,password_salt,password_hash,password_iterations) VALUES('beta-1','00','00',210000);
    INSERT INTO auth_sessions(id,user_id,refresh_token_hash,expires_at) VALUES('s1','beta-1','h1','2030-01-01T00:00:00Z');
    INSERT INTO dream_needs(id,dream_id,label,slots_total,slots_filled) VALUES('legacy-need','demo-dream-01-1','Guitare',2,0);`);
  const before = { users: count(db, 'SELECT count(*) AS n FROM users'), dreams: count(db, 'SELECT count(*) AS n FROM dreams'), sessions: count(db, 'SELECT count(*) AS n FROM auth_sessions') };
  const titles = db.raw.prepare('SELECT id,title,summary,phase FROM dreams ORDER BY id').all();
  for (const file of migrationFiles().filter(f => f > '0008_email_password_beta.sql')) db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  assert.deepEqual(db.raw.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(count(db, 'SELECT count(*) AS n FROM users'), before.users);
  assert.equal(count(db, 'SELECT count(*) AS n FROM dreams'), before.dreams);
  assert.equal(count(db, 'SELECT count(*) AS n FROM auth_sessions'), before.sessions);
  assert.deepEqual(db.raw.prepare('SELECT id,title,summary,phase FROM dreams ORDER BY id').all(), titles, 'existing Dreams unchanged');
  // New defaults on old rows.
  assert.equal(count(db, "SELECT count(*) AS n FROM dream_needs WHERE id='legacy-need' AND category='person' AND is_required=1 AND manual_confirmed=0"), 1);
  // Then the demo seed upgrades the existing demo rows in place.
  db.exec(seed());
  assert.equal(count(db, 'SELECT count(*) AS n FROM users WHERE is_demo=1'), 10);
  assert.equal(count(db, "SELECT count(*) AS n FROM users WHERE is_demo=1 AND account_status<>'deactivated'"), 0);
  assert.equal(count(db, 'SELECT count(*) AS n FROM dreams WHERE cover_media_id IS NULL'), 0, 'every demo Dream received a cover, including legacy Floraisons');
  assert.equal(count(db, "SELECT count(*) AS n FROM publications WHERE type='dream'"), 30);
  // Locked Floraison text from before the migration is preserved, richer story added as a public entry.
  assert.equal(count(db, "SELECT count(*) AS n FROM dreams WHERE phase='testimony' AND testimony_text LIKE 'Un premier résultat%'"), 7);
  assert.equal(count(db, "SELECT count(*) AS n FROM dream_entries WHERE entry_type='testimony'"), 7);
  // Seeding again changes nothing.
  const snapshot = db.raw.prepare('SELECT (SELECT count(*) FROM dream_needs) a,(SELECT sum(slots_filled) FROM dream_needs) b,(SELECT count(*) FROM dream_help_offers) c,(SELECT count(*) FROM publications) d').get();
  db.exec(seed());
  assert.deepEqual(db.raw.prepare('SELECT (SELECT count(*) FROM dream_needs) a,(SELECT sum(slots_filled) FROM dream_needs) b,(SELECT count(*) FROM dream_help_offers) c,(SELECT count(*) FROM publications) d').get(), snapshot);
});

test('0009 rebuild allows talent publications and keeps every row that references a publication', () => {
  const db = new TestD1();
  applyMigrations(db, '0008_email_password_beta.sql');
  db.exec(`
    INSERT INTO users(id,handle,display_name,email) VALUES('a','a','A','a@x.test'),('b','b','B','b@x.test');
    INSERT INTO dreams(id,title,created_by) VALUES('d','Rêve','a');
    INSERT INTO media_assets(id,owner_id,external_url,media_type,storage_status) VALUES('m','a','https://x.test/a.wav','audio','ready'),('img','a','https://x.test/a.jpg','image','ready');
    INSERT INTO publications(id,type,author_id,dream_id,title) VALUES('p-dream','dream','a','d','Rêve');
    INSERT INTO publications(id,type,author_id,title) VALUES('p-bible','bible','a','Ps 150'),('p-music','music','a','Chant'),('p-adapt','music','a','Chant (adaptation)');
    INSERT INTO bible_editions(id,code,name,language_code) VALUES('e','E','E','fr');
    INSERT INTO bible_books(id,book_code,name,sort_order,chapter_count) VALUES('bk','PSX','Ps',1,150);
    INSERT INTO bible_posts(publication_id,edition_id,book_id,chapter,start_verse,end_verse) VALUES('p-bible','e','bk',150,6,6);
    INSERT INTO music_rights(id,publisher_id,original_creator_name,rights_holder_name,license_type,attribution_text) VALUES('r','a','A','A','own_work','© A');
    INSERT INTO music_tracks(id,publication_id,publisher_id,audio_asset_id,rights_id) VALUES('t1','p-music','a','m','r');
    INSERT INTO music_tracks(id,publication_id,publisher_id,audio_asset_id,rights_id,original_track_id) VALUES('t2','p-adapt','a','m','r','t1');
    INSERT INTO music_contributors(track_id,credit_order,display_name,contribution) VALUES('t1',0,'A','Voix'),('t2',0,'B','Violoncelle');
    INSERT INTO music_collab_proposals(id,original_track_id,proposed_by,audio_asset_id,description,status,published_track_id) VALUES('pr','t1','b','m','Violoncelle','published','t2');
    INSERT INTO music_proposal_credits(proposal_id,credit_order,display_name,contribution) VALUES('pr',0,'B','Violoncelle');
    INSERT INTO publication_media(publication_id,media_id) VALUES('p-dream','img');
    INSERT INTO fire_saves(user_id,publication_id) VALUES('b','p-bible'),('b','p-music');
    INSERT INTO prayer_saves(user_id,publication_id,scheduled_for) VALUES('b','p-dream','2027-01-01T08:00:00Z');
    INSERT INTO publication_shares(id,publication_id,shared_by,channel) VALUES('s','p-music','b','external');
    INSERT INTO conversations(id,type) VALUES('c','direct');
    INSERT INTO messages(id,conversation_id,sender_id,message_type,publication_id) VALUES('msg','c','a','publication','p-bible');
    INSERT INTO external_share_intents(id,user_id,content_type,resolved_publication_id,import_status) VALUES('i','a','bible_verse','p-bible','resolved');
    INSERT INTO dream_inspirations(dream_id,publication_id,added_by) VALUES('d','p-bible','a');
  `);
  const tables = ['publications', 'bible_posts', 'music_tracks', 'music_contributors', 'music_collab_proposals', 'music_proposal_credits', 'publication_media', 'fire_saves', 'prayer_saves', 'publication_shares', 'dream_inspirations'];
  const snapshot = () => Object.fromEntries(tables.map(t => [t, db.raw.prepare(`SELECT * FROM ${t} ORDER BY 1,2`).all()]));
  const before = snapshot();
  for (const file of migrationFiles().filter(f => f > '0008_email_password_beta.sql')) db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  const after = snapshot();
  // Later migrations add columns; compare the columns each row had before the upgrade.
  const pick = (rows: any[], keys: string[]) => rows.map(r => Object.fromEntries(keys.map(k => [k, r[k]])));
  for (const t of tables.slice(1)) assert.deepEqual(pick(after[t], Object.keys(before[t][0] ?? {})), pick(before[t], Object.keys(before[t][0] ?? {})), t + ' rows preserved');
  for (const t of tables.slice(1)) assert.ok(before[t].length > 0, t + ' had rows to preserve');
  assert.deepEqual(after.publications.map((p: any) => p.id), before.publications.map((p: any) => p.id));
  assert.equal(count(db, "SELECT count(*) AS n FROM messages WHERE id='msg' AND publication_id='p-bible'"), 1);
  assert.equal(count(db, "SELECT count(*) AS n FROM external_share_intents WHERE id='i' AND resolved_publication_id='p-bible'"), 1);
  assert.deepEqual(db.raw.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(count(db, "SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'bak0009_%'"), 0, 'temporary copies removed');
  // The view, the inspiration trigger and the indexes are back.
  assert.equal(count(db, "SELECT count(*) AS n FROM v_feed_publications"), 4);
  assert.throws(() => db.exec("INSERT INTO dream_inspirations(dream_id,publication_id,added_by) VALUES('d','nope','a')"), /inspiration publication does not exist/);
  assert.throws(() => db.exec("INSERT INTO publications(id,type,author_id,dream_id,title) VALUES('p2','dream','a','d','Doublon')"), /UNIQUE/);
  // Talent is now a publication type, with its detail row tied to the member's talent.
  db.exec(`INSERT INTO user_talents(user_id,talent_id,level) VALUES('a','talent-batterie',4);
    INSERT INTO publications(id,type,author_id,title) VALUES('p-talent','talent','a','Batterie');
    INSERT INTO talent_publications(publication_id,user_id,talent_id) VALUES('p-talent','a','talent-batterie');`);
  assert.throws(() => db.exec("INSERT INTO publications(id,type,author_id,title) VALUES('px','video','a','x')"), /CHECK/);
  assert.throws(() => db.exec("INSERT INTO talent_publications(publication_id,user_id,talent_id) VALUES('p-music','a','talent-batterie')"), /talent showcase must be/);
  db.exec("DELETE FROM user_talents WHERE user_id='a' AND talent_id='talent-batterie'");
  assert.equal(count(db, "SELECT count(*) AS n FROM publications WHERE id='p-talent' AND deleted_at IS NOT NULL"), 1, 'removing the talent retires its showcase');
});

test('reconciled triggers: needs editable until Floraison, offers fill slots atomically, results locked', () => {
  const db = new TestD1();
  applyMigrations(db);
  db.exec(`INSERT INTO users(id,handle,display_name,email) VALUES('o','o','O','o@x.test'),('h','h','H','h@x.test'),('h2','h2','H2','h2@x.test');
    INSERT INTO dreams(id,title,created_by,summary) VALUES('d','Un rêve','o','résumé');
    INSERT INTO dream_needs(id,dream_id,label,slots_total) VALUES('n','d','Batteur',1);
    UPDATE dreams SET phase='initiation' WHERE id='d';
    UPDATE dream_needs SET label='Batteur confirmé' WHERE id='n';`);
  const fails = (sql: string, fragment: string) => assert.throws(() => db.exec(sql), (e: Error) => e.message.includes(fragment), sql);
  fails("UPDATE dreams SET summary='x' WHERE id='d'", 'summary locked');
  db.exec("UPDATE dreams SET motivation='m', goal_date='2027-01-01' WHERE id='d'");
  fails("INSERT INTO dream_help_offers(id,need_id,dream_id,offered_by,status) VALUES('x','n','d','h','accepted')", 'offers start pending');
  db.exec("INSERT INTO dream_help_offers(id,need_id,dream_id,offered_by) VALUES('a','n','d','h'),('b','n','d','h2')");
  db.exec("UPDATE dream_help_offers SET status='accepted' WHERE id='a'");
  assert.equal(count(db, "SELECT slots_filled AS n FROM dream_needs WHERE id='n'"), 1);
  fails("UPDATE dream_help_offers SET status='accepted' WHERE id='b'", 'CHECK constraint failed');
  assert.equal(count(db, "SELECT count(*) AS n FROM dream_help_offers WHERE status='accepted'"), 1, 'the losing acceptance rolled back');
  fails("DELETE FROM dream_needs WHERE id='n'", 'release accepted helpers');
  db.exec("UPDATE dream_help_offers SET status='withdrawn' WHERE id='a'");
  assert.equal(count(db, "SELECT slots_filled AS n FROM dream_needs WHERE id='n'"), 0);
  db.exec("UPDATE dream_help_offers SET status='accepted' WHERE id='b'; UPDATE dreams SET phase='growth' WHERE id='d'");
  db.exec("INSERT INTO dream_entries(id,dream_id,author_id,entry_type,body) VALUES('e1','d','o','note','private note in Croissance')");
  db.exec("INSERT INTO media_assets(id,owner_id,external_url,media_type,storage_status) VALUES('m','o','https://img.test/a.jpg','image','ready')");
  db.exec("UPDATE dreams SET phase='testimony',completed_at=CURRENT_TIMESTAMP,testimony_text='Fait !',testimony_primary_asset_id='m',cover_media_id='m' WHERE id='d'");
  fails("UPDATE dreams SET testimony_text='réécrit' WHERE id='d'", 'Floraison result is locked');
  fails("UPDATE dreams SET cover_media_id=NULL WHERE id='d'", 'cover locked');
  fails("INSERT INTO dream_needs(id,dream_id,label) VALUES('n2','d','Nouveau')", 'locked in Floraison');
  fails("UPDATE dream_help_offers SET status='withdrawn' WHERE id='b'", 'locked in Floraison');
  fails("UPDATE dreams SET phase='growth' WHERE id='d'", 'invalid Dream phase transition');
  fails("UPDATE dreams SET title='Autre' WHERE id='d'", 'title cannot be changed');
});

test('Dream publication follows Dream visibility and deletion (read model cannot drift)', () => {
  const db = new TestD1();
  applyMigrations(db);
  db.exec(`INSERT INTO users(id,handle,display_name,email) VALUES('o','o','O','o@x.test');
    INSERT INTO dreams(id,title,created_by,visibility) VALUES('d','Un rêve','o','private');
    INSERT INTO publications(id,type,author_id,dream_id,title,visibility) VALUES('p','dream','o','d','Un rêve','private');
    UPDATE dreams SET visibility='public' WHERE id='d';`);
  assert.equal(count(db, "SELECT count(*) AS n FROM publications WHERE id='p' AND visibility='public'"), 1);
  db.exec("UPDATE dreams SET deleted_at=CURRENT_TIMESTAMP WHERE id='d'");
  assert.equal(count(db, "SELECT count(*) AS n FROM publications WHERE id='p' AND deleted_at IS NOT NULL"), 1);
});

test('readiness reports schema 0012 after all migrations', async () => {
  const app = createApp();
  const res = await app.call('GET', '/api/health/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.schema, '0012');
  const old = createApp({ migrations: false });
  applyMigrations(old.db, '0008_email_password_beta.sql');
  const degraded = await old.call('GET', '/api/health/ready');
  assert.equal(degraded.status, 503);
  assert.equal(degraded.body.schema, 'pre-0009');
});
