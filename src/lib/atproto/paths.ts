/**
 * Where `@bbthorson/atproto-cf-auth`'s routes are mounted. Shared by the server
 * (`auth.ts`), the island (`use-atproto.ts`) and the landing form, so it lives
 * apart from the server module the browser must not import.
 */
export const AUTH_BASE_PATH = '/api/auth/atproto';
