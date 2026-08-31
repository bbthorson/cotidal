import { isRateLimited, defaultRateLimitConfig, type RateLimitConfig } from './rate-limit-logic';

export { isRateLimited };

/**
 * The limiter the model routes call.
 *
 * This was a stub that unconditionally returned `true` while the working
 * implementation in `rate-limit-logic.ts` had no call sites, so both routes
 * believed they were metered and neither was.
 *
 * Two mechanisms, deliberately:
 *
 * - **Cloudflare's rate limiting binding**, in production. A module-scope
 *   `Map` is per-isolate on Workers — Cloudflare runs many and recycles them
 *   freely, so an attacker spreads across them for free. The in-memory logic
 *   is correct as logic and weak as a limiter; only durable state holds.
 * - **The in-memory limiter**, everywhere else. `npm run dev`, `astro preview`
 *   and the test suite have no bindings, and a limiter that only exists in
 *   production is one nobody can test.
 *
 * A binding that throws falls back to the in-memory limiter rather than
 * failing open. Some metering beats none.
 */

export const GENERATION_LIMITER = 'GENERATION_RATE_LIMITER';

/** The shape Cloudflare's `ratelimit` binding exposes. */
interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

function bindingFrom(locals: unknown): RateLimiterBinding | null {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } } | undefined)?.runtime?.env;
  const binding = env?.[GENERATION_LIMITER];
  if (binding && typeof (binding as RateLimiterBinding).limit === 'function') {
    return binding as RateLimiterBinding;
  }
  return null;
}

/**
 * `true` when the caller may proceed.
 *
 * `key` identifies who is being metered. For the model routes that is the
 * restored DID, so the quota belongs to an account that had to be proven
 * rather than to an IP that can be changed.
 */
export async function checkRateLimit(
  key: string,
  locals?: unknown,
  config: RateLimitConfig = defaultRateLimitConfig
): Promise<boolean> {
  const binding = bindingFrom(locals);

  if (binding) {
    try {
      const { success } = await binding.limit({ key });
      return success;
    } catch (error) {
      console.error('Rate limiter binding failed, falling back to in-memory:', error);
    }
  }

  return !isRateLimited(key, config);
}
