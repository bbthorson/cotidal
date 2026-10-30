import { test, expect } from '@playwright/test';
import { cleanDraft, draftPath, parseDraft, withoutDraft } from '../src/lib/pour-draft';
import { draftPour, type ToolContext } from '../src/lib/mcp/tools';
import { coldState, moved, pour } from '../src/lib/copy';

/**
 * A pour drafted in a chat (`draft_pour` on /mcp) and confirmed in the form at
 * /log. The draft is a link and nothing else: these tests hold what it may
 * carry, and that the form will not log it until the rating is tapped.
 */

const ctx: ToolContext = {
  readPalate: async () => ({ status: 'invalid' }),
  register: {},
  origin: 'https://cotidal.example',
};

const paramsOf = (path: string) => new URL(path, 'https://x').searchParams;

test('Draft: what goes into the link comes back out', () => {
  const draft = cleanDraft({
    drink: 'Negroni',
    bar: 'Dante',
    deviations: ['too-bitter'],
    cata: ['bright-citrus', 'baking-spice'],
    note: 'Big orange peel, a bit warm & strong',
  });
  expect(draft).not.toBeNull();
  expect(parseDraft(paramsOf(draftPath(draft!)))).toEqual(draft);
});

test('Draft: only what the form can show, cut to what it accepts', () => {
  const draft = cleanDraft({
    drink: `  ${'N'.repeat(500)}  `,
    atHome: true,
    bar: 'ignored at home',
    deviations: ['too-sweet', 'too-sweet', 'made-up'],
    cata: ['campfire-smoke', '<script>'],
    note: 'x'.repeat(5000),
  });
  expect(draft?.drink).toHaveLength(200);
  expect(draft?.bar).toBeUndefined();
  expect(draft?.deviations).toEqual(['too-sweet']);
  expect(draft?.cata).toEqual(['campfire-smoke']);
  expect(draft?.note).toHaveLength(1000);
});

test('Draft: no drink, no draft; and a plain “Log this” link is not one', () => {
  expect(cleanDraft({ drink: '   ' })).toBeNull();
  expect(parseDraft(paramsOf('/rate?draft=1'))).toBeNull();
  expect(parseDraft(paramsOf('/rate?drink=Negroni'))).toBeNull();
});

test('Draft: a rating in the link is ignored, because a draft has none', () => {
  const draft = parseDraft(paramsOf('/rate?draft=1&drink=Negroni&hedonic=9&rating=10'));
  expect(draft).toEqual({ drink: 'Negroni' });
});

test('Draft: taking it out of the URL leaves everything else', () => {
  const url = new URL(`https://x${draftPath({ drink: 'Negroni', bar: 'Dante' })}&utm=chat`);
  expect(withoutDraft(url).search).toBe('?utm=chat');
});

test('draft_pour: names a drink on the map by its map name, and keeps anything else as said', () => {
  const onMap = draftPour({ drink: 'daiquiri', bar: 'Attaboy' }, ctx);
  expect(onMap.ok && onMap.data.draft.drink).toBe('Daiquiri (Classic)');
  expect(onMap.ok && onMap.data.onMap).toBe(true);
  expect(onMap.ok && onMap.data.url.startsWith('https://cotidal.example/rate?draft=1&')).toBe(true);

  const off = draftPour({ drink: 'Grandma’s Punch', atHome: true }, ctx);
  expect(off.ok && off.data.draft).toEqual({ drink: 'Grandma’s Punch', atHome: true });
  expect(off.ok && off.data.onMap).toBe(false);
  expect(off.ok && off.data.message).toContain('Nothing is logged yet');
});

test('Draft: a chat assistant\'s old /log link still arrives, query intact', async ({ request }) => {
  const res = await request.get('/log?draft=1&drink=Negroni&bar=Dante', { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  const to = new URL(res.headers()['location'], 'http://x');
  expect(to.pathname).toBe('/rate');
  expect(to.searchParams.get('draft')).toBe('1');
  expect(to.searchParams.get('bar')).toBe('Dante');

  const drink = await request.get('/log?drink=Negroni', { maxRedirects: 0 });
  expect(new URL(drink.headers()['location'], 'http://x').search).toBe('?drink=Negroni');
});

test('Draft on /rate: the form opens on it, will not log without a rating, and logs once', async ({ page }) => {
  const path = draftPath({ drink: 'Negroni', bar: 'Dante', deviations: ['too-bitter'], note: 'Big orange peel' });
  await page.goto(path);
  await page.getByRole('button', { name: coldState.guestCta }).click();

  await expect(page.getByTestId('pour-draft-note')).toHaveText(pour.draftNote);
  await expect(page.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await expect(page.getByLabel(pour.barLabel)).toHaveValue('Dante');
  await expect(page.getByRole('button', { name: pour.deviations['too-bitter'], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByLabel(pour.noteLabel)).toHaveValue('Big orange peel');

  // No rating chosen, and none can be logged without one.
  await expect(page.getByText(pour.tapRating, { exact: true })).toBeVisible();
  for (const radio of await page.getByRole('radio').all()) await expect(radio).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByText(pour.needRating)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toHaveCount(0);

  await page.getByRole('radio', { name: /^6:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toBeVisible();
  await expect(page.getByText(/6 of 9/)).toBeVisible();

  // Logged once: gone from the URL, and the form is not offered again.
  expect(new URL(page.url()).search).toBe('');
  await page.getByRole('button', { name: moved.back }).click();
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByTestId('pour-draft-note')).toHaveCount(0);
  await expect(page.getByLabel(pour.noteLabel)).toHaveCount(0);
  await expect(page.locator('ol').filter({ hasText: 'Dante' })).toHaveCount(1);
});
