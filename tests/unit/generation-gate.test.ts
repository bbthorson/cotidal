import { describe, test, expect } from 'vitest';
import { checkRateLimit } from '../../src/lib/rate-limit';
import { defaultRateLimitConfig } from '../../src/lib/rate-limit-logic';

/**
 * The model routes previously called a `checkRateLimit` that unconditionally
 * returned true, and identified callers by an unsigned cookie. Both are the
 * kind of failure that looks exactly like working software, so both are
 * asserted here rather than trusted. See docs/generation.md.
 */

describe('The limiter', () => {
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

  test('is reached through the binding resolver, not Astro locals', async () => {
    // `locals.runtime.env` THROWS in Astro v6+ rather than returning
    // undefined, so a `?.` chain does not save you — an earlier version of
    // this limiter would have crashed on every metered request in production.
    // Bindings come from `cloudflare:workers` via src/lib/runtime.ts instead.
    const locals = {
      get runtime(): never {
        throw new Error('Astro.locals.runtime.env has been removed in Astro v6.');
      },
    };

    const key = `no-locals-${Date.now()}-${Math.random()}`;
    expect(await checkRateLimit(key)).toBe(true);
    expect(() => locals.runtime, 'the throwing getter is the thing we avoid').toThrow();
  });
});
