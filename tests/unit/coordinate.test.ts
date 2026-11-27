import { expect, test } from 'vitest';
import { formatAxis, formatCoordinate } from '../../src/lib/map/coordinates';
import { axes } from '../../src/lib/copy';

test('formatAxis names the pole a value leans toward', () => {
  expect(formatAxis(-1.44, 'x')).toBe(`${axes.rich} −1.4`);
  expect(formatAxis(3.8, 'x')).toBe(`${axes.crisp} +3.8`);
  expect(formatAxis(-2.6, 'y')).toBe(`${axes.savory} −2.6`);
  expect(formatAxis(0.25, 'y')).toBe(`${axes.sweet} +0.3`);
});

test('formatAxis names both poles for a value on the axis, which leans neither way', () => {
  expect(formatAxis(0, 'y')).toBe(`${axes.savory}–${axes.sweet} 0.0`);
  expect(formatAxis(0.04, 'x')).toBe(`${axes.rich}–${axes.crisp} 0.0`);
  expect(formatAxis(-0.04, 'y')).toBe(`${axes.savory}–${axes.sweet} 0.0`);
});

test('a coordinate never prints a negative zero', () => {
  expect(formatCoordinate(-0.04, -6)).toBe('0.0 · −6.0');
});
