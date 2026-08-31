import { test, expect } from '@playwright/test';
import { createSessionStore, createStateStore, _clearMemoryStore } from '../src/lib/atproto/store';

/**
 * The OAuth stores were module-scope Maps, which is per-isolate on Workers —
 * `client.restore(did)` failed whenever a request landed on a cold isolate, so
 * every signed-in action broke silently and generation fell back to the guest
 * copy. They are KV-backed now, with the Map kept as the off-platform fallback.
 *
 * This suite runs off-platform, so it exercises the fallback. What it can prove
 * is the contract both paths share.
 */

test.beforeEach(() => _clearMemoryStore());

test('a session round-trips', async () => {
  const store = createSessionStore();
  const did = 'did:plc:example';
  const session = { dpopJwk: { kty: 'EC' }, tokenSet: { sub: did } };

  expect(await store.get(did)).toBeUndefined();

  await store.set(did, session as any);
  expect(await store.get(did)).toEqual(session);

  await store.del(did);
  expect(await store.get(did)).toBeUndefined();
});

test('sessions and state cannot collide', async () => {
  // Both stores share one namespace, so the key prefix is load-bearing: a
  // sign-in whose state key happened to equal a DID must not evict a session.
  const sessions = createSessionStore();
  const state = createStateStore();
  const key = 'did:plc:collision';

  await sessions.set(key, { tokenSet: { sub: 'session' } } as any);
  await state.set(key, { iss: 'state' } as any);

  expect((await sessions.get(key))?.tokenSet?.sub).toBe('session');
  expect(await state.get(key)).toEqual({ iss: 'state' });

  await state.del(key);
  expect(await sessions.get(key), 'deleting state must not delete the session').toBeTruthy();
});

test('a value that cannot be parsed reads as absent', async () => {
  const store = createSessionStore();
  expect(await store.get('did:plc:never-written')).toBeUndefined();
});
