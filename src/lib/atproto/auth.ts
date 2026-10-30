import {
  createBlueskyAuth,
  durableObjectLock,
  kvStore,
  memoryStore,
  type BlueskyAuth,
} from '@bbthorson/atproto-cf-auth/server';
import { AUTH_BASE_PATH } from './paths';
import { durableObjectBinding, kvBinding, workersEnv } from '../runtime';

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

/**
 * The Durable Object that serialises each member's session restores across
 * isolates, declared in `wrangler.toml` and exported by `src/worker.ts`.
 * `/log` restores twice at once (palate and pours); without this, two isolates
 * can both refresh the same one-use token and the loser signs the member out.
 * Off Workers it is absent, and the package locks within the process instead.
 */
export const AUTH_LOCK_BINDING = 'AUTH_LOCK';


/** Used only off-platform, where there is no secret to configure and nothing to protect. */
const DEV_SECRET = 'crystal-coupe-local-development-secret-not-for-production';

let auth: BlueskyAuth | null | undefined;

/**
 * The switch, read at runtime and only here. It used to be read three ways —
 * `import.meta.env` on `/` and in the island (inlined when the site is built)
 * and `process.env` on the server (read on the Worker) — so a variable set in
 * one place but not the other left the page and the server disagreeing about
 * whether sign-in existed. Pages now ask `signInEnabled()` instead.
 *
 * `PUBLIC_ATPROTO_ENABLED` is still accepted because deployments already set
 * it; the prefix no longer means anything.
 */
function enabled(env: Record<string, unknown> | undefined): boolean {
  const read = (name: string) => (env?.[name] as string | undefined) ?? process.env[name];
  return !!(read('ATPROTO_ENABLED') || read('PUBLIC_ATPROTO_ENABLED'));
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

  const env = await workersEnv();
  if (!enabled(env)) return (auth = null);
  const secret =
    (env?.SESSION_SECRET as string | undefined) ??
    process.env.SESSION_SECRET ??
    (env ? undefined : DEV_SECRET);
  if (!secret) {
    console.error('SESSION_SECRET is not set; sign-in is disabled.');
    return (auth = null);
  }

  const kv = await kvBinding(SESSION_KV_BINDING);
  const lock = await durableObjectBinding(AUTH_LOCK_BINDING);

  return (auth = createBlueskyAuth({
    appName: 'Cotidal',
    basePath: AUTH_BASE_PATH,
    redirectTo: '/compass',
    scope: 'atproto transition:generic',
    store: kv ? kvStore(kv) : memoryStore(),
    ...(lock ? { requestLock: durableObjectLock(lock) } : {}),
    secret,
    ...(process.env.ATPROTO_HANDLE_RESOLVER
      ? { handleResolver: process.env.ATPROTO_HANDLE_RESOLVER }
      : {}),
  }));
}

/**
 * Whether sign-in is on: switched on *and* able to seal sessions. The one
 * answer `/` and every app page render from, so the form is offered exactly
 * when the login route will accept it.
 */
export async function signInEnabled(): Promise<boolean> {
  return (await getAuth()) !== null;
}

/** Test seam: forget the cached instance. */
export function _resetAuth(): void {
  auth = undefined;
}
