import { test, expect } from '@playwright/test';
import { questions } from '../src/lib/discovery-questions';
import { quadrants, chart, coldState, compass, ratePage, reveal as revealCopy } from '../src/lib/copy';

/**
 * Questionnaire flow contract:
 * The questions page opens directly with structured calibration questions
 * and visible selectable options (no conversational chat input).
 *
 * The mathematical scoring underneath is covered directly in `belief-state.spec.ts`.
 */

// The four openers are fixed (CALIBRATION_IDS); their words are not this file's to know.
const opener = (id: string) => questions.find((q) => q.id === id)!;
const first = opener('triad_sugar_texture');
const second = opener('triad_bitter_botanical');

test('Questionnaire: opens directly with calibration question and selectable options', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  for (const option of first.options) await expect(page.getByText(option.text, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();
  // The count is honest about the selector being adaptive.
  await expect(page.getByText(/of about 8/)).toBeVisible();
});

test('Compass: with no coordinate it asks one thing, and still browses when asked', async ({ page }) => {
  await page.goto('/compass');
  await expect(page.getByText(first.text)).toHaveCount(0);
  // No position, so no menu: ranking around the origin would be nobody's. One way on.
  await expect(page.getByRole('heading', { level: 1, name: compass.startTitle })).toBeVisible();
  await expect(page.getByRole('region', { name: chart.label })).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.menuTitle })).toHaveCount(0);
  // Nor does the chart fill any drink as "on your menu".
  await expect(page.getByRole('region', { name: chart.label }).locator('button > span.bg-foreground')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await page.getByRole('button', { name: compass.lookUp }).click();
  await expect(page.getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.menuTitle })).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: compass.findYours }).click();
  await expect(page).toHaveURL(/\/questions$/);
  await expect(page.getByText(first.text)).toBeVisible();
});

test('Questionnaire: skipping goes to Compass', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('button', { name: /skip/i }).click();
  await expect(page).toHaveURL(/\/compass$/);
});

test('Questionnaire: someone who already has a coordinate is sent on to Compass', async ({ page }) => {
  await page.goto('/compass');
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.goto('/questions');
  await expect(page).toHaveURL(/\/compass$/);
});

test('Questionnaire: answering options advances questions and supports undo', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  await page.getByText(first.options[0].text, { exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(second.text);
  await expect(page.getByRole('button', { name: /previous question/i })).toBeVisible();

  // Test back navigation
  await page.getByRole('button', { name: /previous question/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
});

test('Questionnaire: finishing the questions reveals a region before the menu', async ({ page }) => {
  await page.goto('/questions');

  // The selector is adaptive, so the path is not fixed: take the first plate
  // until the reveal appears. It ends within eight questions.
  const reveal = page.getByText('Your coordinate lands in');
  for (let i = 0; i < 10 && !(await reveal.isVisible()); i++) {
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(heading ?? '');
  }

  await expect(reveal).toBeVisible();
  const names = quadrants.map((q) => q.name.replace(/^The /, '')).join('|');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^The (${names})\\.$`));
  await page.getByRole('button', { name: revealCopy.continue }).click();
  await expect(page).toHaveURL(/\/compass$/);

  // After the reveal, Compass: the chart, your menu, and a search over drinks and bars.
  await expect(page.getByRole('region', { name: chart.label })).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
});

test('Menu: one ranked list, with no occasion switch', async ({ page }) => {
  await page.goto('/compass');
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.reload();

  await expect(page.getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  // The occasion tabs are gone; the menu ranks by distance, with taste only sorting drinks about as close.
  await expect(page.getByRole('group', { name: 'Occasion' })).toHaveCount(0);
  for (const label of ['Usual', 'Night out', 'Impress', 'Holiday']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }

  // Each drink says how far it lies from you, never a predicted score.
  const far = await page.getByLabel(/ away$/).allTextContents();
  expect(far.length).toBeGreaterThan(1);
  far.forEach((d) => expect(Number(d)).toBeGreaterThanOrEqual(0));

  // Compass opens on the chart.
  await expect(page.getByRole('region', { name: chart.label })).toBeVisible();
});

test('Compass: search a drink, tap it, then "Rate this" opens the rating sheet on that drink', async ({ page }) => {
  await page.goto('/compass');
  await page.getByRole('button', { name: compass.lookUp }).click();

  // A drink is found by what is in it, not only by its name.
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('mezcal');
  const first = page.locator('ol > li').first();
  await expect(first).toBeVisible();
  const drink = (await first.locator('.font-serif').textContent())!.trim();

  // A typed bar the log has never seen still opens its menu there.
  await expect(page.getByRole('button', { name: new RegExp(compass.pickAt('mezcal')) })).toBeVisible();

  await first.getByRole('button').click();
  await expect(page.getByText(chart.howFar, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Rate this' }).click();
  // A sheet over Compass, not a page: the address does not change.
  await expect(page).toHaveURL(/\/compass$/);
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  // A guest with no coordinate starts from the cold state; the drink waits.
  const asGuest = sheet.getByRole('button', { name: coldState.guestCta });
  const form = sheet.getByRole('heading', { name: ratePage.heading });
  await expect(asGuest.or(form)).toBeVisible();
  if (await asGuest.isVisible()) await asGuest.click();
  await expect(form).toBeVisible();
  await expect(page.getByLabel('What you’re drinking')).toHaveValue(new RegExp(drink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 6)));
});
