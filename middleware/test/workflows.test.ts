import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp, upload, wav, PNG, type TestApp } from './helpers/app.ts';
import { SEEDS_DIR } from './helpers/d1.ts';

type U = { id: string; token: string; handle: string; refresh: string };
const ok = (res: { status: number; body: unknown }, expected = 200) => assert.equal(res.status, expected, JSON.stringify(res.body));

async function contacts(app: TestApp, a: U, b: U) {
  const r = await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  ok(r, 201);
  ok(await app.call('POST', `/api/contacts/requests/${r.body.request.id}/accept`, { token: b.token }));
}
async function germinatingDream(app: TestApp, owner: U, needs: unknown[] = [{ label: 'Batteur' }]) {
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Rêve de test', coverMediaId: cover, needs } });
  ok(d, 201);
  ok(await app.call('POST', `/api/dreams/${d.body.dream.dreamId}/transitions`, { token: owner.token, body: { to: 'germination' } }));
  return d.body.dream as { dreamId: string; id: string; needs: { id: string }[] };
}

test('profile reads: preferences, my publications, featured post, talents, search, blocks list, legacy deletion alias', async () => {
  const app = createApp();
  const a = await app.register('Alice Martin'), b = await app.register('Bruno');
  ok(await app.call('GET', '/api/me/preferences', { token: a.token }));
  const d = await app.call('POST', '/api/dreams', { token: a.token, body: { title: 'Un brouillon' } });
  const mine = await app.call('GET', '/api/me/publications', { token: a.token });
  assert.equal(mine.body.items[0].locked, true);
  assert.equal((await app.call('GET', '/api/me/featured-post', { token: a.token })).body.item, null);
  await app.call('PATCH', `/api/dreams/${d.body.dream.dreamId}`, { token: a.token, body: { visibility: 'public' } });
  ok(await app.call('PUT', '/api/me/featured-post', { token: a.token, body: { publicationId: d.body.dream.id } }));
  assert.equal((await app.call('GET', '/api/me/featured-post', { token: a.token })).body.item.id, d.body.dream.id);
  ok(await app.call('DELETE', '/api/me/featured-post', { token: a.token }));
  assert.deepEqual((await app.call('GET', `/api/users/${a.handle}/talents`)).body.items, []);
  const search = await app.call('GET', '/api/users?q=Alice', { token: b.token });
  assert.equal(search.body.items[0].handle, a.handle);
  assert.equal((await app.call('GET', '/api/users?q=A', { token: b.token })).status, 422);
  await app.call('POST', `/api/users/${a.handle}/block`, { token: b.token });
  assert.equal((await app.call('GET', '/api/users?q=Alice', { token: b.token })).body.items.length, 0, 'blocked members are not searchable');
  assert.equal((await app.call('GET', '/api/me/blocks', { token: b.token })).body.items[0].handle, a.handle);
  ok(await app.call('POST', '/v1/account/deletion-request', { token: b.token }), 202);
});

test('Dream reads and edits: history, readiness, conversation, gallery, blocks, needs edit/delete/unconfirm, entries, milestones, habits, inspirations', async () => {
  const app = createApp();
  const owner = await app.register('Owner'), helper = await app.register('Helper');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Atelier', coverMediaId: cover } });
  const id = d.body.dream.dreamId;
  // Semence gallery and blocks
  const g = await upload(app, owner.token, 'dream_gallery', 'image/png', PNG);
  ok(await app.call('POST', `/api/dreams/${id}/media`, { token: owner.token, body: { mediaId: g, caption: 'Inspiration' } }), 201);
  assert.equal((await app.call('GET', `/api/dreams/${id}`, { token: owner.token })).body.dream.gallery.length, 1);
  ok(await app.call('DELETE', `/api/dreams/${id}/media/${g}`, { token: owner.token }));
  const block = await app.call('POST', `/api/dreams/${id}/blocks`, { token: owner.token, body: { kind: 'text', content: 'Idée' } });
  ok(await app.call('PATCH', `/api/dream-blocks/${block.body.id}`, { token: owner.token, body: { content: 'Idée affinée', props: { tone: 'sage' } } }));
  assert.equal((await app.call('GET', `/api/dreams/${id}/blocks`, { token: owner.token })).body.items[0].content, 'Idée affinée');
  ok(await app.call('DELETE', `/api/dream-blocks/${block.body.id}`, { token: owner.token }));
  ok(await app.call('POST', `/api/dreams/${id}/entries`, { token: owner.token, body: { type: 'addition', body: 'Une citation qui m’inspire' } }), 201);
  // Germination
  ok(await app.call('POST', `/api/dreams/${id}/transitions`, { token: owner.token, body: { to: 'germination' } }));
  assert.equal((await app.call('GET', `/api/dreams/${id}/phase-history`)).body.items.map((h: any) => h.to).join(','), 'semence,germination');
  const readiness = await app.call('GET', `/api/dreams/${id}/readiness`, { token: owner.token });
  assert.equal(readiness.body.permissions.nextPhase, 'croissance');
  const n = await app.call('POST', `/api/dreams/${id}/needs`, { token: owner.token, body: { label: 'Local', category: 'practical', slotsTotal: 2 } });
  ok(await app.call('PATCH', `/api/needs/${n.body.id}`, { token: owner.token, body: { label: 'Local de répétition', slotsTotal: 1, description: 'Un soir par semaine' } }));
  ok(await app.call('POST', `/api/needs/${n.body.id}/confirm`, { token: owner.token }));
  assert.equal((await app.call('PATCH', `/api/needs/${n.body.id}`, { token: owner.token, body: { slotsTotal: 0 } })).status, 422);
  ok(await app.call('POST', `/api/needs/${n.body.id}/unconfirm`, { token: owner.token }));
  assert.equal((await app.call('POST', `/api/needs/${n.body.id}/unconfirm`, { token: owner.token })).body.error.code, 'nothing_to_unconfirm');
  const needs = await app.call('GET', `/api/dreams/${id}/needs`);
  assert.equal(needs.body.items[0].label, 'Local de répétition');
  // A pending offer is declined when its need is removed.
  const offer = await app.call('POST', `/api/needs/${n.body.id}/offers`, { token: helper.token, body: { message: 'J’ai une salle' } });
  ok(offer, 201);
  ok(await app.call('DELETE', `/api/needs/${n.body.id}`, { token: owner.token }));
  assert.equal((await app.call('GET', `/api/me/offers`, { token: helper.token })).body.items.length, 0, 'offer removed with its need');
  // Milestones, then Croissance with no needs left (UI rule: all resources confirmed).
  const ms = await app.call('POST', `/api/dreams/${id}/milestones`, { token: owner.token, body: { title: 'Première répétition', dueDate: '2026-12-01' } });
  ok(await app.call('PATCH', `/api/milestones/${ms.body.id}`, { token: owner.token, body: { done: true } }));
  assert.equal((await app.call('GET', `/api/dreams/${id}/milestones`, { token: owner.token })).body.items[0].done, true);
  ok(await app.call('DELETE', `/api/milestones/${ms.body.id}`, { token: owner.token }));
  await app.call('PATCH', `/api/dreams/${id}`, { token: owner.token, body: { goalDate: '2027-06-01' } });
  ok(await app.call('POST', `/api/dreams/${id}/transitions`, { token: owner.token, body: { to: 'croissance' } }));
  assert.ok((await app.call('GET', `/api/dreams/${id}/conversation`, { token: owner.token })).body.conversationId.startsWith('dconv_'));
  const entry = await app.call('POST', `/api/dreams/${id}/entries`, { token: owner.token, body: { type: 'progress', body: 'Avancée', entryDate: '2026-11-03' } });
  ok(await app.call('PATCH', `/api/entries/${entry.body.id}`, { token: owner.token, body: { body: 'Avancée réelle', visibility: 'participants' } }));
  assert.equal((await app.call('GET', `/api/dreams/${id}/entries`)).body.items.length, 0, 'participants-only entry hidden from the public');
  assert.equal((await app.call('GET', `/api/dreams/${id}/entries`, { token: owner.token })).body.items.length, 2);
  ok(await app.call('DELETE', `/api/entries/${entry.body.id}`, { token: owner.token }));
  const habit = await app.call('POST', `/api/dreams/${id}/habits`, { token: owner.token, body: { title: 'Écrire', frequency: 'weekly' } });
  await app.call('POST', `/api/habits/${habit.body.id}/checks`, { token: owner.token, body: { day: '2026-11-03' } });
  ok(await app.call('DELETE', `/api/habits/${habit.body.id}/checks/2026-11-03`, { token: owner.token }));
  ok(await app.call('DELETE', `/api/habits/${habit.body.id}`, { token: owner.token }));
  assert.equal((await app.call('GET', `/api/dreams/${id}/habits`, { token: owner.token })).body.items.length, 0);
  // Attach an existing visible publication as an inspiration.
  const bible = await app.call('POST', '/api/bible/posts', { token: helper.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 150, startVerse: 4 } });
  ok(await app.call('POST', `/api/dreams/${id}/inspirations`, { token: owner.token, body: { publicationId: bible.body.item.id } }), 201);
  assert.equal((await app.call('GET', `/api/dreams/${id}`)).body.dream.inspiredBy[0].publicationId, bible.body.item.id);
});

test('offers and roles: decline, owner lists, my offers, owner-invitation decline/revoke, collaborator invite/respond/leave, reaction undo', async () => {
  const app = createApp();
  const owner = await app.register('Owner'), helper = await app.register('Helper'), friend = await app.register('Friend');
  const d = await germinatingDream(app, owner);
  const offer = await app.call('POST', `/api/needs/${d.needs[0].id}/offers`, { token: helper.token, body: {} });
  assert.equal((await app.call('GET', `/api/dreams/${d.dreamId}/offers?status=pending`, { token: owner.token })).body.items[0].helper.id, helper.id);
  assert.equal((await app.call('GET', `/api/dreams/${d.dreamId}/offers`, { token: helper.token })).status, 403);
  ok(await app.call('POST', `/api/offers/${offer.body.offer.id}/decline`, { token: owner.token }));
  assert.equal((await app.call('GET', '/api/me/offers', { token: helper.token })).body.items[0].status, 'declined');
  // Re-offering after a decline is allowed and returns to pending.
  assert.equal((await app.call('POST', `/api/needs/${d.needs[0].id}/offers`, { token: helper.token, body: {} })).body.offer.status, 'pending');
  // Owner invitations
  const inv = await app.call('POST', `/api/dreams/${d.dreamId}/owner-invitations`, { token: owner.token, body: { handle: friend.handle } });
  assert.equal((await app.call('GET', `/api/dreams/${d.dreamId}/owner-invitations`, { token: owner.token })).body.items[0].status, 'pending');
  ok(await app.call('POST', `/api/owner-invitations/${inv.body.invitation.id}/decline`, { token: friend.token }));
  const inv2 = await app.call('POST', `/api/dreams/${d.dreamId}/owner-invitations`, { token: owner.token, body: { handle: friend.handle } });
  assert.equal(inv2.body.invitation.id, inv.body.invitation.id, 'invitation reused after a decline');
  ok(await app.call('POST', `/api/owner-invitations/${inv2.body.invitation.id}/revoke`, { token: owner.token }));
  assert.equal((await app.call('POST', `/api/owner-invitations/${inv2.body.invitation.id}/accept`, { token: friend.token })).body.error.code, 'invitation_not_pending');
  // Collaborator invitation (not an owner)
  ok(await app.call('POST', `/api/dreams/${d.dreamId}/collaborators`, { token: owner.token, body: { handle: friend.handle, roleTitle: 'Coach vocal' } }), 201);
  ok(await app.call('POST', `/api/dreams/${d.dreamId}/collaborators/respond`, { token: friend.token, body: { accept: true } }));
  let view = await app.call('GET', `/api/dreams/${d.dreamId}`, { token: owner.token });
  assert.ok(view.body.dream.collaborators.some((c: any) => c.id === friend.id && c.roleTitle === 'Coach vocal'));
  ok(await app.call('DELETE', `/api/dreams/${d.dreamId}/collaborators/${friend.handle}`, { token: friend.token }));
  view = await app.call('GET', `/api/dreams/${d.dreamId}`, { token: owner.token });
  assert.ok(!view.body.dream.collaborators.some((c: any) => c.id === friend.id && c.status === 'accepted'));
  // Reaction undo on a Semence Dream, legacy participants list for owners.
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const s = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Semence publique', visibility: 'public', coverMediaId: cover } });
  await app.call('POST', `/api/dreams/${s.body.dream.dreamId}/same-dream`, { token: helper.token });
  assert.equal((await app.call('GET', `/v1/dreams/${s.body.dream.dreamId}/participants`, { token: owner.token })).body.participants.length, 1);
  assert.deepEqual((await app.call('DELETE', `/api/dreams/${s.body.dream.dreamId}/same-dream`, { token: helper.token })).body, { sameDream: false, sameDreamCount: 0 });
  await app.call('POST', `/api/dreams/${s.body.dream.dreamId}/encouragements`, { token: helper.token });
  ok(await app.call('DELETE', `/api/dreams/${s.body.dream.dreamId}/encouragements`, { token: helper.token }));
  assert.equal((await app.call('GET', `/api/dreams/${s.body.dream.dreamId}/encouragements`, { token: owner.token })).body.count, 0);
});

test('Fire, prayer and shares: undo paths, folder rename/delete, talent prayers, reminders list/cancel, internal share to a contact', async () => {
  const app = createApp();
  app.db.exec(readFileSync(join(SEEDS_DIR, 'demo_seed.sql'), 'utf8'));
  const u = await app.register('Saver'), friend = await app.register('Friend');
  const bible = 'demo-pub-bible-psaume-150-1';
  await app.call('POST', `/api/publications/${bible}/fire`, { token: u.token });
  const folder = await app.call('POST', '/api/me/fire/folders', { token: u.token, body: { name: 'Matin' } });
  await app.call('POST', `/api/me/fire/folders/${folder.body.id}/items/${bible}`, { token: u.token });
  ok(await app.call('PATCH', `/api/me/fire/folders/${folder.body.id}`, { token: u.token, body: { name: 'Le matin' } }));
  ok(await app.call('DELETE', `/api/me/fire/folders/${folder.body.id}/items/${bible}`, { token: u.token }));
  ok(await app.call('DELETE', `/api/me/fire/folders/${folder.body.id}`, { token: u.token }));
  ok(await app.call('DELETE', `/api/publications/${bible}/fire`, { token: u.token }));
  assert.equal((await app.call('GET', '/api/me/fire', { token: u.token })).body.items.length, 0);
  await app.call('POST', `/api/publications/${bible}/prayer`, { token: u.token, body: {} });
  ok(await app.call('DELETE', `/api/publications/${bible}/prayer`, { token: u.token }));
  const talent = 'demo-pub-talent-09-piano';
  ok(await app.call('POST', `/api/publications/${talent}/prayer`, { token: u.token, body: { repeat: 'once' } }));
  assert.equal((await app.call('GET', '/api/me/prayers', { token: u.token })).body.items[0].item.type, 'talent');
  ok(await app.call('DELETE', `/api/publications/${talent}/prayer`, { token: u.token }));
  await app.call('POST', '/api/me/prayer-reminders', { token: u.token, body: { publicationId: bible, scheduledFor: '2031-05-01T07:00:00+02:00' } });
  const reminders = await app.call('GET', '/api/me/prayer-reminders', { token: u.token });
  assert.equal(reminders.body.items[0].scheduledFor, '2031-05-01T05:00:00Z');
  ok(await app.call('DELETE', '/api/me/prayer-reminders', { token: u.token, body: { publicationId: bible, scheduledFor: '2031-05-01T05:00:00Z' } }));
  assert.equal((await app.call('GET', '/api/me/prayer-reminders', { token: u.token })).body.items.length, 0);
  // Shares: external is recorded; internal needs a contact and lands in the direct thread.
  ok(await app.call('POST', `/api/publications/demo-pub-dream-02-1/shares`, { token: u.token, body: { channel: 'external' } }), 201);
  assert.equal((await app.call('POST', `/api/publications/demo-pub-dream-02-1/shares`, { token: u.token, body: { channel: 'internal', toHandle: friend.handle } })).body.error.code, 'contact_required');
  await contacts(app, u as U, friend as U);
  const share = await app.call('POST', `/api/publications/demo-pub-dream-02-1/shares`, { token: u.token, body: { channel: 'internal', toHandle: friend.handle } });
  ok(share, 201);
  const msgs = await app.call('GET', `/api/conversations/${share.body.conversationId}/messages`, { token: friend.token });
  assert.equal(msgs.body.items[0].publication.id, 'demo-pub-dream-02-1');
  assert.equal((await app.call('POST', `/api/publications/demo-pub-dream-01-1/shares`, { token: u.token, body: { channel: 'external' } })).body.error.code, 'action_not_allowed', 'Semence is not shared externally');
});

test('talents and music: removals, encouragement undo, music hub, detail, edit, delete, inspired Dream, proposal lists/reject/submit/withdraw', async () => {
  const app = createApp();
  const pub = await app.register('Publisher'), prop = await app.register('Proposer');
  const drums = (await app.call('GET', '/api/talents?category=music')).body.items.find((t: any) => t.name === 'Batterie').id;
  await app.call('POST', '/api/me/talents', { token: pub.token, body: { talentId: drums, level: 3, publish: true } });
  const sample = await upload(app, pub.token, 'talent_sample', 'image/png', PNG);
  await app.call('POST', `/api/me/talents/${drums}/media`, { token: pub.token, body: { mediaId: sample } });
  ok(await app.call('DELETE', `/api/me/talents/${drums}/media/${sample}`, { token: pub.token }));
  const showcase = (await app.call('GET', '/api/discovery?type=talent')).body.items[0].id;
  await app.call('POST', `/api/talent-posts/${showcase}/encouragements`, { token: prop.token });
  ok(await app.call('DELETE', `/api/talent-posts/${showcase}/encouragements`, { token: prop.token }));
  ok(await app.call('DELETE', `/api/me/talents/${drums}`, { token: pub.token }));
  assert.equal((await app.call('GET', `/api/talent-posts/${showcase}`)).status, 404);
  // Music
  const audio = await upload(app, pub.token, 'music_audio', 'audio/wav', wav());
  const t = await app.call('POST', '/api/music', { token: pub.token, body: { title: 'Psaume du soir', audioMediaId: audio, rightsConfirmed: true, credits: [{ displayName: 'Publisher', contribution: 'Voix' }], rights: { originalCreatorName: 'Publisher', rightsHolderName: 'Publisher', licenseType: 'own_work', attributionText: '© Publisher' } } });
  const id = t.body.item.id;
  assert.equal((await app.call('GET', '/api/music')).body.items[0].id, id);
  ok(await app.call('PATCH', `/api/music/${id}`, { token: pub.token, body: { description: 'Version guitare-voix', lyrics: [{ time: 0, text: 'Le soir tombe' }] } }));
  assert.equal((await app.call('GET', `/api/music/${id}`)).body.item.lyrics[0].text, 'Le soir tombe');
  ok(await app.call('POST', `/api/music/${id}/inspired-dreams`, { token: prop.token, body: { title: 'Écrire mon propre psaume' } }), 201);
  const pa = await upload(app, prop.token, 'music_proposal', 'audio/wav', wav());
  const draft = await app.call('POST', `/api/music/${id}/proposals`, { token: prop.token, body: { description: 'Harmonies', audioMediaId: pa, submit: false, credits: [{ displayName: 'Proposer', contribution: 'Chœurs' }] } });
  assert.equal(draft.body.proposal.status, 'draft');
  assert.equal((await app.call('GET', `/api/music/${id}/proposals`, { token: pub.token })).body.items.length, 0, 'drafts are private to the proposer');
  ok(await app.call('POST', `/api/music-proposals/${draft.body.proposal.id}/submit`, { token: prop.token }));
  assert.equal((await app.call('GET', '/api/me/music-proposals?role=received', { token: pub.token })).body.items.length, 1);
  assert.equal((await app.call('GET', '/api/me/music-proposals?role=sent', { token: prop.token })).body.items[0].credits[0].displayName, 'Proposer');
  assert.ok((await app.call('GET', `/api/music-proposals/${draft.body.proposal.id}/playback`, { token: pub.token })).body.url);
  ok(await app.call('POST', `/api/music-proposals/${draft.body.proposal.id}/reject`, { token: pub.token, body: { response: 'Merci, pas cette fois.' } }));
  const second = await app.call('POST', `/api/music/${id}/proposals`, { token: prop.token, body: { description: 'Autre idée', audioMediaId: pa, credits: [{ displayName: 'Proposer', contribution: 'Basse' }] } });
  ok(await app.call('POST', `/api/music-proposals/${second.body.proposal.id}/withdraw`, { token: prop.token }));
  assert.equal((await app.call('GET', `/api/music/${id}/proposals`, { token: prop.token })).body.items.length, 2);
  ok(await app.call('DELETE', `/api/music/${id}`, { token: pub.token }));
  assert.equal((await app.call('GET', `/api/music/${id}`)).status, 404);
});

test('Bible reads and share-intent reject', async () => {
  const app = createApp();
  const u = await app.register('Reader');
  const books = await app.call('GET', '/api/bible/books');
  assert.equal(books.body.items.length, 66);
  const chapter = await app.call('GET', '/api/bible/editions/LSG1910/books/PSA/chapters/150?from=2&to=3');
  assert.deepEqual(chapter.body.verses.map((v: any) => v.position), ['before', 'selected', 'selected', 'after', 'after', 'after']);
  assert.equal((await app.call('GET', '/api/bible/editions/LSG1910/books/PSA/chapters/1')).status, 404, 'not imported → honest 404');
  const intent = await app.call('POST', '/api/bible/share-intents', { token: u.token, body: { rawText: 'Romains 8:28' } });
  assert.equal((await app.call('GET', '/api/me/share-intents', { token: u.token })).body.items[0].suggestion.bookCode, 'ROM');
  ok(await app.call('POST', `/api/share-intents/${intent.body.intent.id}/reject`, { token: u.token }));
  assert.equal((await app.call('GET', '/api/me/share-intents', { token: u.token })).body.items.length, 0);
});

test('social undo paths: contact decline/cancel/remove, Circle request list/decline, my introductions, call decline and detail', async () => {
  const app = createApp();
  const a = await app.register('Anna'), b = await app.register('Ben'), c = await app.register('Chloé'), owner = await app.register('Owner');
  const r1 = await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  ok(await app.call('POST', `/api/contacts/requests/${r1.body.request.id}/decline`, { token: b.token }));
  const r2 = await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  assert.equal(r2.body.request.id, r1.body.request.id);
  ok(await app.call('POST', `/api/contacts/requests/${r2.body.request.id}/cancel`, { token: a.token }));
  await contacts(app, a as U, b as U);
  ok(await app.call('DELETE', `/api/contacts/${b.handle}`, { token: a.token }));
  assert.equal((await app.call('GET', '/api/contacts', { token: b.token })).body.items.length, 0, 'removed both ways');
  await contacts(app, a as U, c as U);
  const cr = await app.call('POST', '/api/circle/requests', { token: a.token, body: { handle: c.handle } });
  assert.equal((await app.call('GET', '/api/circle/requests?box=inbox', { token: c.token })).body.items[0].id, cr.body.request.id);
  assert.equal((await app.call('GET', '/api/circle/requests?box=outbox', { token: a.token })).body.items.length, 1);
  ok(await app.call('POST', `/api/circle/requests/${cr.body.request.id}/decline`, { token: c.token }));
  const cr2 = await app.call('POST', '/api/circle/requests', { token: a.token, body: { handle: c.handle } });
  await app.call('POST', `/api/circle/requests/${cr2.body.request.id}/accept`, { token: c.token });
  const d = await germinatingDream(app, owner as U);
  const intro = await app.call('POST', '/api/introductions', { token: a.token, body: { dreamId: d.dreamId, introducedHandle: c.handle } });
  const mineA = await app.call('GET', '/api/me/introductions', { token: a.token });
  assert.equal(mineA.body.items[0].myRole, 'initiator');
  assert.equal((await app.call('GET', '/api/me/introductions', { token: owner.token })).body.items[0].myRole, 'owner');
  void intro;
  const call = await app.call('POST', '/api/calls', { token: a.token, body: { handle: c.handle } });
  assert.equal((await app.call('GET', `/api/calls/${call.body.call.id}`, { token: c.token })).body.call.status, 'inviting');
  assert.equal((await app.call('POST', `/api/calls/${call.body.call.id}/decline`, { token: c.token })).body.call.status, 'declined');
});

test('messaging controls: conversation detail, mute, archive/unarchive, leave a group, reaction removal', async () => {
  const app = createApp();
  const owner = await app.register('Owner'), helper = await app.register('Helper');
  const d = await germinatingDream(app, owner as U);
  const offer = await app.call('POST', `/api/needs/${d.needs[0].id}/offers`, { token: helper.token, body: {} });
  await app.call('POST', `/api/offers/${offer.body.offer.id}/accept`, { token: owner.token });
  await app.call('PATCH', `/api/dreams/${d.dreamId}`, { token: owner.token, body: { goalDate: '2027-01-01' } });
  ok(await app.call('POST', `/api/dreams/${d.dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } }));
  const convId = (await app.call('GET', `/api/dreams/${d.dreamId}/conversation`, { token: helper.token })).body.conversationId;
  const detail = await app.call('GET', `/api/conversations/${convId}`, { token: helper.token });
  assert.equal(detail.body.conversation.type, 'dream');
  assert.equal(detail.body.conversation.members.length, 2);
  const msgs = await app.call('GET', `/api/conversations/${convId}/messages`, { token: helper.token });
  assert.equal(msgs.body.items[0].type, 'system');
  const m = await app.call('POST', `/api/conversations/${convId}/messages`, { token: owner.token, body: { body: 'Bienvenue !' } });
  await app.call('POST', `/api/messages/${m.body.message.id}/reactions`, { token: helper.token, body: { reaction: '❤️' } });
  ok(await app.call('DELETE', `/api/messages/${m.body.message.id}/reactions/${encodeURIComponent('❤️')}`, { token: helper.token }));
  ok(await app.call('POST', `/api/conversations/${convId}/mute`, { token: helper.token, body: { until: '2030-01-01T00:00:00Z' } }));
  ok(await app.call('POST', `/api/conversations/${convId}/archive`, { token: helper.token }));
  assert.equal((await app.call('GET', '/api/conversations', { token: helper.token })).body.items.length, 0);
  assert.equal((await app.call('GET', '/api/conversations?archived=1', { token: helper.token })).body.items[0].muted, true);
  ok(await app.call('POST', `/api/conversations/${convId}/unarchive`, { token: helper.token }));
  ok(await app.call('POST', `/api/conversations/${convId}/leave`, { token: helper.token }));
  assert.equal((await app.call('GET', `/api/conversations/${convId}`, { token: helper.token })).status, 404, 'no access after leaving');
});

test('agenda edits and invites, calendar providers, notification read, devices list, media metadata, external media, delete media', async () => {
  const app = createApp();
  const a = await app.register('Organiser'), b = await app.register('Guest');
  await contacts(app, a as U, b as U);
  const ev = await app.call('POST', '/api/events', { token: a.token, body: { title: 'Atelier', startsAt: '2026-12-01T18:00:00Z', endsAt: '2026-12-01T19:00:00Z' } });
  ok(await app.call('POST', `/api/events/${ev.body.event.id}/invites`, { token: a.token, body: { handles: [b.handle] } }));
  const upd = await app.call('PATCH', `/api/events/${ev.body.event.id}`, { token: a.token, body: { endsAt: '2026-12-01T20:00:00Z', location: 'Salle 2' } });
  assert.equal(upd.body.event.location, 'Salle 2');
  assert.equal((await app.call('PATCH', `/api/events/${ev.body.event.id}`, { token: a.token, body: { endsAt: '2026-12-01T17:00:00Z' } })).status, 422);
  ok(await app.call('DELETE', `/api/events/${ev.body.event.id}/invites/${b.handle}`, { token: a.token }));
  assert.equal((await app.call('GET', `/api/events/${ev.body.event.id}`, { token: b.token })).status, 404, 'withdrawn invitee loses access');
  assert.equal((await app.call('GET', '/api/calendar-providers')).body.google.status, 'not_configured');
  const notes = await app.call('GET', '/api/notifications', { token: b.token });
  ok(await app.call('POST', `/api/notifications/${notes.body.items[0].id}/read`, { token: b.token }));
  await app.call('POST', '/api/me/devices', { token: b.token, body: { platform: 'android', pushToken: 'token-1' } });
  assert.equal((await app.call('GET', '/api/me/devices', { token: b.token })).body.items[0].platform, 'android');
  const media = await upload(app, a.token, 'dream_gallery', 'image/png', PNG);
  assert.equal((await app.call('GET', `/api/media/${media}`, { token: a.token })).body.media.purpose, 'dream_gallery');
  assert.equal((await app.call('GET', `/api/media/${media}`, { token: b.token })).status, 404);
  ok(await app.call('DELETE', `/api/media/${media}`, { token: a.token }));
  assert.equal(app.r2.objects.size, 0);
  const ext = await app.call('POST', '/api/media/external', { token: a.token, body: { url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946', mediaType: 'image', purpose: 'dream_cover', attribution: 'Photo Unsplash', sourceName: 'Unsplash' } });
  ok(ext, 201);
  assert.equal(ext.body.media.attribution, 'Photo Unsplash');
});

test('ordering is deterministic: phase history by phase, rapid messages in send order across pages', async () => {
  const app = createApp();
  const a = await app.register('Anna'), b = await app.register('Ben');
  // Created and transitioned within the same second: history must still read semence → germination.
  for (let i = 0; i < 5; i++) {
    const d = await germinatingDream(app, a as U, []);
    assert.equal((await app.call('GET', `/api/dreams/${d.dreamId}/phase-history`)).body.items.map((h: any) => h.to).join(','), 'semence,germination');
  }
  await contacts(app, a as U, b as U);
  const conv = (await app.call('POST', '/api/conversations', { token: a.token, body: { handle: b.handle } })).body.conversationId;
  const sent: string[] = [];
  for (let i = 0; i < 12; i++) sent.push((await app.call('POST', `/api/conversations/${conv}/messages`, { token: i % 2 ? b.token : a.token, body: { body: 'm' + i } })).body.message.id);
  const read: string[] = [];
  let cursor: string | null = null;
  do {
    const page: any = await app.call('GET', `/api/conversations/${conv}/messages?limit=5${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`, { token: b.token });
    read.push(...page.body.items.map((m: any) => m.id));
    cursor = page.body.nextCursor;
  } while (cursor);
  assert.deepEqual(read, [...sent].reverse(), 'newest first, no gaps or duplicates across pages');
});
