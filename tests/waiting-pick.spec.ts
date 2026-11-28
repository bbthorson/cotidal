import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { explore, moved, waitingPick } from '../src/lib/copy';

const profile = { x: -4, y: -3, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

const seed = (args: { profile: typeof profile; pick: { drink: string; bar?: string; atHome?: boolean; pickedAt: string } }) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('user_profile', JSON.stringify(args.profile));
    localStorage.setItem('open_order', JSON.stringify(args.pick));
    sessionStorage.setItem('seeded', '1');
  }
};

test('Waiting pick: one tap logs the pour, shows Moved with the map in view on a phone, adds to Your pours, and clears the pick', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pickedAt = new Date(Date.now() - 40 * 60 * 1000).toISOString();
  await page.addInitScript(seed, { profile, pick: { drink: 'Negroni', bar: 'Attaboy', pickedAt } });
  await page.goto(appPath);

  const strip = page.getByTestId('waiting-pick');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText(waitingPick.waiting);
  await expect(strip).toContainText('Negroni');
  await expect(strip).toContainText('Attaboy');
  await expect(strip).toContainText(waitingPick.pickedMinutes(40));

  // One tap on a hedonic cell logs immediately and shows Moved without scrolling the map away.
  await strip.getByRole('radio', { name: /^8:/ }).click();
  await expect(page.getByRole('heading', { name: /^Moved \d/ })).toBeVisible();
  const mapBox = await page.locator(`[role="group"][aria-label="${explore.mapLabel}"]`).boundingBox();
  expect(mapBox).not.toBeNull();
  expect(mapBox!.y).toBeGreaterThanOrEqual(0);
  expect(mapBox!.y + mapBox!.height).toBeLessThan(844);

  await page.getByRole('button', { name: moved.back }).click();

  // Back on where to next: the pick is gone, Negroni · 8 is in Again, and Your pours holds the pour.
  await expect(page.getByTestId('waiting-pick')).toHaveCount(0);
  await expect(page.getByRole('region', { name: explore.cardLabel }).getByText(explore.ratedMark('Negroni', 8))).toBeVisible();
  await page.getByTestId('open-your-pours').click();
  const yours = page.locator('#yours');
  await expect(yours).toContainText('Negroni');
  await expect(yours).toContainText('Attaboy');
  await expect(yours).toContainText('8 of 9');
});

test('Waiting pick: Another logs a reorder and keeps the pick waiting for the next round', async ({ page }) => {
  const pickedAt = new Date(Date.now() - 25 * 60 * 1000).toISOString();
  await page.addInitScript(seed, { profile, pick: { drink: 'Manhattan', bar: 'Dante', pickedAt } });
  await page.goto(appPath);

  const strip = page.getByTestId('waiting-pick');
  await strip.getByRole('button', { name: waitingPick.another }).click();
  await expect(page.getByRole('heading', { name: /^Moved \d/ })).toBeVisible();
  await page.getByRole('button', { name: moved.back }).click();

  // Pick stays waiting for the next round, and the pour is recorded with wouldOrderAgain.
  await expect(page.getByTestId('waiting-pick')).toBeVisible();
  await expect(page.getByTestId('waiting-pick')).toContainText('Manhattan');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_pours') ?? '[]'));
  expect(saved).toHaveLength(1);
  expect(saved[0].drink.name).toBe('Manhattan');
  expect(saved[0].rating.wouldOrderAgain).toBe(true);
});

test('Waiting pick: Didn’t have it clears the pick with no rating', async ({ page }) => {
  const pickedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await page.addInitScript(seed, { profile, pick: { drink: 'Daiquiri', bar: 'Attaboy', pickedAt } });
  await page.goto(appPath);

  const strip = page.getByTestId('waiting-pick');
  await strip.getByRole('button', { name: waitingPick.didntHave }).click();
  await expect(page.getByTestId('waiting-pick')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_pours') ?? '[]'));
  expect(saved).toHaveLength(0);
});

test('Waiting pick: a pick older than 12 hours asks in the past tense and offers Set it aside', async ({ page }) => {
  const pickedAt = new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString();
  await page.addInitScript(seed, { profile, pick: { drink: 'Negroni', bar: 'Attaboy', pickedAt } });
  await page.goto(appPath);

  const strip = page.getByTestId('waiting-pick');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText(waitingPick.pastWaiting);
  await expect(strip).toContainText(waitingPick.lastNight);
  await expect(strip.getByRole('button', { name: waitingPick.dismiss })).toBeVisible();
  await expect(strip.getByRole('button', { name: waitingPick.another })).toHaveCount(0);

  await strip.getByRole('button', { name: waitingPick.dismiss }).click();
  await expect(page.getByTestId('waiting-pick')).toHaveCount(0);
});
