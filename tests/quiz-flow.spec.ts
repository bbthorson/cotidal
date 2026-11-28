import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { questions } from '../src/lib/palate/discovery-questions';
import { a11y, quadrants, chart, compass, explore, reveal as revealCopy } from '../src/lib/copy';

/**
 * Questionnaire flow contract:
 * The questions, a state of the map's card (`/?quiz=1`), open directly with structured calibration questions
 * and visible selectable options (no conversational chat input).
 *
 * The mathematical scoring underneath is covered directly in `belief-state.spec.ts`.
 */

// The four openers are fixed (CALIBRATION_IDS); their words are not this file's to know.
const opener = (id: string) => questions.find((q) => q.id === id)!;
const first = opener('triad_sugar_texture');
const second = opener('triad_bitter_botanical');

test('Questionnaire: opens directly with calibration question and selectable options', async ({ page }) => {
  await page.goto('/?quiz=1');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  for (const option of first.options) await expect(page.getByText(option.text, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();
  // The count is honest about the selector being adaptive.
  await expect(page.getByText(/of about 8/)).toBeVisible();
});

test('Questionnaire: skipping goes to the map', async ({ page }) => {
  await page.goto('/?quiz=1');
  await page.getByRole('button', { name: /skip/i }).click();
  await expect(page).toHaveURL(/\/(\?q=)?$/);
});

test('Questionnaire: someone who already has a coordinate goes straight on to the map, or the drink they came from', async ({ page }) => {
  await page.goto(appPath);
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.goto('/?quiz=1');
  await expect(page).toHaveURL(/\/(\?q=)?$/);
  await expect(page.getByRole('heading', { name: compass.newTitle })).toBeVisible();
  // From a drink's page the same link goes on to that drink on the map.
  await page.goto('/?drink=negroni&quiz=1');
  await expect(page).toHaveURL(/\/\?drink=negroni$/);
  await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible();
});

test('Questionnaire: answering options advances questions and supports undo', async ({ page }) => {
  await page.goto('/?quiz=1');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  await page.getByText(first.options[0].text, { exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(second.text);
  await expect(page.getByRole('button', { name: /previous question/i })).toBeVisible();

  // Test back navigation
  await page.getByRole('button', { name: /previous question/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
});

test('Questionnaire: the questions run in the card over the map, and the shoal on the map narrows as they are answered', async ({ page }) => {
  await page.goto('/?quiz=1');
  const map = page.getByRole('group', { name: explore.mapLabel });
  const shoal = map.locator('ellipse');
  await expect(map).toBeVisible();
  await expect(shoal).toHaveCount(1);
  const area = async () => {
    const box = (await shoal.boundingBox())!;
    return box.width * box.height;
  };
  const before = await area();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('group', { name: a11y.answerOptions }).getByRole('button').first().click();
    await page.waitForTimeout(700);
  }
  await expect.poll(area).toBeLessThan(before);
});

test('Questionnaire: finishing the questions reveals a region before the menu', async ({ page }) => {
  await page.goto('/?quiz=1');

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
  await expect(page).toHaveURL(/\/(\?q=)?$/);

  // After the reveal, the map: your terrain, your menu, and a search over drinks and bars in the header.
  await expect(page.locator(`[role="group"][aria-label="${explore.mapLabel}"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.newTitle })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
});

test('Menu: one ranked list, with no occasion switch', async ({ page }) => {
  await page.goto(appPath);
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.reload();

  await expect(page.getByRole('heading', { name: compass.newTitle })).toBeVisible();
  // The occasion tabs are gone; the menu ranks on your terrain, with taste only sorting drinks that stand level.
  await expect(page.getByRole('group', { name: 'Occasion' })).toHaveCount(0);
  for (const label of ['Usual', 'Night out', 'Impress', 'Holiday']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }

  // Each drink says what put it there — with nothing rated, where your answers put you —
  // never a predicted score, and no distance that the order would not follow.
  expect(await page.getByText(chart.reason([]), { exact: true }).count()).toBeGreaterThan(1);
  await expect(page.getByLabel(/ away$/)).toHaveCount(0);

  // The map is drawn behind the card.
  await expect(page.locator(`[role="group"][aria-label="${explore.mapLabel}"]`)).toBeVisible();
});


test('Questionnaire: on an iPhone, a question and every one of its plates fit on one screen, with no scrolling', async ({ browser }) => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.goto('/?quiz=1');
    const plates = page.getByRole('group', { name: a11y.answerOptions });
    await plates.waitFor();
    for (let i = 0; i < 6; i++) {
      if (!(await plates.isVisible())) break;
      const last = (await plates.getByRole('button').last().boundingBox())!;
      expect(last.y + last.height, `${viewport.width}×${viewport.height}, question ${i + 1}`).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await plates.getByRole('button').first().click();
      await page.waitForTimeout(700);
    }
    await page.context().close();
  }
});

test('Questionnaire: each answer adds depth: the map draws the ground the answers so far make', async ({ page }) => {
  await page.goto('/?quiz=1');
  const map = page.getByRole('group', { name: explore.mapLabel });
  const plates = page.getByRole('group', { name: a11y.answerOptions });
  await plates.waitFor();
  // From the start, the questions' own hill is shaded under the shoal.
  await expect(map.locator('mask image').first()).toBeAttached();
  const ground = async () => (await map.locator('mask image').first().getAttribute('href')) ?? '';
  const before = await ground();
  await plates.getByRole('button').first().click();
  await expect.poll(ground).not.toBe(before);
});
