import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { Lexicons } from '@atproto/lexicon';
import {
  fetchOsmBar,
  formatDistance,
  osmPlaceHref,
  overpassElementQuery,
  overpassFailure,
  overpassQuery,
  parseOsmParams,
  parseOverpass,
  parseOverpassElement,
  roundPoint,
} from '../../src/lib/drinks/osm';
import { GEO_TYPE, geoLocation, readGeo } from '../../src/lib/atproto/location';
import { draftPath, parseDraft } from '../../src/lib/pours/pour-draft';
import { buildPour } from '../../src/lib/pours/pours.server';
import { POUR_COLLECTION } from '../../src/lib/atproto/records';

const here = { lat: 40.7223, lon: -73.9883 };

test('OSM: only named places to drink, with a point, nearest first', () => {
  const bars = parseOverpass(
    {
      elements: [
        { type: 'node', id: 2, lat: 40.7230, lon: -73.9880, tags: { amenity: 'pub', name: 'Far Pub' } },
        { type: 'node', id: 1, lat: 40.7224, lon: -73.9883, tags: { amenity: 'bar', name: ' Attaboy ' } },
        { type: 'way', id: 3, center: { lat: 40.7226, lon: -73.9886 }, tags: { amenity: 'biergarten', name: 'Garden' } },
        { type: 'node', id: 4, lat: 40.7224, lon: -73.9883, tags: { amenity: 'bar' } }, // no name
        { type: 'node', id: 5, lat: 40.7224, lon: -73.9883, tags: { amenity: 'cafe', name: 'Café' } }, // not a bar
        { type: 'node', id: 6, lat: 'x', lon: -73.9, tags: { amenity: 'bar', name: 'Bad point' } },
        { type: 'relation', id: 7, tags: { amenity: 'bar', name: 'Relation' } },
      ],
    },
    here
  );
  expect(bars.map((b) => b.name)).toEqual(['Attaboy', 'Garden', 'Far Pub']);
  expect(bars[0]).toMatchObject({ id: 'node/1', kind: 'bar' });
  expect(bars[1].id).toBe('way/3');
  expect(bars[0].distance).toBeLessThan(bars[2].distance);
  expect(parseOverpass('not json', here)).toEqual([]);
});

test('OSM: retains address, hours, website, menu, phone, outdoor seating, and fsq id while dropping unsafe URLs', () => {
  const bars = parseOverpass(
    {
      elements: [
        {
          type: 'node',
          id: 991,
          lat: 40.7245,
          lon: -73.9472,
          tags: {
            amenity: 'bar',
            name: 'Diamond Lil',
            'addr:housenumber': '179',
            'addr:street': 'Nassau Ave',
            'addr:city': 'Brooklyn',
            'addr:state': 'NY',
            'addr:postcode': '11222',
            opening_hours: 'Mo-Su 17:00-02:00',
            'contact:website': 'https://diamondlilbar.com',
            'website:menu': 'https://diamondlilbar.com/DiamondLil-Menu.pdf',
            'contact:phone': '+1 718-555-0199',
            outdoor_seating: 'patio',
            'ref:foursquare': '5a1b2c3d4e5f6a7b8c9d0e1f',
          },
        },
        {
          type: 'node',
          id: 992,
          lat: 40.7246,
          lon: -73.9473,
          tags: {
            amenity: 'bar',
            name: 'Unsafe Link Bar',
            website: 'javascript:alert(1)',
            outdoor_seating: 'no',
          },
        },
      ],
    },
    here
  );

  const diamondLil = bars.find((b) => b.id === 'node/991');
  const unsafe = bars.find((b) => b.id === 'node/992');

  expect(diamondLil).toMatchObject({
    id: 'node/991',
    name: 'Diamond Lil',
    address: {
      street: '179 Nassau Ave',
      city: 'Brooklyn',
      state: 'NY',
      postcode: '11222',
      formatted: '179 Nassau Ave, Brooklyn, NY 11222',
    },
    openingHours: 'Mo-Su 17:00-02:00',
    website: 'https://diamondlilbar.com/',
    menuUrl: 'https://diamondlilbar.com/DiamondLil-Menu.pdf',
    phone: '+1 718-555-0199',
    outdoorSeating: true,
    fsqId: '5a1b2c3d4e5f6a7b8c9d0e1f',
  });
  expect(unsafe?.website).toBeUndefined();
  expect(unsafe?.outdoorSeating).toBe(false);
});

test('OSM: validates route params, builds element queries, and parses single-place responses', async () => {
  expect(parseOsmParams('node', '12345')).toEqual({ type: 'node', id: 12345 });
  expect(parseOsmParams('way', '98765')).toEqual({ type: 'way', id: 98765 });
  expect(parseOsmParams('relation', '123')).toBeNull();
  expect(parseOsmParams('node', 'abc')).toBeNull();
  expect(osmPlaceHref('node/12345')).toBe('/v/osm/node/12345');
  expect(osmPlaceHref('relation/123')).toBeNull();
  expect(overpassElementQuery('node', 12345)).toContain('node(12345)');

  const single = parseOverpassElement({
    elements: [
      {
        type: 'way',
        id: 555,
        center: { lat: 40.721, lon: -73.957 },
        tags: { amenity: 'bar', name: 'Bar Blondeau', 'addr:full': '80 Wythe Ave 6th Fl, Brooklyn, NY' },
      },
    ],
  });
  expect(single).toMatchObject({
    id: 'way/555',
    name: 'Bar Blondeau',
    distance: 0,
    address: { formatted: '80 Wythe Ave 6th Fl, Brooklyn, NY' },
  });

  const okRes = await fetchOsmBar('way', 555, {
    fetch: async () =>
      new Response(
        JSON.stringify({
          elements: [
            { type: 'way', id: 555, center: { lat: 40.721, lon: -73.957 }, tags: { amenity: 'bar', name: 'Bar Blondeau' } },
          ],
        }),
        { status: 200 }
      ),
  });
  expect(okRes.status).toBe('ok');
  if (okRes.status === 'ok') expect(okRes.bar.name).toBe('Bar Blondeau');

  const missing = await fetchOsmBar('node', 1, {
    fetch: async () => new Response(JSON.stringify({ elements: [] }), { status: 200 }),
  });
  expect(missing.status).toBe('not-found');
});

test('OSM: a query Overpass gave up on is a failure, not an empty street', () => {
  const gaveUp = { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' };
  expect(overpassFailure(gaveUp)).toMatch(/timed out/);
  expect(overpassFailure({ elements: [] })).toBeNull();
  expect(overpassFailure({ elements: [], remark: 'nothing to see' })).toBeNull();
  expect(overpassFailure('not json')).toBeNull();
});

test('OSM: the point is rounded to about 100 m before it leaves the device', () => {
  expect(roundPoint({ lat: 40.722349, lon: -73.988312 })).toEqual({ lat: 40.722, lon: -73.988 });
  const q = overpassQuery(roundPoint({ lat: 40.722349, lon: -73.988312 }), 1200);
  expect(q).toContain('around:1200,40.722,-73.988');
  expect(q).not.toContain('40.722349');
  expect(formatDistance(123)).toBe('120 m');
  expect(formatDistance(1430)).toBe('1.4 km');
});

test('Location: community.lexicon.location.geo, strings not floats, and only real points', () => {
  expect(geoLocation(40.7223, -73.9883, 'Attaboy')).toEqual({
    $type: GEO_TYPE,
    latitude: '40.722300',
    longitude: '-73.988300',
    name: 'Attaboy',
  });
  for (const [lat, lon] of [[91, 0], [0, 181], [NaN, 0], ['40', '-73'], [undefined, 1]]) {
    expect(geoLocation(lat, lon)).toBeNull();
  }
  expect(readGeo(geoLocation(40.7223, -73.9883))).toEqual({ lat: 40.7223, lon: -73.9883 });
  expect(readGeo({ $type: 'community.lexicon.location.address', country: 'US' })).toBeNull();
});

test('Draft: a bar’s point travels in the link, and only with a bar', () => {
  const path = draftPath({ drink: 'Negroni', bar: 'Attaboy', at: { lat: 40.7223, lon: -73.9883 } });
  const back = parseDraft(new URL(path, 'http://x').searchParams);
  expect(back).toMatchObject({ drink: 'Negroni', bar: 'Attaboy', at: { lat: 40.7223, lon: -73.9883 } });

  const home = parseDraft(new URLSearchParams('draft=1&drink=Negroni&at=home&lat=40.7&lon=-73.9'));
  expect(home?.at).toBeUndefined();
  const bad = parseDraft(new URLSearchParams('draft=1&drink=Negroni&bar=X&lat=400&lon=-73.9'));
  expect(bad).toMatchObject({ bar: 'X' });
  expect(bad?.at).toBeUndefined();
});

test('Pour: a bar from the map is written with where it is; a point that does not parse is left out', () => {
  const written = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 40.7223, lng: -73.9883 } });
  expect(written.ok).toBe(true);
  if (!written.ok) return;
  expect(written.pour.record.venue).toEqual({
    entity: { name: 'Attaboy' },
    address: { $type: GEO_TYPE, latitude: '40.722300', longitude: '-73.988300', name: 'Attaboy' },
  });

  const unplaced = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 400, lng: 0 } });
  expect(unplaced.ok && unplaced.pour.record.venue).toEqual({ entity: { name: 'Attaboy' } });
});

test('Pour: the reference validator accepts the location against the community’s own lexicon', () => {
  const ours = readdirSync('src/lib/atproto/lexicons').map((f) => JSON.parse(readFileSync(`src/lib/atproto/lexicons/${f}`, 'utf8')));
  const theirs = readdirSync('tests/fixtures/community-lexicon')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`tests/fixtures/community-lexicon/${f}`, 'utf8')));
  const reference = new Lexicons([...ours, ...theirs]);

  const written = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 40.7223, lng: -73.9883 } });
  expect(written.ok).toBe(true);
  if (!written.ok) return;
  expect(() => reference.assertValidRecord(POUR_COLLECTION, written.pour.record)).not.toThrow();

  // A float where the community lexicon says string is refused.
  const float = { ...written.pour.record, venue: { entity: { name: 'Attaboy' }, address: { $type: GEO_TYPE, latitude: 40.7, longitude: -73.9 } } };
  expect(() => reference.assertValidRecord(POUR_COLLECTION, float)).toThrow();
});
