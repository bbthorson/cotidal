/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

/**
 * The Workers runtime's binding accessor. Only resolvable inside workerd, so
 * `src/lib/runtime.ts` imports it dynamically and falls back off-platform —
 * this declaration exists so the build typechecks in both places.
 *
 * Bindings are declared in `wrangler.toml`.
 */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
