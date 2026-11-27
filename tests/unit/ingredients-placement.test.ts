import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drinkDatabase } from '../../src/lib/drinks/data';
import { INGREDIENT_INDEX } from '../../src/lib/drinks/ingredients';
import {
  detectAversions,
  extractPrimitives,
  placeDirectional,
} from '../../src/lib/drinks/ingredient-match';
import { distanceBetween, quadrantIdFor } from '../../src/lib/map/coordinates';

const DRINKS_DIR = join(process.cwd(), 'src/content/drinks');

describe('Ingredients Index & Directional Placement', () => {
  test('every primitive in INGREDIENT_INDEX has a unique id', () => {
    const ids = INGREDIENT_INDEX.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('detectAversions reads smoke, bitter, and anise from INGREDIENT_INDEX and sensory words', () => {
    expect(detectAversions('espadín mezcal, lime, agave')).toEqual({
      smoke: true,
      bitter: false,
      anise: false,
    });
    expect(detectAversions('gin, suze, tonic water')).toEqual({
      smoke: false,
      bitter: true,
      anise: false,
    });
    expect(detectAversions('rye, herbsaint rinse, sugar')).toEqual({
      smoke: false,
      bitter: false,
      anise: true,
    });
    expect(detectAversions('vodka, lime, ginger beer')).toEqual({
      smoke: false,
      bitter: false,
      anise: false,
    });
  });

  test('placeDirectional refuses to guess on bare names without ingredients', () => {
    expect(placeDirectional('The Velvet Fox')).toBeNull();
    expect(placeDirectional('House Special — secret syrup')).toBeNull();
  });

  test('placeDirectional places house cocktails honestly by listed ingredients', () => {
    const deepDrink = placeDirectional('Midnight Club — rye, sweet vermouth, fernet, angostura');
    expect(deepDrink).not.toBeNull();
    expect(deepDrink!.quadrant).toBe('deep');
    expect(deepDrink!.aversions.bitter).toBe(true);
    expect(deepDrink!.confidence).toBe('medium');

    const surfDrink = placeDirectional('Garden Spritz — gin, elderflower, lime, prosecco');
    expect(surfDrink).not.toBeNull();
    expect(surfDrink!.quadrant).toBe('surf');
    expect(surfDrink!.confidence).toBe('medium');

    const eddyDrink = placeDirectional('Velvet Dessert — cognac, crème de cacao, heavy cream');
    expect(eddyDrink).not.toBeNull();
    expect(eddyDrink!.quadrant).toBe('eddy');

    const smoky = placeDirectional('Paper Tiger — mezcal, aperol, lime, agave');
    expect(smoky).not.toBeNull();
    expect(smoky!.aversions.smoke).toBe(true);
    expect(smoky!.aversions.bitter).toBe(true);
    expect(smoky!.closestClassic?.name).toBe('Naked & Famous');
    expect(extractPrimitives('mezcal, aperol, lime, agave').length).toBeGreaterThanOrEqual(4);
  });

  test('directional placement tracks verified cocktails from ingredients alone', () => {
    const errors: number[] = [];
    let sameQuadrant = 0;
    let evaluated = 0;

    for (const file of readdirSync(DRINKS_DIR).filter((f) => f.endsWith('.md'))) {
      const raw = readFileSync(join(DRINKS_DIR, file), 'utf8');
      const name = raw.match(/^name:\s*"(.+)"$/m)?.[1];
      const drink = drinkDatabase.find((d) => d.name === name);
      if (!drink || drink.type !== 'Cocktail') continue;

      const ingredients = [...raw.matchAll(/^ {2}- \{.*name:\s*"([^"]+)"/gm)]
        .map((m) => m[1])
        .join(', ');
      const placed = placeDirectional(ingredients);
      if (!placed) continue;

      evaluated++;
      errors.push(distanceBetween(placed, drink));
      if (placed.quadrant === quadrantIdFor(drink.x, drink.y)) sameQuadrant++;
    }

    const rms = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
    // Most verified cocktails should have enough primitives to evaluate, and
    // directional placement (with zero ratio/method info) should land in the
    // right quadrant for the majority and stay within a reasonable 2D RMS.
    expect(evaluated).toBeGreaterThanOrEqual(55);
    expect(sameQuadrant / evaluated).toBeGreaterThanOrEqual(0.65);
    expect(rms).toBeLessThan(6.5);
  });
});
