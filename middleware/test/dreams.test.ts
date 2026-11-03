import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, upload, PNG, type TestApp } from './helpers/app.ts';

async function makeContacts(app: TestApp, a: { token: string; handle: string }, b: { token: string; handle: string }) {
  const req = await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  assert.equal(req.status, 201, JSON.stringify(req.body));
  assert.equal((await app.call('POST', `/api/contacts/requests/${req.body.request.id}/accept`, { token: b.token })).status, 200);
}

/** Scenarios 2–8 of the brief, end to end through the HTTP API. */
test('Dream lifecycle: private Semence → Germination → helpers → Croissance (one chat) → Floraison → Fruit', async () => {
  const app = createApp();
  const owner = await app.register('Ruben');
  const helper = await app.register('Maria');
  const other = await app.register('Isaiah');

  // Talent taxonomy exists (migration 0010).
  const talents = await app.call('GET', '/api/talents?q=Batterie');
  const drums = talents.body.items[0].id;

  // 2. Private Semence: visible to the owner with a lock, invisible to others and anonymous.
  const created = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Enregistrer ma première chanson', summary: 'Une chanson écrite pour ma grand-mère.' } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const dreamId = created.body.dream.dreamId;
  assert.equal(created.body.dream.phase, 'semence');
  assert.equal(created.body.dream.locked, true);
  assert.equal(created.body.dream.visibility, 'private');
  assert.equal((await app.call('GET', `/api/dreams/${dreamId}`)).status, 404);
  assert.equal((await app.call('GET', `/api/dreams/${dreamId}`, { token: other.token })).status, 404);
  const mine = await app.call('GET', '/api/me/dreams', { token: owner.token });
  assert.equal(mine.body.items[0].locked, true);
  const ownProfile = await app.call('GET', `/api/users/${owner.handle}/publications`, { token: owner.token });
  assert.equal(ownProfile.body.items.length, 1);
  assert.equal(ownProfile.body.items[0].locked, true);
  const publicProfile = await app.call('GET', `/api/users/${owner.handle}/publications`);
  assert.equal(publicProfile.body.items.length, 0, 'private draft never on the public profile');
  assert.equal((await app.call('GET', '/api/discovery')).body.items.filter((i: any) => i.type === 'dream' && i.dreamId === dreamId).length, 0);

  // Title is immutable; phase cannot be PATCHed.
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { title: 'Autre' } })).body.error.code, 'title_immutable');
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { phase: 'floraison' } })).body.error.code, 'use_transition_endpoint');
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: other.token, body: { summary: 'x' } })).status, 404);

  // 3. Edit Semence fields; Germination requires a cover image.
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { summary: 'Une chanson pour ma grand-mère, enregistrée avec des amis.', motivation: 'Elle a toujours cru en moi.' } })).status, 200);
  const blocked = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'germination' } });
  assert.equal(blocked.status, 422);
  assert.equal(blocked.body.error.details[0].code, 'cover_required');
  const skip = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } });
  assert.equal(skip.body.error.code, 'invalid_phase_transition');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { coverMediaId: cover } })).status, 200);
  const germ = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'germination' }, headers: { 'Idempotency-Key': 'germ-key-0001' } });
  assert.equal(germ.status, 200, JSON.stringify(germ.body));
  assert.equal(germ.body.dream.phase, 'germination');
  assert.equal(germ.body.dream.visibility, 'public');
  const replay = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'germination' }, headers: { 'Idempotency-Key': 'germ-key-0001' } });
  assert.equal(replay.headers.get('idempotent-replay'), 'true');
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { summary: 'changed' } })).body.error.code, 'field_locked_for_phase');
  // Public now, visible in Discovery with its phase label.
  const disc = await app.call('GET', '/api/discovery?type=dream');
  const card = disc.body.items.find((i: any) => i.dreamId === dreamId);
  assert.equal(card.phase, 'germination');
  assert.equal(card.phaseLabel, 'Germination');

  // Needs: a person need with a required level (5-dot scale), and a practical one.
  const needRes = await app.call('POST', `/api/dreams/${dreamId}/needs`, { token: owner.token, body: { label: 'Batteur', category: 'person', talentId: drums, requiredLevel: 'Intermédiaire', slotsTotal: 1, description: 'Deux répétitions et une journée de studio.' } });
  assert.equal(needRes.status, 201, JSON.stringify(needRes.body));
  const needId = needRes.body.id;
  const room = await app.call('POST', `/api/dreams/${dreamId}/needs`, { token: owner.token, body: { label: 'Salle de répétition', category: 'practical' } });
  const optional = await app.call('POST', `/api/dreams/${dreamId}/needs`, { token: owner.token, body: { label: 'Vidéaste', category: 'person', isRequired: false } });
  assert.equal(optional.status, 201);
  const detail = await app.call('GET', `/api/dreams/${dreamId}`, { token: helper.token });
  const need = detail.body.dream.needs.find((n: any) => n.id === needId);
  assert.equal(need.requiredLevel, 3);
  assert.equal(need.requiredLevelLabel, 'Intermédiaire');
  assert.equal(need.pendingOffers, undefined, 'offer counts are owner-only');
  assert.deepEqual(detail.body.dream.viewer.actions, ['share-internal', 'prayer', 'offer-help', 'introduce']);

  // 4. Helper offers; pending does not count; owner accepts; progress updates.
  const offer = await app.call('POST', `/api/needs/${needId}/offers`, { token: helper.token, body: { message: 'Je joue depuis dix ans.' } });
  assert.equal(offer.status, 201, JSON.stringify(offer.body));
  assert.equal((await app.call('POST', `/api/needs/${needId}/offers`, { token: helper.token, body: {} })).body.error.code, 'offer_exists');
  assert.equal((await app.call('POST', `/api/needs/${needId}/offers`, { token: owner.token, body: {} })).body.error.code, 'own_dream');
  let ownerView = await app.call('GET', `/api/dreams/${dreamId}`, { token: owner.token });
  assert.equal(ownerView.body.dream.needs.find((n: any) => n.id === needId).slotsFilled, 0);
  assert.equal(ownerView.body.dream.needs.find((n: any) => n.id === needId).pendingOffers, 1);
  const notReady = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } });
  assert.equal(notReady.status, 422);
  assert.ok(notReady.body.error.details.some((d: any) => d.code === 'goal_date_required'));
  assert.ok(notReady.body.error.details.some((d: any) => d.code === 'need_not_confirmed'));
  const notifications = await app.call('GET', '/api/notifications', { token: owner.token });
  assert.ok(notifications.body.items.some((n: any) => n.type === 'dream.offer.received' && n.title === 'Nouvelle proposition d’aide'));
  const accepted = await app.call('POST', `/api/offers/${offer.body.offer.id}/accept`, { token: owner.token });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  const filled = accepted.body.dream.needs.find((n: any) => n.id === needId);
  assert.equal(filled.slotsFilled, 1);
  assert.equal(filled.confirmed, true);
  assert.ok(accepted.body.dream.collaborators.some((c: any) => c.id === helper.id && c.status === 'accepted'));
  assert.ok(!accepted.body.dream.owners.some((o: any) => o.id === helper.id), 'a helper never becomes an owner');

  // 5. Last required need confirmed + goal date → Croissance; exactly one Dream chat, retries do not duplicate.
  assert.equal((await app.call('POST', `/api/needs/${room.body.id}/confirm`, { token: owner.token })).status, 200);
  assert.equal((await app.call('POST', `/api/needs/${room.body.id}/confirm`, { token: owner.token })).body.error.code, 'need_full');
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { goalDate: '2027-02-30' } })).status, 422);
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { goalDate: '2027-03-01' } })).status, 200);
  ownerView = await app.call('GET', `/api/dreams/${dreamId}`, { token: owner.token });
  assert.equal(ownerView.body.dream.permissions.readiness.ready, true, 'optional need does not block');
  const [t1, t2] = await Promise.all([
    app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } }),
    app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } }),
  ]);
  assert.ok([t1.status, t2.status].every(s => s === 200 || s === 409), `${t1.status} ${t2.status}`);
  const again = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'croissance' } });
  assert.equal(again.body.changed, false);
  const chats = Number((app.db.raw.prepare(`SELECT count(*) AS n FROM conversations WHERE dream_id=? AND type='dream'`).get(dreamId) as { n: number }).n);
  assert.equal(chats, 1, 'exactly one Dream conversation');
  const history = Number((app.db.raw.prepare(`SELECT count(*) AS n FROM dream_phase_history WHERE dream_id=? AND to_phase='growth'`).get(dreamId) as { n: number }).n);
  assert.equal(history, 1, 'one history row despite retries');
  const helperConvs = await app.call('GET', '/api/conversations', { token: helper.token });
  assert.equal(helperConvs.body.items.filter((c: any) => c.dreamId === dreamId).length, 1, 'accepted helper is a member');
  assert.equal((await app.call('GET', '/api/conversations', { token: other.token })).body.items.length, 0);

  // 6. Dated progress journal: public entry appears as the Croissance preview; owner notes stay private.
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/entries`, { token: owner.token, body: { type: 'progress', body: 'Première répétition : la chanson prend forme.', entryDate: '2026-11-03' } })).status, 201);
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/entries`, { token: owner.token, body: { type: 'note', body: 'Penser à remercier Maria.' } })).status, 201);
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/entries`, { token: owner.token, body: { type: 'addition', body: 'x' } })).body.error.code, 'entry_not_allowed_for_phase');
  const publicView = await app.call('GET', `/api/dreams/${dreamId}`);
  assert.equal(publicView.body.dream.journalPreview.text, 'Première répétition : la chanson prend forme.');
  assert.equal(publicView.body.dream.journalPreview.date, '2026-11-03');
  assert.equal(publicView.body.dream.entries.length, 1, 'private note hidden from the public');
  assert.equal(publicView.body.dream.conversationId, null);
  // Habits and milestones (Croissance)
  const habit = await app.call('POST', `/api/dreams/${dreamId}/habits`, { token: owner.token, body: { title: 'Chanter 20 minutes', frequency: 'daily' } });
  assert.equal((await app.call('POST', `/api/habits/${habit.body.id}/checks`, { token: owner.token, body: { day: '2026-11-03' } })).status, 200);
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/milestones`, { token: owner.token, body: { title: 'Studio', dueDate: '2027-01-15' } })).status, 201);
  assert.deepEqual((await app.call('GET', `/api/dreams/${dreamId}/habits`, { token: helper.token })).body.items[0].completed, ['2026-11-03']);
  assert.equal((await app.call('GET', `/api/dreams/${dreamId}/habits`, { token: other.token })).status, 403);

  // 7. Floraison requires a story and a photograph; afterwards the result is immutable.
  const noPhoto = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'floraison', testimony: 'Elle a pleuré.', resultMediaIds: [] } });
  assert.equal(noPhoto.body.error.code, 'result_media_required');
  const result = await upload(app, owner.token, 'dream_result', 'image/png', PNG);
  const flor = await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'floraison', testimony: 'La chanson est enregistrée. Ma grand-mère l’a écoutée trois fois.', resultMediaIds: [result] } });
  assert.equal(flor.status, 200, JSON.stringify(flor.body));
  assert.equal(flor.body.dream.phase, 'floraison');
  assert.equal(flor.body.dream.result.media.id, result);
  assert.ok(flor.body.dream.completedAt);
  assert.equal((await app.call('PATCH', `/api/dreams/${dreamId}`, { token: owner.token, body: { motivation: 'rewrite' } })).body.error.code, 'field_locked_for_phase');
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/needs`, { token: owner.token, body: { label: 'Encore' } })).body.error.code, 'floraison_locked');
  assert.equal((await app.call('DELETE', `/api/media/${result}`, { token: owner.token })).body.error.code, 'media_in_floraison');
  assert.equal((await app.call('DELETE', `/api/dreams/${dreamId}/collaborators/${helper.handle}`, { token: owner.token })).body.error.code, 'floraison_locked');

  // Another member is inspired: a separate Dream, lineage counted as Fruit.
  const inspired = await app.call('POST', `/api/dreams/${dreamId}/inspired-dreams`, { token: other.token, body: { title: 'Écrire une chanson pour mon père' } });
  assert.equal(inspired.status, 201, JSON.stringify(inspired.body));
  assert.equal(inspired.body.dream.phase, 'semence');
  assert.ok(inspired.body.dream.owners.every((o: any) => o.id === other.id), 'the original owner is not an owner of the inspired Dream');
  const fruit = await app.call('GET', `/api/dreams/${dreamId}/inspirations`, { token: owner.token });
  assert.equal(fruit.body.fruitCount, 1);
  assert.equal((await app.call('GET', `/api/dreams/${dreamId}`)).body.dream.counts.inspiredDreams, 1);
  assert.equal((await app.call('POST', `/api/dreams/${dreamId}/inspired-dreams`, { token: owner.token, body: { title: 'Self' } })).body.error.code, 'own_dream');
});

test('scenario 8: “Moi aussi” count is public; encouragement count is owner-only', async () => {
  const app = createApp();
  const owner = await app.register('Owner');
  const a = await app.register('Alice');
  const b = await app.register('Bob');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Ouvrir un atelier', visibility: 'public', coverMediaId: cover } });
  const id = d.body.dream.dreamId;
  const same = await app.call('POST', `/api/dreams/${id}/same-dream`, { token: a.token });
  assert.deepEqual(same.body, { sameDream: true, sameDreamCount: 1 });
  assert.equal((await app.call('POST', `/api/dreams/${id}/same-dream`, { token: a.token })).body.sameDreamCount, 1, 'double tap does not double count');
  assert.equal((await app.call('POST', `/api/dreams/${id}/same-dream`, { token: owner.token })).body.error.code, 'own_dream');
  const enc = await app.call('POST', `/api/dreams/${id}/encouragements`, { token: b.token });
  assert.deepEqual(enc.body, { encouraged: true }, 'no count returned to the encourager');
  await app.call('POST', `/api/dreams/${id}/encouragements`, { token: a.token });
  for (const viewer of [undefined, a.token, b.token]) {
    const view = await app.call('GET', `/api/dreams/${id}`, { token: viewer });
    assert.equal(view.body.dream.counts.sameDream, 1);
    assert.equal(view.body.dream.counts.encouragements, undefined, 'encouragement count hidden from non-owners');
  }
  const disc = await app.call('GET', '/api/discovery', { token: a.token });
  assert.equal(disc.body.items.find((i: any) => i.dreamId === id).counts.encouragements, undefined);
  assert.equal(disc.body.items.find((i: any) => i.dreamId === id).viewer.sameDream, true);
  assert.equal((await app.call('GET', `/api/dreams/${id}/encouragements`, { token: a.token })).status, 403);
  const ownerView = await app.call('GET', `/api/dreams/${id}`, { token: owner.token });
  assert.equal(ownerView.body.dream.counts.encouragements, 2);
  assert.equal((await app.call('GET', `/api/dreams/${id}/encouragements`, { token: owner.token })).body.count, 2);
  // "Moi aussi" grants no role at all.
  assert.ok(!ownerView.body.dream.collaborators.some((c: any) => c.id === a.id));
  assert.ok(!ownerView.body.dream.owners.some((o: any) => o.id === a.id));
  assert.equal((await app.call('GET', `/api/dreams/${id}/participants`, { token: owner.token })).body.sameDream.length, 1);
  assert.equal((await app.call('GET', `/api/dreams/${id}/participants`, { token: a.token })).body.sameDream, undefined);
  assert.equal((await app.call('GET', `/v1/dreams/${id}/participants`, { token: a.token })).status, 403);
});

test('concurrent acceptances never overfill a need', async () => {
  const app = createApp();
  const owner = await app.register('Owner');
  const h1 = await app.register('H1');
  const h2 = await app.register('H2');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Un groupe', coverMediaId: cover, needs: [{ label: 'Bassiste', slotsTotal: 1 }] } });
  const id = d.body.dream.dreamId;
  await app.call('POST', `/api/dreams/${id}/transitions`, { token: owner.token, body: { to: 'germination' } });
  const needId = d.body.dream.needs[0].id;
  const o1 = await app.call('POST', `/api/needs/${needId}/offers`, { token: h1.token, body: {} });
  const o2 = await app.call('POST', `/api/needs/${needId}/offers`, { token: h2.token, body: {} });
  const [a, b] = await Promise.all([
    app.call('POST', `/api/offers/${o1.body.offer.id}/accept`, { token: owner.token }),
    app.call('POST', `/api/offers/${o2.body.offer.id}/accept`, { token: owner.token }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const need = app.db.raw.prepare('SELECT slots_filled,slots_total FROM dream_needs WHERE id=?').get(needId) as { slots_filled: number; slots_total: number };
  assert.equal(need.slots_filled, 1);
  const acceptedCount = (app.db.raw.prepare("SELECT count(*) AS n FROM dream_help_offers WHERE need_id=? AND status='accepted'").get(needId) as { n: number }).n;
  assert.equal(acceptedCount, 1);
  // Releasing the helper frees the slot and removes the collaborator role.
  const winner = a.status === 200 ? o1 : o2;
  assert.equal((await app.call('POST', `/api/offers/${winner.body.offer.id}/release`, { token: owner.token })).status, 200);
  assert.equal((app.db.raw.prepare('SELECT slots_filled FROM dream_needs WHERE id=?').get(needId) as { slots_filled: number }).slots_filled, 0);
  // Withdraw an accepted offer also frees it.
  const other = a.status === 200 ? o2 : o1;
  assert.equal((await app.call('POST', `/api/offers/${other.body.offer.id}/accept`, { token: owner.token })).status, 200);
  const otherHelper = a.status === 200 ? h2 : h1;
  assert.equal((await app.call('POST', `/api/offers/${other.body.offer.id}/withdraw`, { token: otherHelper.token })).status, 200);
  assert.equal((app.db.raw.prepare('SELECT slots_filled FROM dream_needs WHERE id=?').get(needId) as { slots_filled: number }).slots_filled, 0);
});

test('co-owner invitation needs explicit acceptance; last owner can never be removed', async () => {
  const app = createApp();
  const owner = await app.register('Creator');
  const co = await app.register('CoOwner');
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Rêve partagé' } });
  const id = d.body.dream.dreamId;
  assert.equal((await app.call('GET', `/api/dreams/${id}`, { token: co.token })).status, 404);
  const inv = await app.call('POST', `/api/dreams/${id}/owner-invitations`, { token: owner.token, body: { handle: co.handle } });
  assert.equal(inv.status, 201);
  assert.equal((await app.call('PATCH', `/api/dreams/${id}`, { token: co.token, body: { summary: 'x' } })).status, 404, 'pending invitee cannot edit');
  const pending = await app.call('GET', '/api/me/owner-invitations', { token: co.token });
  assert.equal(pending.body.items[0].dream.title, 'Rêve partagé');
  assert.equal((await app.call('POST', `/api/owner-invitations/${inv.body.invitation.id}/accept`, { token: co.token })).status, 200);
  assert.equal((await app.call('PATCH', `/api/dreams/${id}`, { token: co.token, body: { summary: 'Résumé co-écrit' } })).status, 200);
  const view = await app.call('GET', `/api/dreams/${id}`, { token: co.token });
  assert.deepEqual(view.body.dream.owners.map((o: any) => o.role).sort(), ['co_owner', 'creator']);
  assert.equal((await app.call('DELETE', `/api/dreams/${id}`, { token: co.token })).body.error.code, 'creator_only');
  assert.equal((await app.call('DELETE', `/api/dreams/${id}/owners/${owner.handle}`, { token: co.token })).body.error.code, 'creator_only');
  assert.equal((await app.call('DELETE', `/api/dreams/${id}/owners/${co.handle}`, { token: co.token })).status, 200, 'co-owner may leave');
  assert.equal((await app.call('DELETE', `/api/dreams/${id}/owners/${owner.handle}`, { token: owner.token })).body.error.code, 'last_owner');
});

test('soft delete hides the Dream everywhere and archives its conversation', async () => {
  const app = createApp();
  const owner = await app.register('Owner');
  const fan = await app.register('Fan');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Bientôt supprimé', visibility: 'public', coverMediaId: cover } });
  const id = d.body.dream.dreamId;
  const pubId = d.body.dream.id;
  await app.call('POST', `/api/publications/${pubId}/fire`, { token: fan.token });
  assert.equal((await app.call('GET', '/api/me/fire', { token: fan.token })).body.items.length, 1);
  assert.equal((await app.call('DELETE', `/api/dreams/${id}`, { token: owner.token })).status, 200);
  assert.equal((await app.call('GET', `/api/dreams/${id}`, { token: owner.token })).status, 404);
  assert.equal((await app.call('GET', `/api/publications/${pubId}`)).status, 404);
  assert.equal((await app.call('GET', '/api/me/fire', { token: fan.token })).body.items.length, 0, 'stale Fire saves do not resurrect it');
  assert.equal((await app.call('GET', '/api/discovery')).body.items.filter((i: any) => i.id === pubId).length, 0);
});

test('Semence studio blocks are owner-only and frozen after Semence', async () => {
  const app = createApp();
  const owner = await app.register('Owner');
  const other = await app.register('Other');
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Composer', visibility: 'public' } });
  const id = d.body.dream.dreamId;
  const b1 = await app.call('POST', `/api/dreams/${id}/blocks`, { token: owner.token, body: { kind: 'quote', content: 'Commencer petit.', props: { tone: 'pink', span: 2, unknownKey: 'dropped' } } });
  assert.equal(b1.status, 201);
  const b2 = await app.call('POST', `/api/dreams/${id}/blocks`, { token: owner.token, body: { kind: 'text', content: 'Idées' } });
  assert.equal((await app.call('PUT', `/api/dreams/${id}/blocks/order`, { token: owner.token, body: { ids: [b2.body.id, b1.body.id] } })).status, 200);
  const list = await app.call('GET', `/api/dreams/${id}/blocks`, { token: owner.token });
  assert.deepEqual(list.body.items.map((b: any) => b.id), [b2.body.id, b1.body.id]);
  assert.deepEqual(list.body.items[1].props, { tone: 'pink', span: 2 });
  assert.equal((await app.call('GET', `/api/dreams/${id}/blocks`, { token: other.token })).status, 403);
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  await app.call('PATCH', `/api/dreams/${id}`, { token: owner.token, body: { coverMediaId: cover } });
  await app.call('POST', `/api/dreams/${id}/transitions`, { token: owner.token, body: { to: 'germination' } });
  assert.equal((await app.call('PATCH', `/api/dream-blocks/${b1.body.id}`, { token: owner.token, body: { content: 'x' } })).body.error.code, 'field_locked_for_phase');
  // Cover stays editable in Germination (current UI rule).
  const cover2 = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  assert.equal((await app.call('PATCH', `/api/dreams/${id}`, { token: owner.token, body: { coverMediaId: cover2 } })).status, 200);
});

test('optimistic concurrency: stale expectedVersion → 409', async () => {
  const app = createApp();
  const owner = await app.register('Owner');
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Versionné' } });
  const id = d.body.dream.dreamId;
  const v1 = (app.db.raw.prepare('SELECT version FROM dreams WHERE id=?').get(id) as { version: number }).version;
  assert.equal((await app.call('PATCH', `/api/dreams/${id}`, { token: owner.token, body: { motivation: 'a', expectedVersion: v1 } })).status, 200);
  assert.equal((await app.call('PATCH', `/api/dreams/${id}`, { token: owner.token, body: { motivation: 'b', expectedVersion: v1 } })).body.error.code, 'version_conflict');
  void makeContacts;
});
