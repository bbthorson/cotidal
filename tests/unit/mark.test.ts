import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { iconSvg, mark, MARK_COLOURS } from '../../src/lib/mark';
import { COTIDAL_LINES, CENTRE } from '../../src/lib/chart-geometry';

/**
 * The mark is generated from the chart, and the icon files from the mark.
 * These fail when a hand edit, or a change to the geometry or the tokens,
 * leaves one of them behind. Fix by running `npm run icons`.
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

test('Mark: public/icon.svg is what src/lib/mark.ts draws (run `npm run icons`)', () => {
  expect(readFileSync('public/icon.svg', 'utf8')).toBe(iconSvg());
});

test('Mark: four lines from the amphidrome, like the figure', () => {
  const m = mark('header');
  expect(m.lines).toHaveLength(COTIDAL_LINES.length);
  for (const d of m.lines) expect(d.startsWith(`M${CENTRE.x} ${CENTRE.y} Q`)).toBe(true);
});
