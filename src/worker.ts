/**
 * The Worker's entry, named by `main` in wrangler.toml. Astro's handler serves
 * every request; this file exists to export the Durable Object classes the
 * Worker binds, which Astro's own entry cannot, and to put member sign-in for
 * chat assistants in front of it.
 *
 * `AuthLock` serialises each member's session restores across isolates, so two
 * requests cannot both spend the one-use refresh token and sign them out
 * (`requestLock` in src/lib/atproto/auth.ts).
 *
 * `withMemberSignIn` makes this Worker an OAuth authorization server for MCP
 * clients, guarding `/mcp/me` (src/lib/mcp/member-auth.ts). It is inert until
 * the `OAUTH_KV` namespace is bound.
 */
import astro from '@astrojs/cloudflare/entrypoints/server';
import { withMemberSignIn } from './lib/mcp/member-auth';

export { AuthLock } from '@bbthorson/atproto-cf-auth/server';

export default withMemberSignIn(astro);
