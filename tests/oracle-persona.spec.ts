import { test, expect } from '@playwright/test';

test('The Oracle Persona: Explanation should feel mystic and sophisticated', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Begin the Reading');
  
  // Phase 1: Calibration
  await page.click('text=Black or Espresso.');
  await page.click('text=Lemon Tart');
  await page.click('text=Love the bite.');
  
  // Phase 2: Architecture
  await page.click('text=Fizzy & Refreshing');
  await page.click('text=Heatwave');
  await page.click('text=Stemmed & Elegant');
  
  // Phase 3: Context
  await page.click('text=Love it.');
  await page.click('text=Spiced Orange');
  await page.click('text=Sipping slowly.');
  
  // Wait for results
  await expect(page.locator('text=The Palate Revelation')).toBeVisible({ timeout: 15000 });
  
  // Click the 'Oracle\'s Vision' button on the hero drink
  const explainButton = page.locator('button:has-text("Oracle\'s Vision")').first();
  await expect(explainButton).toBeVisible();
  await explainButton.click();
  
  // Check the explanation text
  // The explanation replaces the default text in the paragraph
  // We'll wait for the loading state to finish
  await expect(page.locator('text=The Oracle is intuiting...')).not.toBeVisible({ timeout: 10000 });
  
  const cardContent = page.locator('[role="listitem"]').first();
  const text = await cardContent.innerText();
  
  // We expect the text to contain mystic flair
  const mysticKeywords = ['Oracle', 'Aura', 'Essence', 'Vibration', 'Seeker', 'Revelation'];
  const hasMysticFlair = mysticKeywords.some(word => text.includes(word));
  
  // If AI fails or returns generic, it might not have the flair, 
  // but our prompt specifically asks for it.
  // Note: Live AI might vary, but we've set the system prompt.
  expect(hasMysticFlair).toBe(true);
});