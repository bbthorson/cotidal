import { describe, expect, test } from 'vitest';
import { captureMenuLines, enrichWithClef } from '../../src/lib/drinks/menu-capture';
import { menuHandoffHref, readMenuHandoff } from '../../src/lib/map/map-url';
import { rankMenu } from '../../src/lib/mcp/venue-tools';
import type { ToolContext } from '../../src/lib/mcp/tool-helpers';

describe('Menu capture & Clef enrichment', () => {
  test('enrichWithClef classifies low-signal house cocktails with bounded Clef answers', async () => {
    const items = captureMenuLines(
      [
        'Negroni',
        'Velvet Fog — house-made roasted pine cordial, botanical spirit',
      ],
      {}
    );
    expect(items[0].drink?.name).toBe('Negroni');
    expect(items[1].drink).toBeNull();
    expect(items[1].directional).toBeUndefined();

    const { items: enriched, enriched: count } = await enrichWithClef(items, async (req) => {
      // Only item index 1 should be sent to Clef
      expect(Object.keys(req.questions)).toContain('i1_smoke');
      expect(Object.keys(req.questions)).not.toContain('i0_smoke');
      return {
        answers: {
          i1_smoke: { probability: 0.82 },
          i1_bitter: { probability: 0.71 },
          i1_anise: { probability: 0.1 },
          i1_x: { score: 2.5 },
          i1_y: { score: 2.0 },
          i1_classic: { choice: 'oaxaca-old-fashioned', confidence: 0.78 },
        },
      };
    });

    expect(count).toBe(1);
    expect(enriched[1].directional).toBeDefined();
    expect(enriched[1].directional?.quadrant).toBe('deep');
    expect(enriched[1].directional?.aversions).toEqual({ smoke: true, bitter: true, anise: false });
    expect(enriched[1].directional?.closestClassic?.slug).toBe('oaxaca-old-fashioned');
    expect(enriched[1].relative?.slug).toBe('oaxaca-old-fashioned');
  });

  test('enrichWithClef falls back cleanly when Clef is unavailable or throws', async () => {
    const items = captureMenuLines(['Mystery Pour — secret house cordial'], {});
    const resNull = await enrichWithClef(items, async () => null);
    expect(resNull.enriched).toBe(0);
    expect(resNull.items).toEqual(items);

    const resErr = await enrichWithClef(items, async () => {
      throw new Error('network error');
    });
    expect(resErr.enriched).toBe(0);
    expect(resErr.items).toEqual(items);
  });

  test('captureMenuLines preserves section headers and prices and suppresses alcoholic classics on N/A drinks', async () => {
    const items = captureMenuLines(
      [
        '## Non-Alcoholic',
        'Zero Mystery — house-made verjus cordial · $13',
        'My Fair Lady — Everleaf, grapefruit, lime, soda · $13',
      ],
      {}
    );

    expect(items).toHaveLength(2);
    expect(items[0].section).toBe('Non-Alcoholic');
    expect(items[0].price).toBe('$13');
    expect(items[0].nonAlcoholic).toBe(true);
    expect(items[1].directional?.closestClassic).toBeNull();
    expect(items[1].relative).toBeUndefined();

    const { items: enriched, enriched: count } = await enrichWithClef(items, async (req) => {
      expect(Object.keys(req.questions)).toContain('i0_x');
      expect(Object.keys(req.questions)).not.toContain('i0_classic');
      return {
        answers: {
          i0_smoke: { probability: 0.05 },
          i0_bitter: { probability: 0.2 },
          i0_anise: { probability: 0.05 },
          i0_x: { score: 7.5 },
          i0_y: { score: 6.0 },
        },
      };
    });

    expect(count).toBe(1);
    expect(enriched[0].directional?.nonAlcoholic).toBe(true);
    expect(enriched[0].directional?.closestClassic).toBeNull();
    expect(enriched[0].relative).toBeUndefined();
  });
});

describe('Menu handoff URLs & MCP rankMenu synergy', () => {
  test('menuHandoffHref and readMenuHandoff round-trip bar name and menu lines', () => {
    const href = menuHandoffHref(
      'https://cotidal.app',
      ['Negroni', 'Paper Tiger — mezcal, aperol, lime, agave'],
      'Attaboy'
    );
    const url = new URL(href);
    expect(url.pathname).toBe('/map');
    const parsed = readMenuHandoff(url.searchParams);
    expect(parsed).toEqual({
      bar: 'Attaboy',
      items: ['Negroni', 'Paper Tiger — mezcal, aperol, lime, agave'],
    });
  });

  test('rankMenu attaches directional placement and returns a /map handoff URL', async () => {
    const ctx: ToolContext = {
      origin: 'https://cotidal.app',
      register: {},
      readPalate: async () => ({
        status: 'ok',
        actor: { did: 'did:plc:alice', handle: 'alice.bsky.social' },
        palate: {
          x: 4,
          y: 4,
          aversions: { smoke: true, bitter: false, anise: false },
          pours: 0,
        },
        taste: {
          start: { x: 4, y: 4 },
          pours: [],
        },
      }),
    };

    const res = await rankMenu(
      'alice.bsky.social',
      ['Daiquiri (Classic)', { name: 'Paper Tiger', description: 'mezcal, aperol, lime, agave' }],
      ctx,
      'Attaboy'
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.ranked[0].name).toBe('Daiquiri (Classic)');
    expect(res.data.unplaced[0].directional).toBeDefined();
    expect(res.data.unplaced[0].directional?.matchedIngredients.length).toBeGreaterThanOrEqual(3);
    expect(res.data.unplaced[0].caution).toContain('smoke');
    expect(res.data.mapUrl).toContain('/map?menu=1&bar=Attaboy');
    expect(res.data.mapUrl).toContain('Paper+Tiger');
  });
});
