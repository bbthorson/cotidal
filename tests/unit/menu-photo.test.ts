import { describe, expect, test } from 'vitest';
import { mergeCapturedItems } from '../../src/lib/drinks/menu-photo';
import { addMenuLines } from '../../src/lib/drinks/menu-rank';
import type { CaptureMenuResponse } from '../../src/lib/api-client';

const directional = (closestClassicName: string | null) => ({
  x: 2.5,
  y: 2,
  quadrant: 'deep',
  confidence: 'medium' as const,
  aversions: { smoke: true, bitter: false, anise: false },
  closestClassicName,
});

const response = (items: CaptureMenuResponse['items']): CaptureMenuResponse => ({
  lines: items.map((i) => i.label),
  items,
  method: 'photo',
  outcome: null,
});

describe('mergeCapturedItems', () => {
  test('adds the photo’s lines after the menu so far, placing what matches a drink', () => {
    const before = addMenuLines([], 'Negroni', {});
    const merged = mergeCapturedItems(before, response([{ label: 'Manhattan', drinkName: null }]), {});
    expect(merged.map((i) => i.label)).toEqual(['Negroni', 'Manhattan']);
    expect(merged.every((i) => i.drink)).toBe(true);
  });

  test('gives an unplaced line the direction the capture found, with its closest classic', () => {
    const merged = mergeCapturedItems(
      [],
      response([{ label: 'Velvet Fog', drinkName: null, directional: directional('Negroni') }]),
      {}
    );
    const [fog] = merged;
    expect(fog.drink).toBeNull();
    expect(fog.directional).toMatchObject({ x: 2.5, y: 2, quadrant: 'deep', aversions: { smoke: true, bitter: false, anise: false } });
    expect(fog.directional?.closestClassic?.name).toBe('Negroni');
    expect(fog.relative?.name).toBe('Negroni');
  });

  test('a classic the library does not hold gives a direction and no relative', () => {
    const [fog] = mergeCapturedItems([], response([{ label: 'Velvet Fog', drinkName: null, directional: directional('Not A Drink') }]), {});
    expect(fog.directional?.closestClassic).toBeNull();
    expect(fog.relative).toBeUndefined();
  });

  test('leaves a placed line as it is, even when the capture sent a direction for it', () => {
    const [negroni] = mergeCapturedItems([], response([{ label: 'Negroni', drinkName: 'Negroni', directional: directional(null) }]), {});
    expect(negroni.drink?.name).toBe('Negroni');
    expect(negroni.directional).toBeUndefined();
  });
});
