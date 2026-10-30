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
 * Where a form sign-out lands, and the marker every island looks for to
 * clear this device's copy of the coordinate (AtprotoProvider).
 */
export const SIGNED_OUT_PARAM = 'signed_out';
export const signedOutPath = `/compass?${SIGNED_OUT_PARAM}=1`;

/** The questions, and the marker that makes them start over (from Log's account). */
export const QUESTIONS_PATH = '/questions';
export const START_OVER_PARAM = 'startover';
export const startOverPath = `${QUESTIONS_PATH}?${START_OVER_PARAM}=1`;

/** Where a pour is rated; a draft from a chat assistant arrives here too (pour-draft.ts). */
export const RATE_PATH = '/rate';
