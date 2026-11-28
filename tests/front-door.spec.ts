import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { COORDINATE_COOKIE } from '../src/lib/device-presence';
import { coldState, compass, footer, hero, reveal as revealCopy } from '../src/lib/copy';
import { frontDoorHref, questionsForVenue, questionsHref } from '../src/lib/site-nav';
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

/**
 * Wherever a page's own action is something else, its foot asks a reader with
 * no coordinate to find theirs, decided on the server (`readerHasTaste`).
 */
test('Find yours: at the foot of a page for someone with no coordinate, and not for someone with one', async ({ page }) => {
  const footOf = async (path: string) => {
    const html = await (await page.request.get(path, { headers: { accept: 'text/html' } })).text();
    return html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  };
  for (const path of ['/bars', '/mcp']) {
    const foot = await footOf(path);
    expect(foot, path).toContain('data-testid="find-yours"');
    expect(foot, path).toContain(`href="${questionsHref}"`);
    expect(foot, path).toContain(footer.findYoursCta);
  }
  // Pages whose own action is the questions, or no place for them, do not ask again; a prerendered page cannot know.
  for (const path of ['/', '/sign-in', '/drinks/negroni/', '/nowhere', '/p/deep.test']) {
    expect(await footOf(path), path).not.toContain('data-testid="find-yours"');
  }
  // A page that answers per reader says so to any cache between.
  expect((await page.request.get('/bars')).headers()['vary']).toMatch(/cookie/i);

  await page.context().addCookies([mark]);
  expect(await footOf('/bars')).not.toContain('data-testid="find-yours"');
});

test('Find yours: from a bar, the questions finish on its menu, ranked', async ({ page }) => {
  // The app reads the bar's published menu from the browser (`/api/venue`), so it can be stood in for.
  await page.route('**/api/venue?handle=*', (route) =>
    route.fulfill({
      json: {
        status: 'ok',
        venue: { name: 'The Tidewater', menu: { sections: [{ items: [{ name: 'Negroni', description: null }, { name: 'Daiquiri', description: null }] }] } },
      },
    })
  );
  await page.goto(questionsForVenue('tidewater.example'));

  const reveal = page.getByText('Your coordinate lands in');
  for (let i = 0; i < 10 && !(await reveal.isVisible()); i++) {
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(heading ?? '');
  }
  await page.getByRole('button', { name: revealCopy.continue }).click();

  await expect(page.getByRole('heading', { name: 'The Tidewater', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.atMenu.rankedAt('The Tidewater') })).toBeVisible();
  await expect(page.getByText('Negroni').first()).toBeVisible();
});
