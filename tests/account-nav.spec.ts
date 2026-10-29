import { test, expect } from '@playwright/test';
import { isFormSignOut, toSignedOut } from '../src/lib/atproto/sign-out';
import { SIGNED_OUT_PARAM, START_OVER_PARAM, signedOutPath } from '../src/lib/atproto/paths';
import { derivePalateRecord } from '../src/lib/sensory';
import { account, menu, nav } from '../src/lib/copy';
import { destinations } from '../src/lib/site-nav';
import type { Palate } from '../src/lib/atproto/records';

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

test('Header: a prerendered page cannot know who is reading, and says Account', async ({ request }) => {
  const html = await (await request.get('/drinks')).text();
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  expect(header).toContain('href="/account"');
  expect(header).toContain(`>${nav.account}<`);
  expect(header).not.toContain(nav.signIn);
});

test('Account: server-rendered, script-free, and offers sign-in to a guest', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(account.guestTitle);
  // The form when sign-in is on, the plain statement when it is off.
  const form = page.locator('form[action="/api/auth/atproto/login"]');
  await expect(form.or(page.getByText('Sign-in is not enabled in this environment.')).first()).toBeVisible();
  expect(scripts).toEqual([]);
});

test('Sign out: the form post lands on /taste marked, with the cleared cookie kept', () => {
  const request = new Request('https://cotidal.app/api/auth/atproto/logout', { method: 'POST' });
  const packaged = new Response(null, {
    status: 303,
    headers: { location: '/taste', 'set-cookie': 'bsky_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure' },
  });
  expect(isFormSignOut(request, packaged)).toBe(true);
  const out = toSignedOut(packaged);
  expect(out.status).toBe(303);
  expect(out.headers.get('location')).toBe(signedOutPath);
  expect(out.headers.get('set-cookie')).toContain('bsky_sid=;');

  // The island's JSON calls and the other routes pass through untouched.
  expect(isFormSignOut(new Request('https://cotidal.app/api/auth/atproto/session'), packaged)).toBe(false);
  expect(isFormSignOut(request, new Response(null, { status: 204 }))).toBe(false);
});

test('Sign out: /taste forgets the coordinate on this device', async ({ page }) => {
  await page.goto('/taste');
  await page.evaluate((p) => {
    localStorage.setItem('user_profile', JSON.stringify(p));
    localStorage.setItem('pending_elicitation', '{}');
    localStorage.setItem('palate_state', '{}');
  }, profile);

  await page.goto(`/taste?${SIGNED_OUT_PARAM}=1`);
  await expect(page.getByText('Which glass do you push away first?')).toBeVisible();
  // The question is server-rendered, so it shows before the island hydrates
  // and acts on the marker: wait for that, rather than reading once.
  await expect
    .poll(() => page.evaluate(() => ['user_profile', 'pending_elicitation', 'palate_state'].map((k) => localStorage.getItem(k))))
    .toEqual([null, null, null]);
  // A reload does not do it again.
  await expect.poll(() => new URL(page.url()).searchParams.has(SIGNED_OUT_PARAM)).toBe(false);
});

test('Start over: two steps on Log, and Keep it changes nothing', async ({ page }) => {
  await page.goto('/log');
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/log');

  await page.getByRole('button', { name: menu.startOver }).click();
  await expect(page.getByText(account.startOverBody)).toBeVisible();
  await page.getByRole('button', { name: menu.startOverCancel }).click();
  await expect(page.getByText('You are in')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_profile'))).not.toBeNull();

  await page.getByRole('button', { name: menu.startOver }).click();
  await page.getByRole('button', { name: account.startOverCta }).click();
  await expect(page.getByText('Which glass do you push away first?')).toBeVisible();
  // The questions are in the server's HTML too, before the island clears the device: wait for it.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user_profile'))).toBeNull();
});

test('Start over: /account sends you to the questions', async ({ page }) => {
  await page.goto('/taste');
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(`/taste?${START_OVER_PARAM}=1`);
  await expect(page.getByText('Which glass do you push away first?')).toBeVisible();
  // Server-rendered before hydration removes the marker; wait for it.
  await expect.poll(() => new URL(page.url()).searchParams.has(START_OVER_PARAM)).toBe(false);
});

test('Start over: a retake restarts the filter instead of keeping the old one', () => {
  const existing: Palate = {
    $type: 'app.cotidal.palate',
    mapCoordinates: { x: -6, y: 5 },
    dynamicState: { latentVector: [-6, 5, 7, 6, 8], covarianceDiagonal: [1, 1, 2, 2, 2], eventCount: 14 },
    aversions: { smoke: false, bitter: false, anise: false },
    vibeTags: {},
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  const record = derivePalateRecord(profile, existing);
  // The old state pulled the next pour back toward (-6, 5).
  expect(record.dynamicState.latentVector.slice(0, 2)).toEqual([4, -2]);
  expect(record.dynamicState.eventCount).toBe(0);
  expect(record.createdAt).toBe(existing.createdAt);
});

test('Navigation: the footer lists the reading pages; the app and the account are in the header', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const footer = html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  for (const d of destinations) {
    expect(footer.includes(`href="${d.href}"`), d.href).toBe(!d.app);
  }
  expect(footer).not.toContain(nav.signIn);
});
