import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Logic tests: plain functions over plain data — scoring, the belief state,
 * records against their lexicons, the chat tools. No server and no browser,
 * so they run in seconds (`npm run test:unit`). Anything that needs a page or
 * a route is a Playwright spec in `tests/*.spec.ts` (`npm run test:e2e`).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Only Workers resolve it; the OAuth provider imports it at the top.
      'cloudflare:workers': fileURLToPath(new URL('./tests/unit/stubs/cloudflare-workers.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Bundled rather than left to Node, so the alias above reaches its import.
    server: { deps: { inline: ['@cloudflare/workers-oauth-provider'] } },
  },
});
