import { test, expect } from 'vitest';
import { cleanDraft, draftPath, parseDraft, parseRateRequest, withoutRateRequest } from '../../src/lib/pours/pour-draft';
import { draftPour, type ToolContext } from '../../src/lib/mcp/tools';

/**
 * A pour drafted in a chat (`draft_pour` on /mcp) and confirmed in the form at
 * /. The draft is a link and nothing else: these tests hold what it may
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
  expect(parseDraft(paramsOf('/?draft=1'))).toBeNull();
  expect(parseDraft(paramsOf('/?drink=Negroni'))).toBeNull();
});

test('Draft: a rating in the link is ignored, because a draft has none', () => {
  const draft = parseDraft(paramsOf('/?draft=1&drink=Negroni&hedonic=9&rating=10'));
  expect(draft).toEqual({ drink: 'Negroni' });
});

test('Rate request: ?rate= names a drink, empty means the nearest, a draft carries its fields', () => {
  expect(parseRateRequest(paramsOf('/compass?rate=Negroni'))).toEqual({ drink: 'Negroni' });
  expect(parseRateRequest(paramsOf('/?rate='))).toEqual({});
  expect(parseRateRequest(paramsOf('/?rate=%20%20'))).toEqual({});
  const draft = parseRateRequest(paramsOf(draftPath({ drink: 'Negroni', bar: 'Dante' })));
  expect(draft).toEqual({ drink: 'Negroni', draft: { drink: 'Negroni', bar: 'Dante' } });
  // Nothing asked for, nothing opened; and a bare drink= is not a request.
  expect(parseRateRequest(paramsOf('/'))).toBeNull();
  expect(parseRateRequest(paramsOf('/?drink=Negroni'))).toBeNull();
  expect(parseRateRequest(paramsOf('/?draft=1'))).toBeNull();
});

test('Draft: taking it out of the URL leaves everything else', () => {
  const url = new URL(`https://x${draftPath({ drink: 'Negroni', bar: 'Dante' })}&utm=chat`);
  expect(withoutRateRequest(url).search).toBe('?utm=chat');
  expect(withoutRateRequest(new URL('https://x/compass?rate=Negroni&menu=1#top')).href).toBe('https://x/compass?menu=1#top');
});

test('draft_pour: names a drink on the map by its map name, and keeps anything else as said', () => {
  const onMap = draftPour({ drink: 'daiquiri', bar: 'Attaboy' }, ctx);
  expect(onMap.ok && onMap.data.draft.drink).toBe('Daiquiri (Classic)');
  expect(onMap.ok && onMap.data.onMap).toBe(true);
  expect(onMap.ok && onMap.data.url.startsWith('https://cotidal.example/?draft=1&')).toBe(true);

  const off = draftPour({ drink: 'Grandma’s Punch', atHome: true }, ctx);
  expect(off.ok && off.data.draft).toEqual({ drink: 'Grandma’s Punch', atHome: true });
  expect(off.ok && off.data.onMap).toBe(false);
  expect(off.ok && off.data.message).toContain('Nothing is logged yet');
});

