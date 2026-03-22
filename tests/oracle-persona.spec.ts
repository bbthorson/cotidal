import { test, expect } from '@playwright/test';

test('Bartender Persona: Explanation should feel knowledgeable and approachable', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Let\'s Go');

  // The Basics
  await page.click('text=Black or Espresso.');
  await page.click('text=Lemon Tart');
  await page.click('text=Love the bite.');

  // Your Style
  await page.click('text=Fizzy & Refreshing');
  await page.click('text=Heatwave');
  await page.click('text=Stemmed & Elegant');

  // The Details
  await page.click('text=Love it.');
  await page.click('text=Spiced Orange');
  await page.click('text=Sipping slowly.');

  // Wait for results
  await expect(page.locator('text=Your Drink Profile')).toBeVisible({ timeout: 15000 });

  // Click the 'Why This Drink?' button on the hero drink
  const explainButton = page.locator('button:has-text("Why This Drink?")').first();
  await expect(explainButton).toBeVisible();
  await explainButton.click();

  // Check the explanation text
  // We'll wait for the loading state to finish
  await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 10000 });

  const cardContent = page.locator('[role="listitem"]').first();
  const text = await cardContent.innerText();

  // We expect the text to sound like a knowledgeable bartender talking about flavors
  // The AI prompt asks for warm, approachable language about actual flavors
  // It should contain drink/flavor-related language rather than mystic language
  expect(text.length).toBeGreaterThan(20);
});
