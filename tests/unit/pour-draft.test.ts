import { test, expect } from 'vitest';
import { cleanDraft, draftPath, parseDraft, withoutDraft } from '../../src/lib/pour-draft';
import { draftPour, type ToolContext } from '../../src/lib/mcp/tools';

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

