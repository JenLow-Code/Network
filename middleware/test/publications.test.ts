import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp, upload, wav, PNG, type TestApp } from './helpers/app.ts';
import { SEEDS_DIR } from './helpers/d1.ts';

function seeded(): TestApp {
  const app = createApp();
  app.db.exec(readFileSync(join(SEEDS_DIR, 'demo_seed.sql'), 'utf8'));
  return app;
}

test('scenario 16: Discovery loads the seeded demo from D1; every item opens a real detail', async () => {
  const app = seeded();
  const all: any[] = [];
  let cursor: string | null = null;
  do {
    const page = await app.call('GET', '/api/discovery?limit=12' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    assert.equal(page.status, 200);
    all.push(...page.body.items);
    cursor = page.body.nextCursor;
  } while (cursor);
  const ids = all.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicates across pages');
  const byType = (t: string) => all.filter(i => i.type === t).length;
  assert.equal(byType('dream'), 30);
  assert.equal(byType('bible'), 2);
  assert.equal(byType('music'), 3);
  assert.equal(byType('talent'), 5);
  const sorted = [...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  assert.deepEqual(all.map(i => i.createdAt), sorted.map(i => i.createdAt), 'chronological order');
  const phases = new Set(all.filter(i => i.type === 'dream').map(i => i.phase));
  assert.deepEqual([...phases].sort(), ['croissance', 'floraison', 'germination', 'semence']);
  for (const item of all) {
    const detail = await app.call('GET', `/api/publications/${item.id}`);
    assert.equal(detail.status, 200, `detail for ${item.type} ${item.id}`);
    assert.equal(detail.body.item.id, item.id);
    assert.ok(item.author.isDemo);
  }
  // Each demo Dream also resolves through the Dream endpoint (no "Rêve introuvable").
  for (const d of all.filter(i => i.type === 'dream')) assert.equal((await app.call('GET', `/api/dreams/${d.dreamId}`)).status, 200);
  // Germination cards expose required levels and confirmed progress; Floraison exposes its result.
  const germ = all.find(i => i.dreamId === 'demo-dream-01-2');
  assert.equal(germ.needsProgress.requiredTotal, 4);
  assert.equal(germ.needsProgress.requiredFilled, 2);
  assert.equal(germ.needs.find((n: any) => n.label === 'Mixage et mastering').requiredLevel, 4);
  const flor = all.find(i => i.dreamId === 'demo-dream-02-1');
  assert.equal(flor.result.media.url.startsWith('https://images.unsplash.com/'), true);
  assert.equal(flor.counts.inspiredDreams, 1, 'Fruit from lineage');
  const grow = all.find(i => i.dreamId === 'demo-dream-01-3');
  assert.ok(grow.journalPreview.text.length > 10);
  // Demo profiles are readable but can never sign in.
  const profile = await app.call('GET', '/api/users/mock04');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.church, null, 'no invented church affiliation');
  assert.ok(profile.body.profile.talents.some((t: any) => t.name === 'Batterie' && t.level === 5 && t.levelLabel === 'Professionnel'));
  const feed = await app.call('GET', '/api/users/mock04/publications');
  assert.ok(feed.body.items.length >= 4);
  assert.equal((await app.call('POST', '/v1/auth/email/login', { body: { email: 'demo-user-04@example.invalid', password: 'anything at all' } })).status, 401);
});

test('Discovery filters (type, phase, search) and the demo switch', async () => {
  const app = seeded();
  const music = await app.call('GET', '/api/discovery?type=music');
  assert.ok(music.body.items.every((i: any) => i.type === 'music'));
  assert.equal(music.body.items[0].downloadable, false);
  assert.equal(music.body.items.find((i: any) => i.title === 'Douceur').playback.appAsset, 'pierre-01-douceur');
  const germ = await app.call('GET', '/api/discovery?phase=germination');
  assert.equal(germ.body.items.length, 8);
  const search = await app.call('GET', '/api/discovery?q=piano');
  assert.ok(search.body.items.some((i: any) => i.title === 'Restaurer un piano ancien'));
  assert.equal((await app.call('GET', '/api/discovery?type=nope')).status, 422);
  const hidden = createApp({ env: { DISCOVERY_INCLUDE_DEMO: 'false' } });
  hidden.db.exec(readFileSync(join(SEEDS_DIR, 'demo_seed.sql'), 'utf8'));
  assert.equal((await hidden.call('GET', '/api/discovery')).body.items.length, 0);
  assert.equal((await hidden.call('GET', '/api/demo/dreams')).status, 404);
});

test('demo compatibility endpoints keep the deployed contract and add phase normalisation', async () => {
  const app = seeded();
  const dreams = await app.call('GET', '/api/demo/dreams?limit=100');
  assert.equal(dreams.body.dreams.length, 30);
  const d = dreams.body.dreams.find((x: any) => x.id === 'demo-dream-02-1');
  assert.equal(d.phase, 'testimony');
  assert.equal(d.phase_code, 'floraison');
  assert.equal(d.phase_label, 'Floraison');
  assert.equal(d.email, undefined);
  const user = await app.call('GET', '/api/demo/users/demo-user-01');
  assert.equal(user.body.user.handle, 'mock01');
  assert.equal(user.body.user.dreams.length, 3);
  assert.equal(user.body.user.email, undefined, 'no emails');
  assert.equal((await app.call('GET', '/api/demo/dreams?userId=real-user')).status, 400);
  // A real member never appears in the demo namespace.
  const real = await app.register('Real Person');
  void real;
  assert.equal((await app.call('GET', '/api/demo/users?limit=50')).body.users.length, 10);
});

test('scenario 12: Fire and prayer are distinct; prayer repeats without fabricated dates; actions follow the phase policy', async () => {
  const app = seeded();
  const u = await app.register('Prayer');
  const bible = 'demo-pub-bible-psaume-150-6';
  assert.equal((await app.call('POST', `/api/publications/${bible}/fire`, { token: u.token })).body.fire, true);
  assert.equal((await app.call('POST', `/api/publications/${bible}/fire`, { token: u.token })).body.fire, true, 'idempotent');
  const pr = await app.call('POST', '/api/publications/demo-pub-dream-03-1/prayer', { token: u.token, body: { repeat: 'weekly', startDate: '2026-11-03' } });
  assert.equal(pr.status, 200, JSON.stringify(pr.body));
  const fire = await app.call('GET', '/api/me/fire', { token: u.token });
  assert.deepEqual(fire.body.items.map((i: any) => i.id), [bible]);
  const prayers = await app.call('GET', '/api/me/prayers', { token: u.token });
  assert.deepEqual(prayers.body.items.map((p: any) => p.item.id), ['demo-pub-dream-03-1']);
  assert.equal((await app.call('GET', '/api/me/prayers?date=2026-11-10', { token: u.token })).body.items.length, 1, 'weekly: due a week later');
  assert.equal((await app.call('GET', '/api/me/prayers?date=2026-11-04', { token: u.token })).body.items.length, 0);
  // Fire is not offered for a Germination Dream (V1 policy); offering help is not offered on Floraison.
  assert.equal((await app.call('POST', '/api/publications/demo-pub-dream-01-2/fire', { token: u.token })).body.error.code, 'action_not_allowed');
  assert.equal((await app.call('POST', '/api/publications/demo-pub-dream-02-1/fire', { token: u.token })).status, 200);
  // Fire folders
  const folder = await app.call('POST', '/api/me/fire/folders', { token: u.token, body: { name: 'Pour le culte' } });
  assert.equal((await app.call('POST', `/api/me/fire/folders/${folder.body.id}/items/${bible}`, { token: u.token })).status, 200);
  assert.equal((await app.call('POST', `/api/me/fire/folders/${folder.body.id}/items/demo-pub-dream-03-1`, { token: u.token })).body.error.code, 'not_in_fire');
  assert.deepEqual((await app.call('GET', '/api/me/fire/folders', { token: u.token })).body.items[0].publicationIds, [bible]);
  // Viewer state flows back into Discovery.
  const disc = await app.call('GET', '/api/discovery?type=bible', { token: u.token });
  const item = disc.body.items.find((i: any) => i.id === bible);
  assert.equal(item.viewer.fire, true);
  assert.equal(item.viewer.prayer, false);
  // Anonymous readers cannot mutate.
  assert.equal((await app.call('POST', `/api/publications/${bible}/fire`)).status, 401);
});

test('scenario 11: Bible post with edition and range; detail shows the whole chapter; export follows the licence', async () => {
  const app = createApp();
  const u = await app.register('Verse');
  const editions = await app.call('GET', '/api/bible/editions');
  assert.equal(editions.body.items[0].code, 'LSG1910');
  assert.equal((await app.call('POST', '/api/bible/posts', { token: u.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 150, startVerse: 5, endVerse: 9 } })).body.error.code, 'verses_not_available');
  assert.equal((await app.call('POST', '/api/bible/posts', { token: u.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 151, startVerse: 1 } })).body.error.code, 'chapter_out_of_range');
  const post = await app.call('POST', '/api/bible/posts', { token: u.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 150, startVerse: 3, endVerse: 4, caption: 'Pour les musiciens.' } });
  assert.equal(post.status, 201, JSON.stringify(post.body));
  assert.equal(post.body.item.reference.label, 'Psaumes 150:3-4');
  assert.match(post.body.item.excerpt, /trompette/);
  const detail = await app.call('GET', `/api/bible/posts/${post.body.item.id}`);
  assert.deepEqual(detail.body.chapter.verses.map((v: any) => v.position), ['before', 'before', 'selected', 'selected', 'after', 'after']);
  const exp = await app.call('GET', `/api/bible/posts/${post.body.item.id}/export`);
  assert.match(exp.body.attribution, /Louis Segond 1910/);
  // A restricted edition refuses export.
  app.db.exec("INSERT INTO bible_editions(id,code,name,language_code,import_allowed,export_allowed) VALUES('ed-x','XRES','Édition protégée','fr',1,0); INSERT INTO bible_verses VALUES('ed-x','book-PSA',150,1,'Texte protégé');");
  const restricted = await app.call('POST', '/api/bible/posts', { token: u.token, body: { editionCode: 'XRES', bookCode: 'PSA', chapter: 150, startVerse: 1 } });
  assert.equal((await app.call('GET', `/api/bible/posts/${restricted.body.item.id}/export`)).status, 403);
  // Inbound share from another app → suggested reference → resolved post with attribution.
  const intent = await app.call('POST', '/api/bible/share-intents', { token: u.token, body: { rawText: '« Que tout ce qui respire loue l’Éternel » Ps 150.6 (YouVersion)', sourceApp: 'YouVersion' } });
  assert.deepEqual(intent.body.intent.suggestion, { bookCode: 'PSA', chapter: 150, startVerse: 6, endVerse: 6 });
  const resolved = await app.call('POST', `/api/share-intents/${intent.body.intent.id}/resolve`, { token: u.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 150, startVerse: 6 } });
  assert.equal(resolved.status, 201);
  // Create a Dream inspired by the verse.
  const inspired = await app.call('POST', `/api/publications/${post.body.item.id}/inspired-dreams`, { token: (await app.register('Other')).token, body: { title: 'Monter un orchestre de quartier' } });
  assert.equal(inspired.status, 201, JSON.stringify(inspired.body));
  assert.equal(inspired.body.dream.inspiredBy[0].publicationId, post.body.item.id);
});

test('scenario 10: music rights, adaptation proposal, publisher-only republish with all credits; no download', async () => {
  const app = createApp();
  const pub = await app.register('Publisher');
  const prop = await app.register('Proposer');
  const third = await app.register('Third');
  const audio = await upload(app, pub.token, 'music_audio', 'audio/wav', wav());
  const noRights = await app.call('POST', '/api/music', { token: pub.token, body: { title: 'Aurore', audioMediaId: audio, rightsConfirmed: false, credits: [{ displayName: 'Publisher', contribution: 'Voix' }], rights: { originalCreatorName: 'Publisher', rightsHolderName: 'Publisher', licenseType: 'own_work', attributionText: 'Publisher' } } });
  assert.equal(noRights.body.error.code, 'rights_confirmation_required');
  const external = await app.call('POST', '/api/music', { token: pub.token, body: { title: 'Reprise', externalStreamUrl: 'https://cdn.example/x.mp3', rightsConfirmed: true, credits: [{ displayName: 'X', contribution: 'Y' }], rights: { originalCreatorName: 'Autre', rightsHolderName: 'Label', licenseType: 'explicit_permission', attributionText: 'Autre / Label' } } });
  assert.equal(external.body.error.code, 'rights_evidence_required');
  const track = await app.call('POST', '/api/music', { token: pub.token, body: {
    title: 'Aurore', description: 'Démo guitare-voix', audioMediaId: audio, rightsConfirmed: true, lyrics: [{ time: 0, text: 'Au matin' }],
    credits: [{ displayName: 'Publisher', contribution: 'Composition, voix', handle: pub.handle }],
    rights: { originalCreatorName: 'Publisher', rightsHolderName: 'Publisher', licenseType: 'own_work', attributionText: '© Publisher' } } });
  assert.equal(track.status, 201, JSON.stringify(track.body));
  const id = track.body.item.id;
  assert.equal(track.body.item.downloadable, false);
  assert.ok(track.body.item.playback.url.includes('/api/media/'));
  const playback = await app.call('GET', `/api/music/${id}/playback`);
  assert.equal(playback.body.downloadable, false);
  const routes = (await app.call('GET', '/api/openapi.json')).body.paths;
  assert.ok(!Object.keys(routes).some(p => /download/i.test(p)), 'no download endpoint exists');
  // Proposal → accept → only the publisher can publish; all credits kept.
  const propAudio = await upload(app, prop.token, 'music_proposal', 'audio/wav', wav());
  assert.equal((await app.call('POST', `/api/music/${id}/proposals`, { token: pub.token, body: { description: 'self', audioMediaId: audio, credits: [{ displayName: 'P', contribution: 'x' }] } })).body.error.code, 'own_track');
  const proposal = await app.call('POST', `/api/music/${id}/proposals`, { token: prop.token, body: { description: 'Violoncelle ajouté', audioMediaId: propAudio, credits: [{ displayName: 'Proposer', contribution: 'Violoncelle', handle: prop.handle }] } });
  assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
  const pid = proposal.body.proposal.id;
  assert.equal((await app.call('GET', `/api/music-proposals/${pid}/playback`, { token: third.token })).status, 404);
  assert.equal((await app.call('POST', `/api/music-proposals/${pid}/publish`, { token: pub.token })).body.error.code, 'proposal_not_accepted');
  assert.equal((await app.call('POST', `/api/music-proposals/${pid}/accept`, { token: third.token })).status, 404);
  assert.equal((await app.call('POST', `/api/music-proposals/${pid}/accept`, { token: pub.token })).status, 200);
  assert.equal((await app.call('POST', `/api/music-proposals/${pid}/publish`, { token: prop.token })).body.error.code, 'publisher_only');
  const published = await app.call('POST', `/api/music-proposals/${pid}/publish`, { token: pub.token, headers: { 'Idempotency-Key': 'publish-key-01' } });
  assert.equal(published.status, 201, JSON.stringify(published.body));
  assert.deepEqual(published.body.item.credits.map((c: any) => c.displayName), ['Publisher', 'Proposer']);
  assert.equal(published.body.item.originalTrackId, track.body.item.trackId);
  assert.match(published.body.item.rights.attribution, /Proposer \(Violoncelle\)/);
  const again = await app.call('POST', `/api/music-proposals/${pid}/publish`, { token: pub.token, headers: { 'Idempotency-Key': 'publish-key-01' } });
  assert.equal(again.body.item.id, published.body.item.id, 'retry returns the same publication');
  // The SQL trigger also refuses a repost by anyone else.
  assert.throws(() => app.db.exec(`INSERT INTO music_tracks(id,publication_id,publisher_id,rights_id,original_track_id,external_stream_url) VALUES('t-x','${published.body.item.id}','${third.id}','r','${track.body.item.trackId}','https://x')`), /only original publisher/);
  // Withdrawal hides the track and closes adaptations.
  assert.equal((await app.call('POST', `/api/music/${id}/withdraw`, { token: pub.token })).status, 200);
  assert.equal((await app.call('GET', `/api/publications/${id}`)).status, 404);
});

test('scenario 9: talents with five levels, give/learn/tandem, samples, showcase in the feed, need matching', async () => {
  const app = createApp();
  const u = await app.register('Drummer');
  const owner = await app.register('Owner');
  const drums = (await app.call('GET', '/api/talents?q=Batterie')).body.items[0].id;
  assert.equal((await app.call('POST', '/api/me/talents', { token: u.token, body: { talentId: drums, level: 6 } })).status, 422);
  const add = await app.call('POST', '/api/me/talents', { token: u.token, body: { talentId: drums, level: 'Avancé', canTeach: true, wantsTandem: true, availableForProjects: true, description: 'Batteur de gospel.', publish: true } });
  assert.equal(add.status, 201, JSON.stringify(add.body));
  const tile = add.body.items[0];
  assert.equal(tile.level, 4);
  assert.equal(tile.levelLabel, 'Avancé');
  assert.deepEqual(tile.seeking, ['Tandem', 'Élèves']);
  const sample = await upload(app, u.token, 'talent_sample', 'image/png', PNG);
  assert.equal((await app.call('POST', `/api/me/talents/${drums}/media`, { token: u.token, body: { mediaId: sample } })).status, 201);
  const feed = await app.call('GET', '/api/discovery?type=talent');
  const card = feed.body.items[0];
  assert.equal(card.type, 'talent');
  assert.equal(card.samples.length, 1);
  assert.equal(card.counts.encouragements, undefined);
  assert.equal((await app.call('POST', `/api/talent-posts/${card.id}/encouragements`, { token: owner.token })).body.encouraged, true);
  const mine = await app.call('GET', `/api/talent-posts/${card.id}`, { token: u.token });
  assert.equal(mine.body.item.counts.encouragements, 1, 'owner sees the count');
  // Matching: need requires level 3 → Advanced drummer matches; level 5 → nobody.
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Un concert', needs: [{ label: 'Batteur', talentId: drums, requiredLevel: 3 }, { label: 'Batteur pro', talentId: drums, requiredLevel: 5 }] } });
  const [n3, n5] = d.body.dream.needs;
  assert.equal(n3.requiredLevel, 3, 'dots on a need are the required level, not progress');
  assert.equal((await app.call('GET', `/api/needs/${n3.id}/matches`, { token: owner.token })).body.items[0].member.id, u.id);
  assert.equal((await app.call('GET', `/api/needs/${n5.id}/matches`, { token: owner.token })).body.items.length, 0);
  const search = await app.call('GET', `/api/talent-search?talentId=${drums}&minLevel=4&available=1&mode=teach`, { token: owner.token });
  assert.equal(search.body.items.length, 1);
  // Unpublish removes the showcase from Discovery but keeps the talent.
  await app.call('PATCH', `/api/me/talents/${drums}`, { token: u.token, body: { publish: false } });
  assert.equal((await app.call('GET', '/api/discovery?type=talent')).body.items.length, 0);
  assert.equal((await app.call('GET', '/api/me/talents', { token: u.token })).body.items.length, 1);
});

test('profiles: featured post rules, preferences, church optional, blocks hide content both ways', async () => {
  const app = createApp();
  const a = await app.register('Alice');
  const b = await app.register('Bob');
  const cover = await upload(app, a.token, 'dream_cover', 'image/png', PNG);
  const pubDream = await app.call('POST', '/api/dreams', { token: a.token, body: { title: 'Public', visibility: 'public', coverMediaId: cover } });
  const privDream = await app.call('POST', '/api/dreams', { token: a.token, body: { title: 'Privé' } });
  assert.equal((await app.call('PUT', '/api/me/featured-post', { token: a.token, body: { publicationId: privDream.body.dream.id } })).body.error.code, 'publication_not_eligible');
  assert.equal((await app.call('PUT', '/api/me/featured-post', { token: b.token, body: { publicationId: pubDream.body.dream.id } })).body.error.code, 'publication_not_eligible');
  assert.equal((await app.call('PUT', '/api/me/featured-post', { token: a.token, body: { publicationId: pubDream.body.dream.id } })).status, 200);
  assert.equal((await app.call('GET', `/api/users/${a.handle}`)).body.profile.featured.id, pubDream.body.dream.id);
  // Featured post that becomes private falls back to none.
  await app.call('PATCH', `/api/dreams/${pubDream.body.dream.dreamId}`, { token: a.token, body: { visibility: 'private' } });
  assert.equal((await app.call('GET', `/api/users/${a.handle}`)).body.profile.featured, null);
  // Profile edits, church only shown when chosen, email never public.
  await app.call('PATCH', '/api/me', { token: a.token, body: { bio: 'Je chante.', church: 'Église du quartier', handle: 'alice.chante' } });
  let profile = await app.call('GET', '/api/users/alice.chante');
  assert.equal(profile.body.profile.church, null);
  assert.equal(profile.body.profile.email, undefined);
  await app.call('PATCH', '/api/me/preferences', { token: a.token, body: { showChurch: true, locale: 'en', timezone: 'Europe/Zurich', appearance: 'dark', notificationOptOuts: ['music'] } });
  profile = await app.call('GET', '/api/users/alice.chante');
  assert.equal(profile.body.profile.church, 'Église du quartier');
  assert.equal((await app.call('PATCH', '/api/me/preferences', { token: a.token, body: { timezone: 'Mars/Olympus' } })).status, 422);
  assert.equal((await app.call('PATCH', '/api/me', { token: b.token, body: { handle: 'alice.chante' } })).body.error.code, 'handle_taken');
  // Blocks hide the profile and the content in both directions.
  await app.call('PATCH', `/api/dreams/${pubDream.body.dream.dreamId}`, { token: a.token, body: { visibility: 'public' } });
  assert.equal((await app.call('GET', `/api/dreams/${pubDream.body.dream.dreamId}`, { token: b.token })).status, 200);
  await app.call('POST', '/api/users/alice.chante/block', { token: b.token });
  assert.equal((await app.call('GET', '/api/users/alice.chante', { token: b.token })).status, 404);
  assert.equal((await app.call('GET', `/api/dreams/${pubDream.body.dream.dreamId}`, { token: b.token })).status, 404);
  assert.equal((await app.call('GET', `/api/users/${b.handle}`, { token: a.token })).status, 404, 'blocked member cannot see the blocker either');
  assert.equal((await app.call('GET', '/api/discovery', { token: b.token })).body.items.length, 0);
  await app.call('DELETE', '/api/users/alice.chante/block', { token: b.token });
  assert.equal((await app.call('GET', '/api/discovery', { token: b.token })).body.items.length, 1);
  // Private profile is hidden from others, visible to its owner.
  await app.call('PATCH', '/api/me/preferences', { token: a.token, body: { profileVisibility: 'private' } });
  assert.equal((await app.call('GET', '/api/users/alice.chante', { token: b.token })).status, 404);
  assert.equal((await app.call('GET', '/api/users/alice.chante', { token: a.token })).status, 200);
});

test('data export and deletion request (GDPR basics)', async () => {
  const app = createApp();
  const u = await app.register('Leaving', 'leaving@example.test');
  await app.call('POST', '/api/dreams', { token: u.token, body: { title: 'Mon rêve' } });
  await app.call('POST', '/api/me/consents', { token: u.token, body: { consentType: 'privacy', policyVersion: '2026-11', granted: true } });
  const exp = await app.call('GET', '/api/me/export', { token: u.token });
  assert.equal(exp.status, 200);
  assert.equal(exp.body.dreams.length, 1);
  assert.equal(exp.body.consents.length, 1);
  assert.match(exp.headers.get('content-disposition') || '', /attachment/);
  const del = await app.call('POST', '/api/me/deletion-request', { token: u.token });
  assert.equal(del.status, 202);
  assert.equal((await app.call('GET', '/api/me', { token: u.token })).status, 401);
  assert.equal((await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: u.refresh } })).status, 401);
});
