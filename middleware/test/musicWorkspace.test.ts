import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, upload, wav } from './helpers/app.ts';

/** A real song discussion must exclude listeners and unaccepted applicants. */
test('music workspaces: publisher chat exists, accepted collaborators may join, outsiders cannot', async () => {
  const app = createApp();
  const owner = await app.register('Original Artist');
  const bassist = await app.register('Bassist');
  const stranger = await app.register('Stranger');
  const audio = await upload(app, owner.token, 'music_audio', 'audio/wav', wav());

  const published = await app.call('POST', '/api/music', { token: owner.token, body: {
    title: 'Chant original', audioMediaId: audio, rightsConfirmed: true,
    credits: [{ displayName: 'Original Artist', contribution: 'Piano, composition' }],
    rights: { originalCreatorName: 'Original Artist', rightsHolderName: 'Original Artist',
      licenseType: 'own_work', attributionText: 'Original Artist' },
  } });
  assert.equal(published.status, 201, JSON.stringify(published.body));
  const id: string = published.body.item.id;
  const chatId = 'music-' + id;

  const ownerChat = await app.call('GET', '/api/music/' + id + '/conversation', { token: owner.token });
  assert.equal(ownerChat.status, 200, JSON.stringify(ownerChat.body));
  assert.equal(ownerChat.body.conversationId, chatId);
  assert.equal((await app.call('GET', '/api/music/' + id + '/conversation', { token: stranger.token })).status, 404);
  assert.equal((await app.call('GET', '/api/conversations/' + chatId, { token: stranger.token })).status, 404);

  const firstMessage = await app.call('POST', '/api/conversations/' + chatId + '/messages', {
    token: owner.token, body: { type: 'text', body: 'Bienvenue dans ce morceau !' },
  });
  assert.equal(firstMessage.status, 201, JSON.stringify(firstMessage.body));

  const clip = await upload(app, bassist.token, 'music_proposal', 'audio/wav', wav());
  const proposal = await app.call('POST', '/api/music/' + id + '/proposals', {
    token: bassist.token, body: {
      description: 'Je peux ajouter une basse', audioMediaId: clip,
      credits: [{ displayName: 'Bassist', contribution: 'Basse' }],
    },
  });
  assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
  assert.equal((await app.call('GET', '/api/music/' + id + '/conversation', { token: bassist.token })).status, 404,
    'a submitted proposal does not grant project access');
  assert.equal((await app.call('GET', '/api/conversations/' + chatId + '/messages', { token: bassist.token })).status, 404);

  const accepted = await app.call('POST', '/api/music-proposals/' + proposal.body.proposal.id + '/accept', {
    token: owner.token, body: {},
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  const joined = await app.call('GET', '/api/music/' + id + '/conversation', { token: bassist.token });
  assert.equal(joined.body.conversationId, chatId);
  const inbox = await app.call('GET', '/api/conversations/' + chatId + '/messages', { token: bassist.token });
  assert.equal(inbox.status, 200, JSON.stringify(inbox.body));
  assert.equal(inbox.body.items[0].body, 'Bienvenue dans ce morceau !');

  const reply = await app.call('POST', '/api/conversations/' + chatId + '/messages', {
    token: bassist.token, body: { type: 'text', body: 'Merci ! Voici ma proposition.' },
  });
  assert.equal(reply.status, 201, JSON.stringify(reply.body));
  const ownerInbox = await app.call('GET', '/api/conversations/' + chatId + '/messages', { token: owner.token });
  assert.equal(ownerInbox.body.items[0].body, 'Merci ! Voici ma proposition.');
  assert.equal((await app.call('GET', '/api/conversations/' + chatId, { token: stranger.token })).status, 404);
});

test('music workspaces: legacy track lazily recreates missing attached conversation', async () => {
  const app = createApp();
  const artist = await app.register('Legacy Artist');
  const audio = await upload(app, artist.token, 'music_audio', 'audio/wav', wav());
  const published = await app.call('POST', '/api/music', { token: artist.token, body: {
    title: 'Ancien morceau', audioMediaId: audio, rightsConfirmed: true,
    credits: [{ displayName: 'Legacy Artist', contribution: 'Auteur' }],
    rights: { originalCreatorName: 'Legacy Artist', rightsHolderName: 'Legacy Artist',
      licenseType: 'own_work', attributionText: 'Legacy Artist' },
  } });
  const id: string = published.body.item.id;
  app.db.exec("DELETE FROM conversations WHERE id='music-" + id.replace(/'/g, "''") + "'");
  const restored = await app.call('GET', '/api/music/' + id + '/conversation', { token: artist.token });
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.body.conversationId, 'music-' + id);
});
