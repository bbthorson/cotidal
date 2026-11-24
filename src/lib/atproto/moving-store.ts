import type { AuthStore } from '@bbthorson/atproto-cf-auth/server';

/**
 * Sessions moving from one store to another without signing anyone out.
 *
 * Sign-in sessions lived in KV, which is eventually consistent: after a token
 * refresh, a request at another location can read the spent token for up to
 * a minute, and parallel tool calls from an assistant make that likely. D1 is
 * strongly consistent, so the refresh lock (`AUTH_LOCK`) is a guarantee there.
 *
 * Writes go to `next` only. A read that misses `next` falls back to `previous`
 * and copies what it found forward, so each member moves the first time they
 * are seen. A delete clears both, so signing out cannot leave a copy behind
 * to be read back. Every value is sealed by the sign-in library and checks
 * its own expiry when read, so a copy may carry a generous TTL (`copyTtl`).
 *
 * Once `previous` has had time to empty (its longest TTL, 30 days), drop it.
 */
export function movingStore(next: AuthStore, previous: AuthStore, copyTtlSeconds: number): AuthStore {
  return {
    async get(key) {
      const found = await next.get(key);
      if (found !== undefined) return found;
      const old = await previous.get(key);
      if (old === undefined) return undefined;
      await next.set(key, old, copyTtlSeconds);
      return old;
    },
    set: (key, value, ttl) => next.set(key, value, ttl),
    async delete(key) {
      await Promise.all([next.delete(key), previous.delete(key)]);
    },
  };
}
