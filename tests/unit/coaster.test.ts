import { test, expect } from 'vitest';
import { memberCodeUrl, qrPath } from '../../src/lib/map/coaster';

/**
 * A member's code (docs/coasters.md): their map by DID with nothing appended,
 * drawn as whole modules, over their map in Settings.
 */

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';

test('Coaster: a member’s code is their map by DID, with nothing appended', () => {
  const url = new URL(memberCodeUrl('https://cotidal.example', DID));
  expect(url.pathname).toBe(`/p/${DID}`);
  expect(url.search).toBe('');
  expect(url.hash).toBe('');
});

test('Coaster: the code is drawn as whole modules inside its square', () => {
  const { size, d } = qrPath(memberCodeUrl('https://cotidal.example', DID));
  expect(size).toBeGreaterThanOrEqual(21);
  expect((size - 17) % 4).toBe(0);
  for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    expect(Number(x) + Number(w)).toBeLessThanOrEqual(size);
    expect(Number(y)).toBeLessThan(size);
  }
});

