import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { COORDINATE_COOKIE } from '../src/lib/device-presence';
import { coldState, hero } from '../src/lib/copy';
import { frontDoorHref } from '../src/lib/site-nav';
import { signedOutPath } from '../src/lib/atproto/paths';

/**
 * `/` is the front door for someone with nothing on the map, and the app for
 * anyone with a taste: decided on the server, from the session or from the
 * device's presence cookie (`src/lib/device-presence.ts`), so a stranger's
 * first page stays script-free (tests/landing-static.spec.ts).
 */

const profile = { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false };
const mark = { name: COORDINATE_COOKIE, value: '1', url: 'http://localhost:9002' };
const hasMark = async (page: import('@playwright/test').Page) =>
  (await page.context().cookies()).some((c) => c.name === COORDINATE_COOKIE && c.value === '1');

test('Front door: a device with a coordinate gets the app at /, and How it works still reaches the front door', async ({ page }) => {
  await page.context().addCookies([mark]);

  const app = await (await page.request.get('/')).text();
  expect(app).toContain('astro-island');
  expect(app).not.toContain(hero.headline);

  const front = await (await page.request.get(frontDoorHref)).text();
  expect(front).toContain(hero.headline);
  expect(front).not.toContain('astro-island');
});

test('Front door: the cookie follows the coordinate kept on the device', async ({ page }) => {
  // A coordinate kept before the cookie existed is marked when the map loads.
  await page.goto(appPath);
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.reload();
  await expect.poll(() => hasMark(page)).toBe(true);

  // Signing out forgets the device, and the mark with it: / is the front door again.
  await page.goto(signedOutPath);
  await expect(page.getByRole('link', { name: coldState.quizCta })).toBeVisible();
  await expect.poll(() => hasMark(page)).toBe(false);
  expect(await (await page.request.get('/')).text()).toContain(hero.headline);
});

test('Front door: there is one address; /map is gone, and anything asked of the map is the app', async ({ request }) => {
  expect((await request.get('/map')).status()).toBe(404);
  for (const path of ['/?quiz=1', '/?drink=negroni', '/?q=negroni', '/?region=deep']) {
    expect(await (await request.get(path)).text(), path).toContain('astro-island');
  }
  expect(await (await request.get('/')).text()).not.toContain('astro-island');
});
