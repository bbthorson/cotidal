/**
 * Reaching Cloudflare bindings.
 *
 * Bindings — KV namespaces, the rate limiter — are not in `process.env` and are
 * not reachable from a plain module import. Astro used to expose them at
 * `locals.runtime.env`; **in Astro v6 and later that getter throws**, which is
 * worse than returning `undefined` because a `?.` chain does not save you:
 *
 *     Astro.locals.runtime.env has been removed in Astro v6.
 *     Use 'import { env } from "cloudflare:workers"' instead.
 *
 * So this is the one place that knows how to find a binding. `cloudflare:workers`
 * only resolves inside the Workers runtime, hence the guarded dynamic import:
 * off-platform every lookup answers `undefined` and callers fall back, which is
 * what keeps `astro dev` and the test suite working with no bindings at all.
 */

/** The subset of Cloudflare's KV interface we use. */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** The subset of Cloudflare's rate limiting binding we use. */
export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

let cachedEnv: Record<string, unknown> | undefined;
let resolved = false;

/** The Worker's bindings, or `undefined` when not running on Workers. */
export async function workersEnv(): Promise<Record<string, unknown> | undefined> {
  if (resolved) return cachedEnv;
  resolved = true;
  try {
    const mod = await import('cloudflare:workers');
    cachedEnv = (mod as { env?: unknown }).env as Record<string, unknown> | undefined;
  } catch {
    // Not on Workers. Every caller has a fallback path.
    cachedEnv = undefined;
  }
  return cachedEnv;
}

/** A binding by name, checked for the method that proves it is the right kind. */
async function bindingWith<T>(name: string, method: keyof T): Promise<T | undefined> {
  const binding = (await workersEnv())?.[name] as T | undefined;
  return binding && typeof binding[method] === 'function' ? binding : undefined;
}

export function kvBinding(name: string): Promise<KVNamespace | undefined> {
  return bindingWith<KVNamespace>(name, 'get');
}

export function rateLimiterBinding(name: string): Promise<RateLimiterBinding | undefined> {
  return bindingWith<RateLimiterBinding>(name, 'limit');
}

/** Test seam: forget the resolved environment. */
export function _resetRuntimeCache(): void {
  cachedEnv = undefined;
  resolved = false;
}
