import { test, expect } from '@playwright/test';

/**
 * `/settings` is a member's page: a guest is sent to sign in, and a
 * Disconnect posted without a session changes nothing. What a member sees is
 * covered against the OAuth provider in tests/unit/settings-assistants.test.ts.
 */

test('Settings: a guest is sent to sign in', async ({ page }) => {
  await page.goto('/settings');
  expect(new URL(page.url()).pathname).toBe('/sign-in');
});

test('Settings: a Disconnect without a session is sent to sign in, not acted on', async ({ request }) => {
  const res = await request.post('/settings', {
    form: { grant: 'anything' },
    headers: { origin: new URL('/', test.info().project.use.baseURL ?? 'http://localhost:9002').origin },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers()['location']).toContain('/sign-in');
});
