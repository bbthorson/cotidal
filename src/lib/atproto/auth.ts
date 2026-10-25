import { createBlueskyAuth, kvStore, memoryStore, type BlueskyAuth } from '@bbthorson/atproto-cf-auth/server';
import { AUTH_BASE_PATH } from './paths';
import { kvBinding, workersEnv } from '../runtime';

/**
 * Sign-in, sessions and OAuth state are `@bbthorson/atproto-cf-auth`'s job.
 * This file only supplies what the package cannot know: the app's name, scope,
 * where to keep sessions, and the secret that seals them.
 *
 * Bindings resolve through `src/lib/runtime.ts`, so the instance is built
 * lazily and cached. The package derives `client_id` and `redirect_uri` from
 * each request's origin, so the same build serves workers.dev, a custom domain
 * and loopback with nothing to configure per environment.
 */

/** The KV namespace for sessions, declared in `wrangler.toml`. */
export const SESSION_KV_BINDING = 'ATPROTO_SESSIONS';


/** Used only off-platform, where there is no secret to configure and nothing to protect. */
const DEV_SECRET = 'crystal-coupe-local-development-secret-not-for-production';

let auth: BlueskyAuth | null | undefined;

function enabled(): boolean {
  return !!(
    process.env.PUBLIC_ATPROTO_ENABLED ||
    process.env.ATPROTO_ENABLED ||
    process.env.NEXT_PUBLIC_ATPROTO_ENABLED
  );
}

/**
 * The auth instance, or `null` when sign-in is switched off or has no secret.
 *
 * On Workers the secret is `SESSION_SECRET` (a Worker secret, 32+ characters)
 * and its absence means "not configured": sessions sealed under a guessable
 * key are worse than no sessions.
 */
export async function getAuth(): Promise<BlueskyAuth | null> {
  if (auth !== undefined) return auth;
  if (!enabled()) return (auth = null);

  const env = await workersEnv();
  const secret =
    (env?.SESSION_SECRET as string | undefined) ??
    process.env.SESSION_SECRET ??
    (env ? undefined : DEV_SECRET);
  if (!secret) {
    console.error('SESSION_SECRET is not set; sign-in is disabled.');
    return (auth = null);
  }

  const kv = await kvBinding(SESSION_KV_BINDING);

  return (auth = createBlueskyAuth({
    appName: 'Cotidal',
    basePath: AUTH_BASE_PATH,
    redirectTo: '/taste',
    scope: 'atproto transition:generic',
    store: kv ? kvStore(kv) : memoryStore(),
    secret,
    ...(process.env.ATPROTO_HANDLE_RESOLVER
      ? { handleResolver: process.env.ATPROTO_HANDLE_RESOLVER }
      : {}),
  }));
}

/** Test seam: forget the cached instance. */
export function _resetAuth(): void {
  auth = undefined;
}
