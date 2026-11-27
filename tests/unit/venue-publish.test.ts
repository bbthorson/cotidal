import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { Lexicons } from '@atproto/lexicon';
import { buildMenuRecord, buildVenueRecord } from '@/lib/atproto/venue-publish';
import { VENUE_COLLECTION, VenueRecordSchema } from '@/lib/atproto/records';

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

  it('validates extended venue place fields (hours, reservationsUrl, menuStyle, externalIds) against the lexicon', () => {
    const ours = readdirSync('src/lib/atproto/lexicons').map((f) =>
      JSON.parse(readFileSync(`src/lib/atproto/lexicons/${f}`, 'utf8'))
    );
    const theirs = readdirSync('tests/fixtures/community-lexicon')
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(`tests/fixtures/community-lexicon/${f}`, 'utf8')));
    const reference = new Lexicons([...ours, ...theirs]);

    const record = VenueRecordSchema.parse({
      $type: VENUE_COLLECTION,
      name: 'Fresh Kills Bar',
      description: 'Bespoke cocktails in Williamsburg.',
      website: 'https://freshkillsbar.com',
      hours: 'Mo-Su 17:00-02:00',
      reservationsUrl: 'https://resy.com/cities/ny/fresh-kills',
      menuStyle: 'bespoke',
      externalIds: {
        osm: 'node/4123456789',
        fsq: '54321abcdef0987654321abc',
      },
      createdAt: new Date().toISOString(),
    });

    expect(() => reference.assertValidRecord(VENUE_COLLECTION, record)).not.toThrow();
  });
});
