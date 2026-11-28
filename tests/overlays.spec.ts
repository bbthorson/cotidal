import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { explore, overlays as copy } from '../src/lib/copy';

const profile = {
  x: -5,
  y: -5,
  dislikesSmoke: false,
  dislikesBitter: false,
  dislikesAnise: false,
  vibeTags: {},
};

const seedOnce = (p: typeof profile) => {
  if (!localStorage.getItem('user_profile')) {
    localStorage.setItem('user_profile', JSON.stringify(p));
  }
};

test('Overlays: With someone draws comparison & against contours, and adding a second switches to Table mode', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);

  const bar = page.getByTestId('overlay-bar');
  await expect(bar).toBeVisible();

  // Add 1 companion (surf.test) → With mode
  await page.getByTestId('overlay-with-btn').click();
  await page.getByRole('button', { name: copy.sampleSurf }).click();

  await expect(page.getByTestId('companion-chip-surf.test')).toBeVisible();
  await expect(page).toHaveURL(/with=surf\.test/);
  await expect(page.getByTestId('overlay-with-comparison')).toBeVisible();
  await expect(page.getByTestId('overlay-table-picks')).toBeVisible();
  await expect(page.locator('[data-against]')).toHaveCount(1);

  // Add a second companion (deep.test) → Table mode
  await page.getByTestId('overlay-with-btn').click();
  await page.getByRole('button', { name: copy.sampleDeep }).click();

  await expect(page.getByTestId('companion-chip-deep.test')).toBeVisible();
  await expect(page).toHaveURL(/table=surf\.test(%2C|,)deep\.test/);
  await expect(page.getByTestId('overlay-table-picks')).toContainText(copy.tableTitle(3));
});

test('Overlays: comparing with someone draws the comparison\'s drinks and the table\'s picks, not the staples', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);
  const drawn = (name: string) => page.getByRole('group', { name: explore.mapLabel }).getByRole('button', { name, exact: true });
  await expect(drawn('Mojito')).toHaveCount(1);

  await page.goto('/?with=surf.test');
  const picks = page.getByTestId('overlay-table-picks');
  await expect(picks).toBeVisible();
  // Where the two part, each way.
  await expect(drawn('Manhattan')).toHaveCount(1);
  await expect(drawn('Daiquiri')).toHaveCount(1);
  // The staples give way: what is drawn is the two, the eight picks and nothing else.
  await expect(drawn('Mojito')).toHaveCount(0);
  const marks = await page.locator('[data-drink]').count();
  expect(marks).toBeGreaterThan(2);
  expect(marks).toBeLessThanOrEqual(10);

  // Leaving the comparison brings them back.
  await page.getByTestId('companion-chip-surf.test').click();
  await expect(drawn('Mojito')).toHaveCount(1);
});

test('Overlays: Uncharted lens and Wine type filter compose cleanly', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);

  await page.getByTestId('overlay-explore-btn').click();
  await expect(page).toHaveURL(/lens=explore/);
  await expect(page.getByTestId('overlay-explore-lists')).toBeVisible();

  await page.getByTestId('overlay-type-wine').click();
  await expect(page).toHaveURL(/type=wine/);
  await expect(page.getByTestId('overlay-explore-lists')).toBeVisible();
});

test('Overlays: Opening a bar menu shows its region footprint summary', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto('/?menu=1');

  const input = page.getByLabel('A drink on their menu');
  await input.fill('Negroni');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await input.fill('Daiquiri');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByTestId('bar-footprint')).toBeVisible();
  await expect(page.getByTestId('bar-footprint')).toContainText('The Deep');
  await expect(page.getByTestId('bar-footprint')).toContainText('The Surf');
});

test('Overlays: Where and With chips cross on an open bar, and rated drinks show in Again and in the bar menu', async ({ page }) => {
  const pour = {
    $type: 'app.cotidal.pour',
    drink: { name: 'Manhattan', slug: 'manhattan' },
    venue: { entity: { name: 'Attaboy' } },
    rating: { hedonic: 9 },
    isHomePour: false,
    createdAt: new Date().toISOString(),
  };
  await page.addInitScript(
    ({ p, pours }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('user_profile', JSON.stringify(p));
        localStorage.setItem('guest_pours', JSON.stringify(pours));
        sessionStorage.setItem('seeded', '1');
      }
    },
    { p: profile, pours: [pour] }
  );
  await page.goto(appPath);

  // Again and New lanes split the home list, and Manhattan shows its rating ("Manhattan · 9").
  await expect(page.getByRole('heading', { name: 'Again', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Manhattan · 9/ }).first()).toBeVisible();

  // Open Attaboy from the Where chip picker (Your bars first).
  await page.getByTestId('overlay-where-btn').click();
  await page.getByTestId('where-picker').getByRole('button', { name: /Attaboy/ }).click();
  await expect(page.getByTestId('where-chip-active')).toContainText('Attaboy');

  // Add drinks to Attaboy's menu; rated Manhattan shows "Manhattan · 9".
  const input = page.getByLabel('A drink on their menu');
  await input.fill('Manhattan');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await input.fill('Daiquiri');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: /Manhattan · 9/ }).first()).toBeVisible();

  // Add a companion in the same chip row: chips cross and rank Attaboy's menu for both.
  await page.getByTestId('overlay-with-btn').click();
  await page.getByRole('button', { name: copy.sampleSurf }).click();
  await expect(page.getByTestId('where-chip-active')).toContainText('Attaboy');
  await expect(page.getByTestId('companion-chip-surf.test')).toBeVisible();
  await expect(page.getByText(copy.groupMenuNote(2))).toBeVisible();
});
