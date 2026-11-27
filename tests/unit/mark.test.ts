import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { iconSvg, mark, MARK_COLOURS } from '../../src/lib/mark';
import { COTIDAL_LINES, CENTRE } from '../../src/lib/map/chart-geometry';

/**
 * The mark is generated from the chart, and the icon files from the mark.
 * These fail when a hand edit, or a change to the geometry or the tokens,
 * leaves one of them behind. Fix by running `npm run images`.
 */

function token(name: string): string {
  const css = readFileSync('src/styles/globals.css', 'utf8');
  const m = css.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)%\\s+(\\d+)%`));
  if (!m) throw new Error(`--${name} not found`);
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
}

test('Mark: the icon colours are the tokens', () => {
  expect(MARK_COLOURS.terracotta).toBe(token('primary'));
  expect(MARK_COLOURS.ink).toBe(token('foreground'));
  expect(MARK_COLOURS.paper).toBe(token('background'));
});

test('Mark: public/icon.svg is what src/lib/mark.ts draws (run `npm run images`)', () => {
  expect(readFileSync('public/icon.svg', 'utf8')).toBe(iconSvg());
});

test('Mark: four lines from the amphidrome, like the figure', () => {
  const m = mark('header');
  expect(m.lines).toHaveLength(COTIDAL_LINES.length);
  for (const d of m.lines) expect(d.startsWith(`M${CENTRE.x} ${CENTRE.y} Q`)).toBe(true);
});

test('Mark: raster icons and manifest are committed at expected sizes', () => {
  const ico = readFileSync('public/favicon.ico');
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(3);

  for (const [file, size] of [
    ['public/apple-touch-icon.png', 180],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
  ] as const) {
    const png = readFileSync(file);
    expect(png.subarray(1, 4).toString(), file).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], file).toEqual([size, size]);
  }

  const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));
  expect(manifest.theme_color).toBe(MARK_COLOURS.paper);
  expect(manifest.background_color).toBe(MARK_COLOURS.paper);
  expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual(['/icon-192.png', '/icon-512.png']);
});
