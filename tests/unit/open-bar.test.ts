import { describe, expect, it } from 'vitest';
import { isOpenBarFresh, OPEN_BAR_TTL_HOURS, risenDrink } from '@/lib/drinks/open-bar';

const NOW = Date.parse('2026-11-28T22:00:00.000Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60 * 1000).toISOString();

describe('isOpenBarFresh', () => {
  it('stays fresh within the TTL window and expires after', () => {
    expect(isOpenBarFresh(ago(0), NOW)).toBe(true);
    expect(isOpenBarFresh(ago(90), NOW)).toBe(true);
    expect(isOpenBarFresh(ago(OPEN_BAR_TTL_HOURS * 60 - 1), NOW)).toBe(true);
    expect(isOpenBarFresh(ago(OPEN_BAR_TTL_HOURS * 60), NOW)).toBe(false);
    expect(isOpenBarFresh(ago(OPEN_BAR_TTL_HOURS * 60 + 60), NOW)).toBe(false);
  });

  it('rejects missing, invalid, or future timestamps', () => {
    expect(isOpenBarFresh(undefined, NOW)).toBe(false);
    expect(isOpenBarFresh('invalid', NOW)).toBe(false);
    expect(isOpenBarFresh(new Date(NOW + 60_000).toISOString(), NOW)).toBe(false);
  });
});

describe('risenDrink', () => {
  it('picks the highest-ranked climber excluding the rated drink', () => {
    const before = ['Negroni', 'Last Word', 'Daiquiri'];
    const after = ['Last Word', 'Daiquiri'];
    expect(risenDrink(before, after, 'Negroni')).toEqual({ name: 'Last Word', rank: 1, climbed: 1 });
  });

  it('ignores the rated drink itself even if it rose', () => {
    const before = ['Negroni', 'Last Word', 'Daiquiri'];
    const after = ['Daiquiri', 'Negroni', 'Last Word'];
    expect(risenDrink(before, after, 'Daiquiri')).toBeNull();
  });

  it('returns null when order did not change', () => {
    const order = ['Negroni', 'Last Word', 'Daiquiri'];
    expect(risenDrink(order, order, 'Negroni')).toBeNull();
  });
});
