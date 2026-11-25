import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { actorParam, readMapView, viewHref } from '@/lib/map-url';

/**
 * The map's address (`map-url.ts`): one vocabulary, `drink=` and `palate=`,
 * read and written in one place, every value checked as the rest of the code
 * checks it.
 */
const read = (query: string) => readMapView(new URLSearchParams(query));
const negroni = drinkDatabase.find((d) => d.name === 'Negroni')!;

describe('reading an address', () => {
  test('a drink by its slug or its name, or nothing for a drink the map does not know', () => {
    expect(read('drink=negroni').drink?.name).toBe('Negroni');
    expect(read('drink=Negroni').drink?.name).toBe('Negroni');
    expect(read('drink=no-such-drink').drink).toBeNull();
    expect(read('').drink).toBeNull();
  });

  test('on a rating link, drink= belongs to the pour, not the view', () => {
    expect(read('rate=&drink=negroni').drink).toBeNull();
    expect(read('draft=1&drink=negroni').drink).toBeNull();
  });

  test('a palate by handle or DID, as typed: case and a leading @ do not matter; anything else is dropped', () => {
    expect(read('palate=@Alice.bsky.social').palate).toBe('alice.bsky.social');
    expect(read('palate=did:plc:abcdefghijklmnopqrstuvwx').palate).toBe('did:plc:abcdefghijklmnopqrstuvwx');
    expect(read('palate=not a handle').palate).toBeNull();
    expect(read('palate=alice').palate).toBeNull();
    expect(read('palate=did:nope').palate).toBeNull();
    expect(actorParam('  ')).toBeNull();
  });
});

describe('writing an address', () => {
  test('the same view is always the same link: drink first, by slug', () => {
    expect(viewHref('/map', { palate: 'Alice.bsky.social', drink: negroni })).toBe('/map?drink=negroni&palate=alice.bsky.social');
    expect(viewHref('/map', { drink: 'negroni' })).toBe('/map?drink=negroni');
    expect(viewHref('/map', {})).toBe('/map');
  });

  test('what is written reads back as the same view', () => {
    for (const d of drinkDatabase) {
      const href = viewHref('/map', { drink: d, palate: 'bbthorson.bsky.social' });
      const view = read(new URL(href, 'https://x.example').search.slice(1));
      expect(view.drink?.name, d.name).toBe(d.name);
      expect(view.palate).toBe('bbthorson.bsky.social');
    }
  });

  test('a palate that does not check is left out rather than written', () => {
    expect(viewHref('/map', { palate: 'not a handle' })).toBe('/map');
  });
});
