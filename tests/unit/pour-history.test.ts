import { expect, test } from 'vitest';
import type { PourRecord } from '@/lib/atproto/records';
import { geoLocation } from '@/lib/atproto/location';
import { lastPourByDrink, logTotals, poursAtBars } from '@/lib/pours/pour-history';

/** What Compass and Log read off your pours. */

const at = (
  drink: string,
  createdAt: string,
  hedonic: number,
  venue?: { name: string; lat?: number; lon?: number }
): PourRecord => ({
  $type: 'app.cotidal.pour',
  drink: { name: drink },
  rating: { hedonic },
  isHomePour: !venue,
  venue: venue
    ? {
        entity: { name: venue.name },
        ...(venue.lat !== undefined ? { address: geoLocation(venue.lat, venue.lon, venue.name) ?? undefined } : {}),
      }
    : undefined,
  createdAt,
});

// Newest first, as the log holds them.
const pours = [
  at('margarita', '2026-11-03T21:00:00.000Z', 6, { name: 'attaboy ' }),
  at('Negroni', '2026-11-02T21:00:00.000Z', 8, { name: 'Somewhere', lat: 40.71901, lon: -73.99101 }),
  at('Negroni', '2026-10-01T21:00:00.000Z', 5, { name: 'Attaboy' }),
  at('House Sour', '2026-09-01T21:00:00.000Z', 8),
];

test('Last pour of each drink: the latest, by its name on the map', () => {
  const last = lastPourByDrink(pours);
  expect(last.get('Negroni')?.createdAt).toBe('2026-11-02T21:00:00.000Z');
  // "margarita" is the map's Tommy's.
  expect(last.get("Margarita (Tommy's Style)")?.drink.name).toBe('margarita');
  // A drink the map has no point for is left out.
  expect(last.has('House Sour')).toBe(false);
});

test('Poured at a bar on the street map: by name, or by the point a pour recorded', () => {
  const bars = [
    { id: 'a', name: 'Attaboy', lat: 40.7, lon: -74 },
    { id: 'b', name: 'Next door', lat: 40.719, lon: -73.991 },
    { id: 'c', name: 'Never', lat: 41, lon: -75 },
  ];
  const counts = poursAtBars(bars, pours);
  expect(counts.get('a')).toBe(2);
  expect(counts.get('b')).toBe(1);
  expect(counts.has('c')).toBe(false);
});

test('Log totals: pours, bars, the first, and the best', () => {
  const totals = logTotals(pours);
  expect(totals.pours).toBe(4);
  // "attaboy " and "Attaboy" are one bar; a pour at home is at none.
  expect(totals.bars).toBe(2);
  expect(totals.first?.drink.name).toBe('House Sour');
  // A tie keeps the newer.
  expect(totals.best?.createdAt).toBe('2026-11-02T21:00:00.000Z');
  expect(logTotals([])).toEqual({ pours: 0, bars: 0, first: null, best: null });
});
