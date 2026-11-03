import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestD1, applyMigrations, migrationFiles, MIGRATIONS_DIR, SEEDS_DIR } from './helpers/d1.ts';
import { createApp } from './helpers/app.ts';

const count = (db: TestD1, sql: string) => Number((db.raw.prepare(sql).get() as Record<string, number>).n);
const seed = () => readFileSync(join(SEEDS_DIR, 'demo_seed.sql'), 'utf8');

test('fresh install applies 0001–0011 with no FK violations', () => {
  const db = new TestD1();
  const applied = applyMigrations(db);
  assert.equal(applied.length, migrationFiles().length);
  assert.ok(applied.length >= 11);
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

test('readiness reports schema 0011 after all migrations', async () => {
  const app = createApp();
  const res = await app.call('GET', '/api/health/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.schema, '0011');
  const old = createApp({ migrations: false });
  applyMigrations(old.db, '0008_email_password_beta.sql');
  const degraded = await old.call('GET', '/api/health/ready');
  assert.equal(degraded.status, 503);
  assert.equal(degraded.body.schema, 'pre-0009');
});
