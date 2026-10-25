/**
 * Where `@bbthorson/atproto-cf-auth`'s routes are mounted. Shared by the server
 * (`auth.ts`), the island (`use-atproto.ts`) and the landing form, so it lives
 * apart from the server module the browser must not import.
 */
export const AUTH_BASE_PATH = '/api/auth/atproto';

/**
 * The path of someone's public map. DIDs are permanent; handles read better.
 * Both are left unescaped: `parseActor` (public-read.ts) admits only URL-safe characters, and
 * `/p/did%3Aplc%3A…` is not a link anyone would recognise.
 */
export function publicMapPath(actor: string): string {
  return `/p/${actor}`;
}

/**
 * Where a form sign-out lands, and the marker the island looks for there to
 * clear this device's copy of the coordinate (Home.tsx).
 */
export const SIGNED_OUT_PARAM = 'signed_out';
export const signedOutPath = `/taste?${SIGNED_OUT_PARAM}=1`;

/** Asks /taste to start the questions over (from /account). */
export const START_OVER_PARAM = 'startover';
