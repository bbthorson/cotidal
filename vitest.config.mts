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
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
