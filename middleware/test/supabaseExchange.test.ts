import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './helpers/app.ts';

const UUID = '4ec693bf-0d25-4ad8-8284-9f3b8cb0ca79';
function upstream(email: string, status = 200) {
  const old = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.redirect, 'manual');
    return new Response(JSON.stringify({ id: UUID, email, email_confirmed_at: '2026-11-01T00:00:00Z', is_anonymous: false }), { status });
  };
  return () => { globalThis.fetch = old; };
}
test('unified Supabase exchange requires a bearer and rejects invalid upstream credentials', async () => {
  const app = createApp();
  assert.equal((await app.call('POST', '/v1/auth/supabase/exchange')).status, 401);
  const restore = upstream('new@example.test', 401);
  try { assert.equal((await app.call('POST', '/v1/auth/supabase/exchange', { token: 'invalid' })).status, 401); }
  finally { restore(); }
});
test('unified Supabase exchange creates one member, preserves identity, and rejects disabled members', async () => {
  const app = createApp();
  const restore = upstream('new@example.test');
  try {
    const first = await app.call('POST', '/v1/auth/supabase/exchange', { token: 'valid' });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const second = await app.call('POST', '/v1/auth/supabase/exchange', { token: 'valid' });
    assert.equal(second.body.user.id, first.body.user.id);
    const me = await app.call('GET', '/v1/auth/me', { token: first.body.accessToken });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, first.body.user.id);
    app.db.raw.prepare("UPDATE users SET account_status='suspended' WHERE id=?").run(first.body.user.id);
    assert.equal((await app.call('POST', '/v1/auth/supabase/exchange', { token: 'valid' })).status, 401);
  } finally { restore(); }
});
test('unified Supabase exchange cannot claim an existing account solely by email', async () => {
  const app = createApp();
  await app.register('Existing Member', 'existing@example.test');
  const restore = upstream('existing@example.test');
  try {
    const response = await app.call('POST', '/v1/auth/supabase/exchange', { token: 'valid' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error, 'identity_link_required');
  } finally { restore(); }
});
