import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:9002' });

test('Results Screen Keyboard Navigation', async ({ page }) => {
  // 1. Inject User Profile to bypass quiz
  const userProfile = {
    x: 0,
    y: 0,
    dislikesSmoke: false,
    dislikesBitter: false,
    dislikesAnise: false,
    vibeTags: {}
  };

  await page.addInitScript((profile) => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, userProfile);

  // 2. Load page
  await page.goto('/');

  // 3. Verify we are on Results Screen
  await expect(page.getByText('The Palate Map')).toBeVisible();

  // 4. Locate the second card (index 1) in the results grid
  // We use the grid class to find the container, then get the second div (card)
  const resultsGrid = page.locator('.grid.gap-4');
  // Need to be careful about selectors. The grid has direct children which are the cards.
  const secondCard = resultsGrid.locator('> div').nth(1);

  // Get the drink name to find the corresponding map pin
  // Support both old structure (CardTitle/div) and new structure (h3)
  const cardTitle = secondCard.locator('h3, .text-lg.font-bold').first();
  const drinkName = await cardTitle.innerText();
  console.log(`Testing navigation for drink: ${drinkName}`);

  // 5. Verify Accessibility Attributes
  // This expects the FIX to be in place.
  await expect(secondCard).toHaveAttribute('tabindex', '0');
  await expect(secondCard).toHaveAttribute('role', 'listitem');

  // 6. Focus the card
  await secondCard.focus();
  await expect(secondCard).toBeFocused();

  // 7. Check visual feedback on the card (ring-primary)
  // The class `ring-primary` is applied conditionally
  await expect(secondCard).toHaveClass(/ring-primary/);

  // 8. Check visual feedback on the map pin
  // MapPin aria-label is `Select ${drink.name}, ${drink.type}`
  // We use a regex to match the start of the label
  const pin = page.getByLabel(new RegExp(`Select ${drinkName}`, 'i'));
  await expect(pin).toHaveClass(/scale-150/);

  // 9. Verify blurring removes highlight
  await secondCard.blur();
  await expect(secondCard).not.toHaveClass(/ring-primary/);
  await expect(pin).not.toHaveClass(/scale-150/);
});
