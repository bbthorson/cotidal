import { test, expect } from '@playwright/test';

const GUEST_PALATE = {
  x: 4,
  y: 4,
  dislikesSmoke: true,
  dislikesBitter: false,
  dislikesAnise: false,
  vibeTags: {},
};

test.describe('Menu capture & MCP handoff', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((p) => {
      localStorage.setItem('user_profile', JSON.stringify(p));
    }, GUEST_PALATE);
  });

  test('MCP menu handoff URL opens MenuView with bar, verified pins, and directional house cocktails', async ({
    page,
  }) => {
    const url =
      '/?menu=1&bar=Attaboy&item=Negroni&item=' +
      encodeURIComponent('Paper Tiger — mezcal, aperol, lime, agave');
    await page.goto(url);

    await expect(page.getByRole('heading', { name: 'Attaboy', exact: true })).toBeVisible();
    await expect(page.getByText('Negroni').first()).toBeVisible();
    await expect(page.getByText('Paper Tiger')).toBeVisible();
    await expect(page.getByText(/Directional ·/)).toBeVisible();
    await expect(page.getByText(/Near Naked & Famous/)).toBeVisible();
    await expect(page.getByText(/Has smoke/)).toBeVisible();
  });

  test('Scan a menu photo shows a light sign-in nudge for guests without blocking paste', async ({
    page,
  }) => {
    await page.goto('/?menu=1');
    await page.getByTestId('menu-scan-photo').click();
    await expect(page.getByTestId('photo-signin-nudge')).toBeVisible();
  });
});
