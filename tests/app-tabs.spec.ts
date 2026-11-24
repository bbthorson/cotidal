import { test, expect } from '@playwright/test';
import { appBar, coldState, compass, logPage, menu, moved, pour, ratePage } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('App bar: Compass · Log, and picking a drink is a button, not a tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/compass');
  const bar = page.getByRole('navigation', { name: appBar.label });
  await expect(bar.getByRole('link')).toHaveText([appBar.compass, appBar.log]);
  await expect(bar.getByRole('link', { name: appBar.compass })).toHaveAttribute('aria-current', 'page');
  // Compass has its own entry to a menu, so the floating button is not drawn there.
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveCount(0);

  // The app bar is a phone's navigation here: no Menu repeating it in the header.
  await expect(page.locator('header summary')).toBeHidden();

  // On Log it opens Compass on a menu.
  await page.goto('/log');
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveAttribute('href', '/compass?menu=1');
});

test('Log: a guest’s pour is kept on the device', async ({ page }) => {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);

  // Log shows the log, not a form: rating is a sheet it opens.
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: logPage.heading, level: 1 })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  await page.getByRole('button', { name: logPage.rateDrink }).click();
  await expect(sheet.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  // Escape closes it, and focus returns to what opened it.
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: logPage.rateDrink })).toBeFocused();

  // A drink handed over in the address opens the form on it; the address is cleaned on close.
  await page.goto('/log?rate=Negroni');
  await expect(sheet.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await expect(sheet.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await sheet.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await page.getByRole('button', { name: moved.back }).click();

  // Rated: back on the ledger, which already shows it, and the pour survives a reload.
  await expect(page).toHaveURL(/\/log$/);
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');
  await page.reload();
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');

});

test('Log: your track, and what each pour did to it', async ({ page }) => {
  await page.goto('/log');
  await page.getByRole('button', { name: coldState.guestCta }).click();

  // Two pours as a guest, from the centre: one liked, which moves you, and one in the middle, which holds you.
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  for (const [drink, score] of [['Negroni', 9], ['Margarita', 5]] as const) {
    if (!(await sheet.isVisible())) await page.getByRole('button', { name: logPage.rateDrink }).click();
    await sheet.getByLabel(pour.drinkLabel).fill(drink);
    await sheet.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
    await sheet.getByRole('radio', { name: new RegExp(`^${score}:`) }).click();
    await sheet.getByRole('button', { name: pour.submit }).click();
    // The screen after says how far, or that a rating in the middle held you.
    await expect(sheet.getByRole('heading', { level: 1 })).toHaveText(score === 5 ? moved.heldTitle : /^Moved \d/);
    await sheet.getByRole('button', { name: moved.back }).click();
    await expect(sheet).toHaveCount(0);
  }

  await expect(page.getByText(menu.youAreIn)).toBeVisible();
  await expect(page.getByRole('figure', { name: logPage.trackLabel(2) })).toBeVisible();
  const log = page.locator('ol').filter({ hasText: logPage.startedCentre });
  await expect(log.getByRole('listitem').first()).toContainText(logPage.held);
  await expect(log.getByRole('listitem').nth(1)).toContainText(/Moved \d/);
  await expect(log.getByRole('listitem').last()).toContainText(logPage.startedCentre);

  // On desktop, SiteFooter carries the reading pages so Log's mobile reading nav stays hidden.
  await expect(page.getByRole('navigation', { name: logPage.readingLabel })).toHaveCount(0);

  // On a phone there is no Menu or SiteFooter on app pages, so the reading pages sit at Log's foot.
  await page.setViewportSize({ width: 390, height: 844 });
  const reading = page.getByRole('navigation', { name: logPage.readingLabel });
  await expect(reading.getByRole('link', { name: 'Drinks' })).toHaveAttribute('href', '/drinks');
});

test('Pick a drink: from Log it opens Compass on a menu with no bar', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/log');
  await page.getByRole('link', { name: appBar.pick, exact: true }).click();
  await expect(page).toHaveURL(/\/compass\?menu=1/);
  await expect(page.getByLabel(compass.atMenu.addLabel)).toBeVisible();
  await expect(page.getByLabel(compass.atMenu.barLabel)).toBeVisible();
});

test('Log: where you are sits beside the log on a wide screen, above it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  const where = page.getByText(menu.youAreIn);
  const ledger = page.getByRole('heading', { name: logPage.ledgerTitle, exact: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/log');
  await expect(ledger).toBeVisible();
  const [w, l] = [(await where.boundingBox())!, (await ledger.boundingBox())!];
  expect(w.x + w.width).toBeLessThan(l.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const [w2, l2] = [(await where.boundingBox())!, (await ledger.boundingBox())!];
  expect(w2.y + w2.height).toBeLessThan(l2.y);
});
