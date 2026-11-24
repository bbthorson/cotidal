import { describe, expect, it } from 'vitest';
import { buildMenuRecord, buildVenueRecord } from '@/lib/atproto/venue-publish';

const DID = 'did:plc:bar111111111111111111111';

describe('venue-publish', () => {
  it('builds a lexicon-valid app.cotidal.menu record from pasted lines', () => {
    const menu = buildMenuRecord(DID, {
      venueName: 'Attaboy',
      title: 'House Classics',
      lines: '• Paper Plane — bourbon, Aperol, Amaro Nonino, lemon $18\nNegroni\n',
    });

    expect(menu).not.toBeNull();
    expect(menu?.$type).toBe('app.cotidal.menu');
    expect(menu?.venue.entity).toEqual({ name: 'Attaboy', did: DID });
    expect(menu?.sections?.[0].items).toEqual([
      { drink: { name: 'Paper Plane' }, description: 'bourbon, Aperol, Amaro Nonino, lemon' },
      { drink: { name: 'Negroni' } },
    ]);
  });

  it('returns null when no menu lines are provided', () => {
    expect(buildMenuRecord(DID, { venueName: 'Attaboy', lines: '   \n  ' })).toBeNull();
  });

  it('builds a lexicon-valid app.cotidal.venue record pointing at currentMenu', () => {
    const venue = buildVenueRecord(
      { name: 'Attaboy', description: 'No menu.', website: 'https://attaboy.nyc' },
      { name: 'House Classics', uri: `at://${DID}/app.cotidal.menu/3k2a` }
    );
    expect(venue.$type).toBe('app.cotidal.venue');
    expect(venue.name).toBe('Attaboy');
    expect(venue.currentMenu?.uri).toBe(`at://${DID}/app.cotidal.menu/3k2a`);
  });
});
