import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, upload, PNG, type TestApp } from './helpers/app.ts';

type U = { id: string; token: string; handle: string };
async function contacts(app: TestApp, a: U, b: U) {
  const r = await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await app.call('POST', `/api/contacts/requests/${r.body.request.id}/accept`, { token: b.token })).status, 200);
}
async function circle(app: TestApp, a: U, b: U) {
  const r = await app.call('POST', '/api/circle/requests', { token: a.token, body: { handle: b.handle, label: 'Église' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await app.call('POST', `/api/circle/requests/${r.body.request.id}/accept`, { token: b.token })).status, 200);
  return r.body.request.id as string;
}

test('contacts and My Circle are distinct; Circle needs a contact and reciprocal acceptance', async () => {
  const app = createApp();
  const a = await app.register('Aa'), b = await app.register('Bb');
  assert.equal((await app.call('POST', '/api/circle/requests', { token: a.token, body: { handle: b.handle } })).body.error.code, 'contact_required');
  await contacts(app, a, b);
  let list = await app.call('GET', '/api/contacts', { token: a.token });
  assert.equal(list.body.items[0].inCircle, false, 'a contact is not promoted to Circle automatically');
  const reqId = await circle(app, a, b);
  list = await app.call('GET', '/api/contacts', { token: a.token });
  assert.equal(list.body.items[0].inCircle, true);
  assert.equal((await app.call('GET', '/api/circle', { token: b.token })).body.items.length, 1);
  assert.equal((await app.call('POST', `/api/circle/requests/${reqId}/revoke`, { token: b.token })).status, 200, 'either side can end it');
  assert.equal((await app.call('GET', '/api/circle', { token: a.token })).body.items.length, 0);
  assert.equal((await app.call('GET', '/api/contacts', { token: a.token })).body.items.length, 1, 'contact remains');
});

test('scenario 13: trusted introduction stays pending until both consent; only then a shared chat appears', async () => {
  const app = createApp();
  const owner = await app.register('Owner'), friend = await app.register('Friend'), drummer = await app.register('Drummer'), stranger = await app.register('Stranger');
  const cover = await upload(app, owner.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: owner.token, body: { title: 'Un groupe de louange', coverMediaId: cover, needs: [{ label: 'Batteur' }] } });
  const dreamId = d.body.dream.dreamId;
  await app.call('POST', `/api/dreams/${dreamId}/transitions`, { token: owner.token, body: { to: 'germination' } });
  assert.equal((await app.call('POST', '/api/introductions', { token: friend.token, body: { dreamId, introducedHandle: drummer.handle } })).body.error.code, 'circle_required');
  await contacts(app, friend, drummer);
  await circle(app, friend, drummer);
  const intro = await app.call('POST', '/api/introductions', { token: friend.token, body: { dreamId, introducedHandle: drummer.handle, message: 'Il joue très bien.' } });
  assert.equal(intro.status, 201, JSON.stringify(intro.body));
  const id = intro.body.introduction.id;
  assert.equal((await app.call('POST', `/api/introductions/${id}/respond`, { token: stranger.token, body: { accept: true } })).status, 404);
  const half = await app.call('POST', `/api/introductions/${id}/respond`, { token: drummer.token, body: { accept: true } });
  assert.equal(half.body.introduction.status, 'pending');
  assert.equal(half.body.introduction.conversationId, null);
  assert.equal((await app.call('GET', '/api/conversations', { token: drummer.token })).body.items.length, 0, 'no unsolicited chat');
  assert.throws(() => app.db.exec(`UPDATE introductions SET status='connected' WHERE id='${id}'`), /both parties must accept/);
  const done = await app.call('POST', `/api/introductions/${id}/respond`, { token: owner.token, body: { accept: true } });
  assert.equal(done.body.introduction.status, 'connected');
  const convId = done.body.introduction.conversationId;
  for (const u of [owner, friend, drummer]) assert.ok((await app.call('GET', '/api/conversations', { token: u.token })).body.items.some((c: any) => c.id === convId));
  assert.equal((await app.call('GET', `/api/conversations/${convId}`, { token: stranger.token })).status, 404);
  // Retrying does not create anything new.
  assert.equal((await app.call('POST', `/api/introductions/${id}/respond`, { token: owner.token, body: { accept: true } })).body.error.code, 'introduction_not_pending');
  // A decline cancels without a chat.
  const intro2 = await app.call('POST', '/api/introductions', { token: friend.token, body: { dreamId, introducedHandle: drummer.handle } });
  const declined = await app.call('POST', `/api/introductions/${intro2.body.introduction.id}/respond`, { token: owner.token, body: { accept: false } });
  assert.equal(declined.body.introduction.status, 'cancelled');
});

test('video calls only between accepted Circle members; no media transport is claimed', async () => {
  const app = createApp();
  const a = await app.register('Aa'), b = await app.register('Bb'), c = await app.register('Cc');
  await contacts(app, a, c);
  assert.equal((await app.call('POST', '/api/calls', { token: a.token, body: { handle: c.handle } })).body.error.code, 'circle_required');
  await contacts(app, a, b);
  await circle(app, a, b);
  const call = await app.call('POST', '/api/calls', { token: a.token, body: { handle: b.handle } });
  assert.equal(call.status, 201);
  assert.deepEqual(call.body.call.media, { provider: null, status: 'not_configured' });
  assert.equal((await app.call('POST', `/api/calls/${call.body.call.id}/accept`, { token: a.token })).status, 403, 'only the invitee accepts');
  assert.equal((await app.call('POST', `/api/calls/${call.body.call.id}/accept`, { token: b.token })).body.call.status, 'accepted');
  assert.equal((await app.call('POST', `/api/calls/${call.body.call.id}/end`, { token: a.token })).body.call.status, 'ended');
  assert.equal((await app.call('GET', `/api/calls/${call.body.call.id}`, { token: c.token })).status, 404);
});

test('scenario 15: messaging enforces membership, unread counts reconcile, blocks cut access', async () => {
  const app = createApp();
  const a = await app.register('Aa'), b = await app.register('Bb'), c = await app.register('Cc');
  assert.equal((await app.call('POST', '/api/conversations', { token: a.token, body: { handle: b.handle } })).body.error.code, 'contact_required');
  await contacts(app, a, b);
  const conv = await app.call('POST', '/api/conversations', { token: a.token, body: { handle: b.handle } });
  const id = conv.body.conversationId;
  assert.equal((await app.call('POST', '/api/conversations', { token: b.token, body: { handle: a.handle } })).body.conversationId, id, 'one thread per pair');
  const m1 = await app.call('POST', `/api/conversations/${id}/messages`, { token: a.token, body: { body: 'Salut !', clientMessageId: 'c-1' } });
  assert.equal(m1.status, 201);
  const dup = await app.call('POST', `/api/conversations/${id}/messages`, { token: a.token, body: { body: 'Salut !', clientMessageId: 'c-1' } });
  assert.equal(dup.body.message.id, m1.body.message.id, 'idempotent send');
  await app.call('POST', `/api/conversations/${id}/messages`, { token: a.token, body: { body: 'Tu es dispo jeudi ?' } });
  let list = await app.call('GET', '/api/conversations', { token: b.token });
  assert.equal(list.body.items[0].unread, 2);
  assert.equal((await app.call('GET', '/api/notifications?unread=1', { token: b.token })).body.items.filter((n: any) => n.type === 'message.received').length, 1, 'one notification per thread, not per message');
  assert.equal((await app.call('GET', `/api/conversations/${id}/messages`, { token: c.token })).status, 404);
  assert.equal((await app.call('POST', `/api/conversations/${id}/messages`, { token: c.token, body: { body: 'intrus' } })).status, 404);
  await app.call('POST', `/api/conversations/${id}/read`, { token: b.token });
  list = await app.call('GET', '/api/conversations', { token: b.token });
  assert.equal(list.body.items[0].unread, 0);
  const updates = await app.call('GET', '/api/updates', { token: b.token });
  assert.equal(updates.body.unreadMessages, 0);
  assert.equal(updates.body.realtime, 'polling');
  // Edit/delete own message only; reactions.
  assert.equal((await app.call('PATCH', `/api/messages/${m1.body.message.id}`, { token: b.token, body: { body: 'hack' } })).status, 403);
  assert.equal((await app.call('PATCH', `/api/messages/${m1.body.message.id}`, { token: a.token, body: { body: 'Salut Bob !' } })).body.message.body, 'Salut Bob !');
  await app.call('POST', `/api/messages/${m1.body.message.id}/reactions`, { token: b.token, body: { reaction: '🙏' } });
  await app.call('DELETE', `/api/messages/${m1.body.message.id}`, { token: a.token });
  const msgs = await app.call('GET', `/api/conversations/${id}/messages`, { token: b.token });
  const removed = msgs.body.items.find((m: any) => m.id === m1.body.message.id);
  assert.equal(removed.removed, true);
  assert.equal(removed.body, null);
  // Sharing a private Dream into a chat is refused.
  const priv = await app.call('POST', '/api/dreams', { token: a.token, body: { title: 'Secret' } });
  assert.equal((await app.call('POST', `/api/conversations/${id}/messages`, { token: a.token, body: { type: 'publication', publicationId: priv.body.dream.id } })).body.error.code, 'publication_not_shareable');
  // Block → thread disappears for both and sending fails.
  await app.call('POST', `/api/users/${a.handle}/block`, { token: b.token });
  assert.equal((await app.call('GET', '/api/conversations', { token: a.token })).body.items.length, 0);
  assert.equal((await app.call('POST', `/api/conversations/${id}/messages`, { token: a.token, body: { body: 'encore ?' } })).status, 404);
  assert.equal((await app.call('GET', '/api/contacts', { token: a.token })).body.items.length, 0, 'block also removes the contact');
});

test('scenario 14: events keep their timezone; invitations; ICS has the right instants; public events only by choice', async () => {
  const app = createApp();
  const a = await app.register('Organiser'), b = await app.register('Guest'), c = await app.register('Stranger');
  assert.equal((await app.call('POST', '/api/events', { token: a.token, body: { title: 'Répétition', startsAt: '2026-11-20T19:00:00+01:00', endsAt: '2026-11-20T18:00:00+01:00' } })).status, 422);
  assert.equal((await app.call('POST', '/api/events', { token: a.token, body: { title: 'Répétition', startsAt: '2026-11-20T19:00:00+01:00', endsAt: '2026-11-20T21:00:00+01:00', invite: [c.handle] } })).body.error.code, 'invitee_not_connected');
  await contacts(app, a, b);
  const ev = await app.call('POST', '/api/events', { token: a.token, body: { title: 'Répétition, salle B', startsAt: '2026-11-20T19:00:00+01:00', endsAt: '2026-11-20T21:00:00+01:00', timezone: 'Europe/Zurich', location: 'Rue du Temple 4', invite: [b.handle] } });
  assert.equal(ev.status, 201, JSON.stringify(ev.body));
  assert.equal(ev.body.event.startsAt, '2026-11-20T18:00:00Z', 'stored in UTC');
  assert.equal(ev.body.event.timezone, 'Europe/Zurich');
  assert.equal(ev.body.event.status, 'proposed');
  assert.equal((await app.call('GET', `/api/events/${ev.body.event.id}`, { token: c.token })).status, 404, 'private address not exposed');
  const agendaB = await app.call('GET', '/api/events?from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z', { token: b.token });
  assert.equal(agendaB.body.items[0].myStatus, 'pending');
  assert.equal((await app.call('POST', `/api/events/${ev.body.event.id}/respond`, { token: b.token, body: { status: 'accepted' } })).status, 200);
  assert.equal((await app.call('GET', `/api/events/${ev.body.event.id}`, { token: a.token })).body.event.status, 'confirmed');
  const ics = await app.call('GET', `/api/events/${ev.body.event.id}/ics`, { token: b.token });
  assert.match(ics.headers.get('content-type') || '', /text\/calendar/);
  assert.match(ics.body, /DTSTART:20261120T180000Z/);
  assert.match(ics.body, /DTEND:20261120T200000Z/);
  assert.match(ics.body, /SUMMARY:Répétition\\, salle B/);
  assert.match(ics.body, /X-JENLOW-TIMEZONE:Europe\/Zurich/);
  // Signed subscription feed
  const feed = await app.call('GET', '/api/me/calendar-feed', { token: b.token });
  const path = feed.body.url.replace('https://api.test', '');
  const sub = await app.call('GET', path);
  assert.match(sub.body, /BEGIN:VEVENT/);
  assert.equal((await app.call('GET', path.replace(/sig=[^&]+/, 'sig=forged'))).status, 404);
  // Public events
  await app.call('POST', '/api/events', { token: a.token, body: { title: 'Concert ouvert', startsAt: '2026-12-05T18:00:00Z', endsAt: '2026-12-05T20:00:00Z', visibility: 'public', location: 'Place du Marché' } });
  const pub = await app.call('GET', '/api/events/public?from=2026-12-01T00:00:00Z&to=2026-12-31T00:00:00Z');
  assert.deepEqual(pub.body.items.map((e: any) => e.title), ['Concert ouvert']);
  // Cancel notifies the invitee
  await app.call('DELETE', `/api/events/${ev.body.event.id}`, { token: a.token });
  const notes = await app.call('GET', '/api/notifications', { token: b.token });
  assert.ok(notes.body.items.some((n: any) => n.type === 'event.cancelled'));
});

test('notifications: localized at read time, opt-outs respected, mark read, devices honest about push', async () => {
  const app = createApp();
  const a = await app.register('Aa'), b = await app.register('Bb');
  await app.call('PATCH', '/api/me/preferences', { token: b.token, body: { locale: 'en' } });
  await app.call('POST', '/api/contacts/requests', { token: a.token, body: { handle: b.handle } });
  const notes = await app.call('GET', '/api/notifications', { token: b.token });
  assert.equal(notes.body.items[0].title, 'Contact request');
  assert.equal(notes.body.items[0].body, 'Aa wants to add you as a contact.');
  assert.equal((await app.call('GET', '/api/notifications?locale=fr', { token: b.token })).body.items[0].title, 'Demande de contact');
  await app.call('POST', '/api/notifications/read-all', { token: b.token });
  assert.equal((await app.call('GET', '/api/notifications/unread-count', { token: b.token })).body.count, 0);
  await app.call('PATCH', '/api/me/preferences', { token: a.token, body: { notificationOptOuts: ['social'] } });
  const req = (await app.call('GET', '/api/contacts/requests', { token: b.token })).body.items[0];
  await app.call('POST', `/api/contacts/requests/${req.id}/accept`, { token: b.token });
  assert.equal((await app.call('GET', '/api/notifications', { token: a.token })).body.items.length, 0, 'opted out of social');
  const dev = await app.call('POST', '/api/me/devices', { token: a.token, body: { platform: 'ios', pushToken: 'ExponentPushToken[abc]' } });
  assert.equal(dev.body.push.status, 'not_configured');
  const row = app.db.raw.prepare('SELECT push_token_hash, push_token_ciphertext FROM user_devices').get() as Record<string, string | null>;
  assert.ok(row.push_token_hash && row.push_token_hash !== 'ExponentPushToken[abc]');
  assert.equal(row.push_token_ciphertext, null, 'raw token not stored');
  assert.equal((await app.call('DELETE', `/api/me/devices/${dev.body.device.id}`, { token: a.token })).body.revoked, true);
});

test('scheduled job: prayer reminders honour opt-in, expired uploads are cleaned up', async () => {
  const app = createApp();
  const { runScheduled } = await import('../src/jobs/scheduled.ts');
  const u = await app.register('Prayer');
  const bible = await app.call('POST', '/api/bible/posts', { token: u.token, body: { editionCode: 'LSG1910', bookCode: 'PSA', chapter: 150, startVerse: 6 } });
  const id = bible.body.item.id;
  const off = await app.call('POST', '/api/me/prayer-reminders', { token: u.token, body: { publicationId: id, scheduledFor: '2030-01-01T08:00:00Z' } });
  assert.equal(off.body.reminderStatus, 'none', 'reminders are opt-in');
  await app.call('PATCH', '/api/me/preferences', { token: u.token, body: { prayerRemindersEnabled: true } });
  await app.call('POST', '/api/me/prayer-reminders', { token: u.token, body: { publicationId: id, scheduledFor: '2030-01-02T08:00:00Z' } });
  // Pending upload that expired.
  await app.call('POST', '/api/media/uploads', { token: u.token, body: { purpose: 'avatar', mimeType: 'image/png', bytes: 10 } });
  app.db.exec("UPDATE media_assets SET upload_expires_at='2000-01-01T00:00:00Z' WHERE storage_status='pending'");
  const stats = await runScheduled(app.env, new Date('2030-01-02T09:00:00Z'));
  assert.equal(stats.prayerReminders, 1);
  assert.equal(stats.uploadsExpired, 1);
  const notes = await app.call('GET', '/api/notifications', { token: u.token });
  assert.equal(notes.body.items.filter((n: any) => n.type === 'prayer.reminder').length, 1);
  const again = await runScheduled(app.env, new Date('2030-01-02T09:15:00Z'));
  assert.equal(again.prayerReminders, 0, 'sent once');
});

test('media: type/size checks, quarantine on mismatched bytes, signed streaming with Range, never as attachment', async () => {
  const app = createApp();
  const u = await app.register('Media'), other = await app.register('Other');
  assert.equal((await app.call('POST', '/api/media/uploads', { token: u.token, body: { purpose: 'avatar', mimeType: 'image/gif', bytes: 10 } })).body.error.code, 'media_type_not_allowed');
  assert.equal((await app.call('POST', '/api/media/uploads', { token: u.token, body: { purpose: 'avatar', mimeType: 'image/png', bytes: 50 * 1024 * 1024 } })).body.error.code, 'media_too_large');
  // Bytes that are not a PNG are rejected and deleted.
  const start = await app.call('POST', '/api/media/uploads', { token: u.token, body: { purpose: 'avatar', mimeType: 'image/png', bytes: 12 } });
  const fake = new TextEncoder().encode('<script>x</s');
  assert.equal((await app.call('PUT', `/api/media/${start.body.mediaId}/content`, { token: other.token, raw: fake, headers: { 'Content-Type': 'image/png', 'Content-Length': '12' } })).status, 404);
  await app.call('PUT', `/api/media/${start.body.mediaId}/content`, { token: u.token, raw: fake, headers: { 'Content-Type': 'image/png', 'Content-Length': '12' } });
  assert.equal((await app.call('POST', `/api/media/${start.body.mediaId}/complete`, { token: u.token, body: {} })).body.error.code, 'media_rejected');
  assert.equal(app.r2.objects.size, 0);
  // A real PNG becomes ready and streams through a signed URL with byte ranges.
  const id = await upload(app, u.token, 'avatar', 'image/png', PNG);
  await app.call('PATCH', '/api/me', { token: u.token, body: { avatarMediaId: id } });
  const profile = await app.call('GET', `/api/users/${u.handle}`);
  const url: string = profile.body.profile.avatarUrl;
  assert.match(url, /\/api\/media\/.+\/content\?exp=\d+&sig=/);
  const path = url.replace('https://api.test', '');
  const full = await app.call('GET', path);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-disposition'), 'inline');
  const part = await app.call('GET', path, { headers: { Range: 'bytes=0-7' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), `bytes 0-7/${PNG.length}`);
  assert.equal((await app.call('GET', path.replace(/sig=[^&]+/, 'sig=bad'))).status, 403);
  // Other members cannot attach my media to their content.
  assert.equal((await app.call('PATCH', '/api/me', { token: other.token, body: { avatarMediaId: id } })).body.error.code, 'media_not_found');
  // Without an R2 binding uploads report that honestly.
  const noR2 = createApp({ env: { MEDIA: undefined } });
  const t = await noR2.register('Xavier');
  assert.equal((await noR2.call('POST', '/api/media/uploads', { token: t.token, body: { purpose: 'avatar', mimeType: 'image/png', bytes: 10 } })).body.error.code, 'media_storage_not_configured');
  // External images need attribution.
  assert.equal((await app.call('POST', '/api/media/external', { token: u.token, body: { url: 'https://images.unsplash.com/photo-1', mediaType: 'image', purpose: 'dream_cover' } })).status, 422);
  assert.equal((await app.call('POST', '/api/media/external', { token: u.token, body: { url: 'http://insecure.test/a.jpg', mediaType: 'image', purpose: 'dream_cover', attribution: 'x y' } })).status, 422);
});

test('scenario 17 + moderation: reports, moderator-only review, hide/restore, suspend revokes sessions', async () => {
  const app = createApp();
  const author = await app.register('Author'), reporter = await app.register('Reporter'), mod = await app.register('Moderator');
  app.db.exec(`INSERT INTO user_roles(user_id,role) VALUES('${mod.id}','moderator')`);
  const cover = await upload(app, author.token, 'dream_cover', 'image/png', PNG);
  const d = await app.call('POST', '/api/dreams', { token: author.token, body: { title: 'Contenu signalé', visibility: 'public', coverMediaId: cover } });
  const pubId = d.body.dream.id;
  const rep = await app.call('POST', '/api/reports', { token: reporter.token, body: { targetType: 'publication', targetId: pubId, reasonCode: 'spam' } });
  assert.equal(rep.status, 201);
  assert.equal((await app.call('POST', '/api/reports', { token: reporter.token, body: { targetType: 'publication', targetId: pubId, reasonCode: 'spam' } })).body.error.code, 'already_reported');
  assert.equal((await app.call('GET', '/api/admin/reports', { token: reporter.token })).status, 403);
  assert.equal((await app.call('GET', '/api/admin/reports', { token: mod.token })).body.items.length, 1);
  assert.equal((await app.call('POST', `/api/admin/reports/${rep.body.report.id}/resolve`, { token: mod.token, body: { action: 'hide' } })).status, 200);
  assert.equal((await app.call('GET', '/api/discovery')).body.items.length, 0, 'hidden from public reads');
  assert.equal((await app.call('GET', `/api/publications/${pubId}`)).status, 404);
  const rep2 = await app.call('POST', '/api/reports', { token: reporter.token, body: { targetType: 'user', targetId: author.id, reasonCode: 'harassment' } });
  await app.call('POST', `/api/admin/reports/${rep2.body.report.id}/resolve`, { token: mod.token, body: { action: 'suspend', explanation: 'Messages répétés' } });
  assert.equal((await app.call('GET', '/api/me', { token: author.token })).status, 401);
  assert.equal((await app.call('POST', '/v1/auth/refresh', { body: { refreshToken: author.refresh } })).status, 401);
  // Private drafts never leak through search.
  const priv = await app.call('POST', '/api/dreams', { token: reporter.token, body: { title: 'Brouillon très secret' } });
  assert.equal(priv.status, 201);
  assert.equal((await app.call('GET', '/api/discovery?q=secret', { token: mod.token })).body.items.length, 0);
  assert.equal((await app.call('GET', `/api/publications/${priv.body.dream.id}`, { token: mod.token })).status, 404);
});
