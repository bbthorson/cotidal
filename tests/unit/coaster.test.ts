import { test, expect } from 'vitest';
import { coasterPath, memberCodeUrl, qrPath } from '../../src/lib/coaster';

/**
 * Coasters (docs/coasters.md). A member's code is their map by DID with
 * nothing appended; a member's coaster exists only for that member; a
 * region's coaster is public. Neither page ships script.
 */

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';

test('Coaster: a member’s code is their map by DID, with nothing appended', () => {
  const url = new URL(memberCodeUrl('https://cotidal.example', DID));
  expect(url.pathname).toBe(`/p/${DID}`);
  expect(url.search).toBe('');
  expect(url.hash).toBe('');
  expect(coasterPath(DID)).toBe(`/p/${DID}/code`);
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

