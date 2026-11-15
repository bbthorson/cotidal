import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHARE_CARDS, SHARE_SIZE, shareImagePath } from '../../src/lib/share';
import { quadrants } from '../../src/lib/copy';

/**
 * Every card a page can name is committed, at the size the meta tags claim.
 * Captured by `npm run images` from /share/<card>; a missing one is a page
 * whose link unfurls into nothing.
 */
test('Share: one card for the site and one per region, each 1200×630', () => {
  expect(SHARE_CARDS).toEqual(['site', ...quadrants.map((q) => q.id)]);
  for (const card of SHARE_CARDS) {
    const png = readFileSync('public' + shareImagePath(card));
    expect(png.subarray(1, 4).toString(), card).toBe('PNG');
    // IHDR: width and height, big-endian, at bytes 16 and 20.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], card).toEqual([SHARE_SIZE.width, SHARE_SIZE.height]);
  }
});
