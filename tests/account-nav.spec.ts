import { test, expect } from '@playwright/test';
import { SIGNED_OUT_PARAM, START_OVER_PARAM, signedOutPath, startOverPath } from '../src/lib/atproto/paths';
import { account, compass, menu, nav } from '../src/lib/copy';
import { destinations } from '../src/lib/site-nav';
import { questions } from '../src/lib/discovery-questions';

/**
 * Who is signed in, how to stop being, and how to start over. The suite runs
 * with sign-in off, so the member half of the header is held by the pieces
 * it is built from; the guest and prerendered halves are rendered for real.
 */

const profile = { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false };

test('Header: a server-rendered page says Sign in to a guest', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  expect(header).toContain(nav.signIn);
  expect(header).not.toContain(nav.signOut);
});

test('Header: on an app page, Sign in opens the sheet there instead of leaving', async ({ request }) => {
  for (const path of ['/compass', '/log']) {
    const html = await (await request.get(path)).text();
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    expect(header, path).toContain(`href="${path}?signin=1"`);
  }
});

test('Header: a prerendered page cannot know who is reading, and says Account', async ({ request }) => {
  const html = await (await request.get('/drinks')).text();
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  expect(header).toContain('href="/log#account"');
  expect(header).toContain(`>${account.neutral}<`);
  expect(header).not.toContain(nav.signIn);
});

test('Sign out: the page it lands on forgets the coordinate on this device', async ({ page }) => {
  await page.goto('/compass');
  await page.evaluate((p) => {
    localStorage.setItem('user_profile', JSON.stringify(p));
    localStorage.setItem('pending_elicitation', '{}');
    localStorage.setItem('palate_state', '{}');
    localStorage.setItem('last_quiz', '{}');
  }, profile);

  await page.goto(signedOutPath);
  // Forgotten, so Compass has no position: it asks for one.
  await expect(page.getByRole('button', { name: compass.findYours })).toBeVisible();
  // The page is server-rendered, so it shows before the island hydrates
  // and acts on the marker: wait for that, rather than reading once.
  await expect
    .poll(() => page.evaluate(() => ['user_profile', 'pending_elicitation', 'palate_state', 'last_quiz'].map((k) => localStorage.getItem(k))))
    .toEqual([null, null, null, null]);
  // A reload does not do it again.
  await expect.poll(() => new URL(page.url()).searchParams.has(SIGNED_OUT_PARAM)).toBe(false);
});

test('Sign out: any app page forgets the device, not only Compass', async ({ page }) => {
  await page.goto('/log');
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(`/log?${SIGNED_OUT_PARAM}=1`);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user_profile'))).toBeNull();
});

test('Start over: two steps on Log, and Keep it changes nothing', async ({ page }) => {
  await page.goto('/log');
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/log');

  await page.getByRole('button', { name: account.startOver }).click();
  await expect(page.getByText(account.startOverBody)).toBeVisible();
  await page.getByRole('button', { name: account.startOverCancel }).click();
  await expect(page.getByText(menu.youAreIn)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_profile'))).not.toBeNull();

  await page.getByRole('button', { name: account.startOver }).click();
  await page.getByRole('button', { name: account.startOverCta }).click();
  await expect(page.getByText(questions.find((q) => q.id === 'triad_sugar_texture')!.text)).toBeVisible();
  // The questions are in the server's HTML too, before the island clears the device: wait for it.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user_profile'))).toBeNull();
});

test('Start over: the questions clear the old coordinate and take the marker off the address', async ({ page }) => {
  await page.goto('/compass');
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(startOverPath);
  await expect(page.getByText(questions.find((q) => q.id === 'triad_sugar_texture')!.text)).toBeVisible();
  // Server-rendered before hydration removes the marker; wait for it.
  await expect.poll(() => new URL(page.url()).searchParams.has(START_OVER_PARAM)).toBe(false);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user_profile'))).toBeNull();
});

test('Navigation: the header is the drinker\'s app; For Bars is read from the footer', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  expect(header).not.toContain('href="/bars"');
  const footer = html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  expect(footer).toContain('href="/bars"');
});

test('Navigation: the footer lists the reading pages; the app and the account are in the header', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const footer = html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  for (const d of destinations) {
    expect(footer.includes(`href="${d.href}"`), d.href).toBe(d.footer);
    // Everything in the footer is a reading page.
    if (d.footer) expect(d.app, d.href).toBe(false);
  }
  // A region is a filter on the drinks, not a destination of its own.
  expect(html).not.toContain('href="/#regions"');
  expect(footer).not.toContain(nav.signIn);
});
