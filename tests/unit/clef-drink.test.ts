import { describe, expect, it } from 'vitest';
import { fallbackClassifyDrink, parseClefDrink } from '@/lib/clef-drink';

describe('clef-drink', () => {
  it('maps confident Clef probabilities into aversions and a 2D coordinate', () => {
    const fallback = fallbackClassifyDrink('Oaxacan Sunset', 'agave spirit, gentian, charred citrus');
    const parsed = parseClefDrink(
      {
        smoke: { probability: 0.91 },
        bitter: { probability: 0.84 },
        anise: { probability: 0.05 },
        body: { score: 2, confidence: 0.82 },
        sweetness: { score: 2, confidence: 0.78 },
      },
      fallback
    );

    expect(parsed.aversions).toEqual({ smoke: true, bitter: true, anise: false });
    expect(parsed.coordinate).toEqual({ x: 4.5, y: -4.5 });
    expect(parsed.confidence).toBe(0.78);
  });

  it('abstains from estimating a coordinate when Clef confidence is low', () => {
    const fallback = fallbackClassifyDrink('Bartender Choice');
    const parsed = parseClefDrink(
      {
        smoke: { probability: 0.1 },
        bitter: { probability: 0.2 },
        anise: { probability: 0.05 },
        body: { score: 3, confidence: 0.35 },
        sweetness: { score: 3, confidence: 0.4 },
      },
      fallback
    );

    expect(parsed.coordinate).toBeNull();
    expect(parsed.confidence).toBe(0.35);
  });

  it('falls back deterministically via ingredient-match when Clef is unavailable', () => {
    const fb = fallbackClassifyDrink('House Paper Tiger', 'mezcal, Aperol, lime');
    expect(fb.aversions).toEqual({ smoke: true, bitter: true, anise: false });
    expect(fb.closestClassic).toBe('Naked & Famous');
    expect(fb.coordinate).not.toBeNull();
  });
});
