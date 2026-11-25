import {
  createAtprotoAuth,
  d1Store,
  durableObjectLock,
  kvStore,
  memoryStore,
  type AtprotoAuth,
  type AuthStore,
} from '@bbthorson/atproto-cf-auth/server';
import { AUTH_BASE_PATH } from './paths';
import { movingStore } from './moving-store';
import { d1Binding, durableObjectBinding, kvBinding, workersEnv } from '../runtime';

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
 * `/map` restores twice at once (palate and pours); without this, two isolates
 * can both refresh the same one-use token and the loser signs the member out.
 * Off Workers it is absent, and the package locks within the process instead.
 */
export const AUTH_LOCK_BINDING = 'AUTH_LOCK';


/**
 * The D1 database sessions move to, declared in `wrangler.toml`. Strongly
 * consistent, which is what makes `AUTH_LOCK` a guarantee: with KV alone, a
 * request at another location can read a spent refresh token for up to a
 * minute after a refresh. While both are bound, members move across as they
 * are seen (`movingStore`); nobody is signed out.
 */
export const SESSION_D1_BINDING = 'ATPROTO_DB';

/**
 * The ES256 private key that makes this a confidential OAuth client
 * (`private_key_jwt`), a Worker secret holding the JWK as JSON, with a `kid`.
 * Authorization servers give confidential clients much longer sessions,
 * which an assistant acting for someone between their visits needs. To
 * rotate, set `OAUTH_PRIVATE_KEYS` to a JSON array, new key first, and keep
 * the old one until its sessions have refreshed.
 */
export const PRIVATE_KEY_SECRET = 'OAUTH_PRIVATE_KEY';
export const PRIVATE_KEYS_SECRET = 'OAUTH_PRIVATE_KEYS';

/** The longest a session lives (the package's default), and so how long a copied one is kept. */
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Used only off-platform, where there is no secret to configure and nothing to protect. */
const DEV_SECRET = 'crystal-coupe-local-development-secret-not-for-production';

let auth: AtprotoAuth | null | undefined;

/**
 * The switch, read at runtime and only here. It used to be read three ways —
 * `import.meta.env` on `/` and in the island (inlined when the site is built)
 * and `process.env` on the server (read on the Worker) — so a variable set in
 * one place but not the other left the page and the server disagreeing about
 * whether sign-in existed. Pages now ask `signInEnabled()` instead.
 */
function enabled(env: Record<string, unknown> | undefined): boolean {
  return !!((env?.ATPROTO_ENABLED as string | undefined) ?? process.env.ATPROTO_ENABLED);
}

/**
 * The auth instance, or `null` when sign-in is switched off or has no secret.
 *
 * On Workers the secret is `SESSION_SECRET` (a Worker secret, 32+ characters)
 * and its absence means "not configured": sessions sealed under a guessable
 * key are worse than no sessions.
 */
export async function getAuth(): Promise<AtprotoAuth | null> {
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

  const lock = await durableObjectBinding(AUTH_LOCK_BINDING);
  let privateKeys: Record<string, unknown>[] | undefined;
  try {
    privateKeys = readPrivateKeys(env);
  } catch (e) {
    // A malformed key is a misconfiguration, not a reason to sign everyone
    // out: stay a public client and say so.
    console.error(`${PRIVATE_KEY_SECRET} could not be read; signing in as a public client.`, e);
  }

  return (auth = createAtprotoAuth({
    appName: 'Cotidal',
    basePath: AUTH_BASE_PATH,
    redirectTo: '/compass',
    scope: 'atproto transition:generic',
    metadata: {
      logo_uri: 'https://cotidal.app/apple-touch-icon.png',
    },
    store: await sessionStore(),
    sessionTtlSeconds: SESSION_TTL_SECONDS,
    ...(lock ? { requestLock: durableObjectLock(lock) } : {}),
    ...(privateKeys?.length ? { privateKeys } : {}),
    secret,
    ...(process.env.ATPROTO_HANDLE_RESOLVER
      ? { handleResolver: process.env.ATPROTO_HANDLE_RESOLVER }
      : {}),
  }));
}

/**
 * Where sessions live: D1 when bound (taking members over from KV as they are
 * seen, while KV is bound too), else KV, else memory, which is per-isolate on
 * Workers and so only for development.
 */
async function sessionStore(): Promise<AuthStore> {
  const [d1, kv] = await Promise.all([d1Binding(SESSION_D1_BINDING), kvBinding(SESSION_KV_BINDING)]);
  if (d1 && kv) return movingStore(d1Store(d1), kvStore(kv), SESSION_TTL_SECONDS);
  if (d1) return d1Store(d1);
  if (kv) return kvStore(kv);
  return memoryStore();
}

/** The confidential client's keys, from either secret; `undefined` for a public client. */
export function readPrivateKeys(env: Record<string, unknown> | undefined): Record<string, unknown>[] | undefined {
  const raw = (env?.[PRIVATE_KEYS_SECRET] ?? env?.[PRIVATE_KEY_SECRET]) as string | undefined;
  if (!raw) return undefined;
  const parsed: unknown = JSON.parse(raw);
  const keys = Array.isArray(parsed) ? parsed : [parsed];
  if (!keys.every((k) => k && typeof k === 'object' && typeof (k as { kid?: unknown }).kid === 'string')) {
    throw new Error('every private key must be a JWK object with a kid');
  }
  return keys as Record<string, unknown>[];
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
