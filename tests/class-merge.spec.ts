import { test, expect } from '@playwright/test';
import config from '../tailwind.config';
import { cn, FONT_SIZES } from '../src/lib/utils';

test('cn: knows every type size the config defines', () => {
  const sizes = Object.keys(config.theme?.extend?.fontSize ?? {});
  expect([...FONT_SIZES].sort()).toEqual(sizes.sort());
});

test('cn: a colour after a type size keeps the size', () => {
  for (const size of FONT_SIZES) {
    expect(cn(`text-${size}`, 'text-foreground')).toBe(`text-${size} text-foreground`);
  }
  // Two sizes still resolve to the later one.
  expect(cn('text-prose', 'text-title')).toBe('text-title');
});
