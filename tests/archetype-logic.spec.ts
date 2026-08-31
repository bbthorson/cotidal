import { test, expect } from '@playwright/test';

/**
 * `archetypeDrink` calls /api/archetype-drink, which needs a model key. The
 * old test asserted on live model output and so failed wherever no key was
 * configured. Both branches of the contract are exercised here instead.
 */

test('Archetype: passes model output through', async ({ page }) => {
  await page.goto('/taste');
  await page.route('**/api/archetype-drink', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        x: -6,
        y: -8,
        hasSmoke: false,
        hasAnise: false,
        isBitter: true,
        tags: ['bold', 'classic'],
        oracleReasoning: 'Bitter, spirit-forward, and unmistakably Italian.',
      }),
    })
  );

  const result = await page.evaluate(async () => {
    const { archetypeDrink } = await import('/src/lib/api-client.ts');
    return archetypeDrink('Negroni');
  });

  expect(result.isBitter).toBe(true);
  expect(result.y).toBeLessThan(0);
  expect(result.tags).toContain('bold');
});

test('Archetype: falls back safely when the endpoint fails', async ({ page }) => {
  await page.goto('/taste');
  await page.route('**/api/archetype-drink', (route) => route.abort());

  const result = await page.evaluate(async () => {
    const { archetypeDrink } = await import('/src/lib/api-client.ts');
    return archetypeDrink('Negroni');
  });

  // A failed call must still yield a usable, neutral drink shape.
  expect(result.tags).toContain('classic');
  expect(result.x).toBe(0);
  expect(result.y).toBe(0);
});
