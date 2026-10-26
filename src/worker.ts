/**
 * The Worker's entry, named by `main` in wrangler.toml. Astro's handler serves
 * every request; this file exists only to also export the Durable Object
 * classes the Worker binds, which Astro's own entry cannot.
 *
 * `AuthLock` serialises each member's session restores across isolates, so two
 * requests cannot both spend the one-use refresh token and sign them out
 * (`requestLock` in src/lib/atproto/auth.ts).
 */
import astro from '@astrojs/cloudflare/entrypoints/server';

export { AuthLock } from '@bbthorson/atproto-cf-auth/server';

export default astro;
