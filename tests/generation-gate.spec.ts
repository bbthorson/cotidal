import { test, expect } from '@playwright/test';
import { checkRateLimit } from '../src/lib/rate-limit';
import { defaultRateLimitConfig } from '../src/lib/rate-limit-logic';
import { GENERATION_HEADER } from '../src/lib/generation';
import { didFromRequest } from '../src/lib/atproto/session';

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

  test('a forged cookie is read, and is still not a session', async ({ request }) => {
    // `atproto_did` is unsigned and a DID is public, so anyone can send one.
    // Only a restorable OAuth session may reach a billed call.
    const forged = 'did:plc:someone-elses-identifier';

    // The cookie really is parsed — so the rejection below is the restore
    // failing, not the header being ignored. Without this the test would pass
    // for the wrong reason wherever sign-in is switched off, which is every
    // environment this suite runs in.
    const parsed = didFromRequest(
      new Request('https://example.test', { headers: { Cookie: `atproto_did=${forged}` } })
    );
    expect(parsed).toBe(forged);

    const res = await request.post('/api/explain-drink', {
      data: { drinkName: 'Negroni', userProfile: profile },
      headers: { Cookie: `atproto_did=${forged}` },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()[GENERATION_HEADER]).toBe('unauthenticated');
  });

  test('the unused archetype route is gated too', async ({ request }) => {
    const res = await request.post('/api/archetype-drink', {
      data: { drinkName: 'Negroni' },
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

    const badName = await request.post('/api/archetype-drink', {
      data: { drinkName: '<script>alert(1)</script>' },
    });
    expect(badName.status()).toBe(400);

    // A rejection carries no generation outcome: nothing was decided about it.
    expect(badName.headers()[GENERATION_HEADER]).toBeUndefined();
  });
});

test.describe('The limiter', () => {
  /**
   * With no Cloudflare binding — dev, preview, and this suite — the in-memory
   * limiter is what runs. It is weak on Workers because a module-scope Map is
   * per-isolate, which is why the binding exists; it must still say no.
   */
  test('says no once the allowance is spent', async () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const { max } = defaultRateLimitConfig;

    for (let i = 0; i < max; i++) {
      expect(await checkRateLimit(key), `call ${i + 1} of ${max} should be allowed`).toBe(true);
    }

    expect(await checkRateLimit(key), 'the call past the allowance must be refused').toBe(false);
  });

  test('meters per key, so one caller cannot exhaust another', async () => {
    const busy = `busy-${Date.now()}-${Math.random()}`;
    const quiet = `quiet-${Date.now()}-${Math.random()}`;

    for (let i = 0; i < defaultRateLimitConfig.max + 5; i++) await checkRateLimit(busy);

    expect(await checkRateLimit(busy)).toBe(false);
    expect(await checkRateLimit(quiet)).toBe(true);
  });

  test('prefers the Cloudflare binding when one is bound', async () => {
    const calls: string[] = [];
    const locals = {
      runtime: {
        env: {
          GENERATION_RATE_LIMITER: {
            async limit({ key }: { key: string }) {
              calls.push(key);
              return { success: false };
            },
          },
        },
      },
    };

    expect(await checkRateLimit('did:plc:example', locals)).toBe(false);
    expect(calls).toEqual(['did:plc:example']);
  });

  test('falls back to the in-memory limiter when the binding throws', async () => {
    const locals = {
      runtime: {
        env: {
          GENERATION_RATE_LIMITER: {
            async limit() {
              throw new Error('binding unavailable');
            },
          },
        },
      },
    };

    // Not fail-open: the in-memory limiter still answers, and still refuses.
    const key = `throwing-${Date.now()}-${Math.random()}`;
    expect(await checkRateLimit(key, locals)).toBe(true);
    for (let i = 0; i < defaultRateLimitConfig.max; i++) await checkRateLimit(key, locals);
    expect(await checkRateLimit(key, locals)).toBe(false);
  });
});
