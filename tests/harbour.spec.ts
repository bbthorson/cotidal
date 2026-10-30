import { test, expect } from '@playwright/test';
import { harbour } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('Harbour: with no coordinate, it sends you to find one', async ({ page }) => {
  await page.goto('/harbour');
  await expect(page.getByRole('heading', { name: harbour.coldTitle })).toBeVisible();
  await expect(page.getByRole('link', { name: harbour.coldCta })).toHaveAttribute('href', '/questions');
});

test('Harbour: where, the menu, the pick — then the draft waits on the chart', async ({ page }) => {
  await page.addInitScript((p) => {
    // Only on the first load: the flow writes its own pick after.
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  await page.goto('/harbour');

  const next = page.getByRole('button', { name: harbour.next });
  await expect(page.getByRole('heading', { name: harbour.whereTitle })).toBeVisible();
  await expect(next).toBeDisabled();
  await page.getByLabel(harbour.barLabel).fill('Attaboy');
  await next.click();

  // Two drinks on the map and one the map does not know.
  await expect(page.getByRole('heading', { name: harbour.menuTitle })).toBeVisible();
  const add = page.getByLabel(harbour.addLabel);
  for (const drink of ['Last Word', 'negroni', 'House Special']) {
    await add.fill(drink);
    await add.press('Enter');
  }
  await expect(page.getByText(harbour.placed, { exact: true })).toHaveCount(2);
  await expect(page.getByText(harbour.unplaced, { exact: true })).toHaveCount(1);
  await next.click();

  // Ranked, closest first, with what could not be placed set apart.
  await expect(page.getByRole('heading', { name: harbour.pickTitle('Attaboy') })).toBeVisible();
  const scores = await page.getByLabel(/^Closeness \d+$/).evaluateAll((els) => els.map((el) => Number(el.textContent)));
  expect(scores).toHaveLength(2);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
  await expect(page.getByText('House Special')).toBeVisible();

  await page.getByRole('button', { name: /Negroni/ }).click();
  await page.getByRole('button', { name: harbour.pickThis }).click();

  // Picked: rating hands the draft to /rate, with no rating in it.
  await expect(page.getByRole('heading', { name: 'Negroni' })).toBeVisible();
  const rate = page.getByRole('link', { name: harbour.rateNow });
  const href = new URL((await rate.getAttribute('href'))!, 'http://x');
  expect(href.pathname).toBe('/rate');
  expect(href.searchParams.get('draft')).toBe('1');
  expect(href.searchParams.get('drink')).toBe('Negroni');
  expect(href.searchParams.get('bar')).toBe('Attaboy');

  // Until it is rated, the chart says so.
  await page.getByRole('link', { name: harbour.rateLater }).click();
  await expect(page.getByText(harbour.waiting)).toBeVisible();
  await page.getByRole('button', { name: harbour.dismiss }).click();
  await expect(page.getByText(harbour.waiting)).toHaveCount(0);
});
