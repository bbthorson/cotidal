import { test, expect } from '@playwright/test';

/**
 * The original test asserted on live model output and failed wherever no
 * GOOGLE_GENERATIVE_AI_API_KEY was configured. The replacement asserts the
 * endpoint's contract instead, which is the part the app depends on: it must
 * always answer with a usable drink shape and never fail the caller.
 *
 * Tested over HTTP rather than by importing `archetypeDrink`, so it runs
 * against `astro preview` as well as `astro dev` — the previous version
 * imported app source through Vite's dev-only `/src/` path.
 *
 * Note: nothing in the UI currently calls `archetypeDrink`; the client
 * wrapper in api-client.ts is reached only from tests.
 */

const drinkShape = (body: unknown) => {
  const b = body as Record<string, unknown>;
  expect(typeof b.x).toBe('number');
  expect(typeof b.y).toBe('number');
  expect(typeof b.hasSmoke).toBe('boolean');
  expect(typeof b.hasAnise).toBe('boolean');
  expect(typeof b.isBitter).toBe('boolean');
  expect(Array.isArray(b.tags)).toBe(true);
  expect(typeof b.oracleReasoning).toBe('string');
};

test('Archetype: returns a usable shape, with or without a model key', async ({ request }) => {
  const res = await request.post('/api/archetype-drink', {
    data: { drinkName: 'Negroni' },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  drinkShape(body);

  // Coordinates must stay inside the palate map whichever path produced them.
  expect(body.x).toBeGreaterThanOrEqual(-10);
  expect(body.x).toBeLessThanOrEqual(10);
  expect(body.y).toBeGreaterThanOrEqual(-10);
  expect(body.y).toBeLessThanOrEqual(10);
});

test('Archetype: a nonsense drink still yields a shape rather than an error', async ({ request }) => {
  const res = await request.post('/api/archetype-drink', {
    data: { drinkName: 'asdfghjkl' },
  });

  expect(res.status()).toBe(200);
  drinkShape(await res.json());
});
