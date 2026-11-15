import { test, expect } from '@playwright/test';
import { GENERATION_HEADER } from '../src/lib/generation';

/**
 * The model routes previously called a `checkRateLimit` that unconditionally
 * returned true, and identified callers by an unsigned cookie. Both are the
 * kind of failure that looks exactly like working software, so both are
 * asserted here rather than trusted. See docs/generation.md.
 */

const profile = { x: 5, y: 5, dislikesSmoke: false, dislikesBitter: false };

test.describe('The gate', () => {
  test('a guest gets written copy, not a model call', async ({ request }) => {
    const res = await request.post('/api/explain-drink', {
      data: { drinkName: 'Negroni', userProfile: profile },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()[GENERATION_HEADER]).toBe('unauthenticated');

    // The fallback is derived from their own coordinate and must read as copy.
    const { text } = await res.json();
    expect(text).toContain('Negroni');
    expect(text).toMatch(/crisp/i);
    expect(text).not.toMatch(/error|unavailable|failed|sorry/i);
  });

  test('a forged cookie is not a session', async ({ request }) => {
    // Identity lives in the sealed server-side store behind an opaque session
    // id, so neither a DID nor an invented session id names anyone. Only a
    // restorable OAuth session may reach a billed call.
    const forged = 'did:plc:someone-elses-identifier';

    const res = await request.post('/api/explain-drink', {
      data: { drinkName: 'Negroni', userProfile: profile },
      headers: { Cookie: `atproto_did=${forged}; bsky_sid=not-a-real-session` },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()[GENERATION_HEADER]).toBe('unauthenticated');
  });

  test('malformed input is rejected before anything is spent', async ({ request }) => {
    const badJson = await request.post('/api/explain-drink', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not json at all',
    });
    expect(badJson.status()).toBe(400);

    const badProfile = await request.post('/api/explain-drink', {
      data: { drinkName: 'Negroni', userProfile: { x: 'far left' } },
    });
    expect(badProfile.status()).toBe(400);

    // A rejection carries no generation outcome: nothing was decided about it.
    expect(badProfile.headers()[GENERATION_HEADER]).toBeUndefined();
  });
});

