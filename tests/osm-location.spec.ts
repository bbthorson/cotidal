import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { Lexicons } from '@atproto/lexicon';
import { formatDistance, overpassQuery, parseOverpass, roundPoint } from '../src/lib/osm';
import { GEO_TYPE, geoLocation, readGeo } from '../src/lib/atproto/location';
import { draftPath, parseDraft } from '../src/lib/pour-draft';
import { buildPour } from '../src/lib/pours.server';
import { POUR_COLLECTION } from '../src/lib/atproto/records';

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
  const written = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 40.7223, lng: -73.9883 } }, {});
  expect(written.ok).toBe(true);
  if (!written.ok) return;
  expect(written.pour.record.venue).toEqual({
    entity: { name: 'Attaboy' },
    address: { $type: GEO_TYPE, latitude: '40.722300', longitude: '-73.988300', name: 'Attaboy' },
  });

  const unplaced = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 400, lng: 0 } }, {});
  expect(unplaced.ok && unplaced.pour.record.venue).toEqual({ entity: { name: 'Attaboy' } });
});

test('Pour: the reference validator accepts the location against the community’s own lexicon', () => {
  const ours = readdirSync('src/lib/atproto/lexicons').map((f) => JSON.parse(readFileSync(`src/lib/atproto/lexicons/${f}`, 'utf8')));
  const theirs = readdirSync('tests/fixtures/community-lexicon')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`tests/fixtures/community-lexicon/${f}`, 'utf8')));
  const reference = new Lexicons([...ours, ...theirs]);

  const written = buildPour({ drinkName: 'Negroni', rating: 8, venue: { name: 'Attaboy', lat: 40.7223, lng: -73.9883 } }, {});
  expect(written.ok).toBe(true);
  if (!written.ok) return;
  expect(() => reference.assertValidRecord(POUR_COLLECTION, written.pour.record)).not.toThrow();

  // A float where the community lexicon says string is refused.
  const float = { ...written.pour.record, venue: { entity: { name: 'Attaboy' }, address: { $type: GEO_TYPE, latitude: 40.7, longitude: -73.9 } } };
  expect(() => reference.assertValidRecord(POUR_COLLECTION, float)).toThrow();
});
