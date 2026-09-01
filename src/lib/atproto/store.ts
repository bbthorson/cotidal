import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from '@atproto/oauth-client-node';
import { kvBinding } from '../runtime';

/**
 * Where OAuth sessions and authorization state live.
 *
 * Both were module-scope `Map`s, which is per-isolate on Workers: Cloudflare
 * runs many and recycles them freely, so `client.restore(did)` failed whenever
 * a request landed on a cold one. Every write action broke that way, silently,
 * and members-only generation degraded to the guest fallback.
 *
 * statusphere — the protocol's own example app — backs both stores with a
 * database keyed by DID. KV is the equivalent here: same three methods, and a
 * session is a small JSON blob read once per request.
 *
 * The binding is resolved inside each method rather than when the store is
 * built, so `getAtprotoClient()` stays synchronous and nothing has to thread a
 * request context down to it.
 *
 * The `Map` remains as the off-platform fallback, so `astro dev` and the suite
 * work with no bindings. It is per-isolate there too — a single local process
 * only ever has one.
 *
 * The binding is `ATPROTO_SESSIONS`, declared in `wrangler.toml` against the
 * `crystal-coupe-kv` namespace — separate from the `SESSION` namespace Astro's
 * own sessions use, so the two have independent lifecycles. Keys are prefixed
 * `session:` and `state:` regardless, which is what keeps these two stores from
 * colliding with each other.
 */

export const SESSION_KV_BINDING = 'ATPROTO_SESSIONS';

/** Sessions outlive a browser session; the cookie is set for the same 30 days. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Authorization state is consumed within one redirect round trip. The TTL is
 * not a nicety: the in-memory version had no expiry, so every abandoned
 * sign-in leaked an entry that nothing ever removed.
 */
const STATE_TTL_SECONDS = 60 * 10;

const memory = new Map<string, string>();

function createStore<T>(prefix: string, ttl: number) {
  const scoped = (key: string) => `${prefix}:${key}`;

  return {
    async get(key: string): Promise<T | undefined> {
      const kv = await kvBinding(SESSION_KV_BINDING);
      const raw = kv ? await kv.get(scoped(key)) : memory.get(scoped(key));
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // A value we cannot parse is a value we cannot use.
        return undefined;
      }
    },
    async set(key: string, value: T): Promise<void> {
      const kv = await kvBinding(SESSION_KV_BINDING);
      const raw = JSON.stringify(value);
      if (kv) await kv.put(scoped(key), raw, { expirationTtl: ttl });
      else memory.set(scoped(key), raw);
    },
    async del(key: string): Promise<void> {
      const kv = await kvBinding(SESSION_KV_BINDING);
      if (kv) await kv.delete(scoped(key));
      else memory.delete(scoped(key));
    },
  };
}

export function createSessionStore(): NodeSavedSessionStore {
  return createStore<NodeSavedSession>('session', SESSION_TTL_SECONDS);
}

export function createStateStore(): NodeSavedStateStore {
  return createStore<NodeSavedState>('state', STATE_TTL_SECONDS);
}

/** True when the stores will survive an isolate being recycled. */
export async function hasDurableStores(): Promise<boolean> {
  return (await kvBinding(SESSION_KV_BINDING)) !== undefined;
}

/** Test seam: the fallback map is process-wide and shared by both stores. */
export function _clearMemoryStore(): void {
  memory.clear();
}
