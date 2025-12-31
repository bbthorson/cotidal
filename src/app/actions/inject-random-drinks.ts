'use server';

import { fetchRandomDrink } from '@/lib/cocktail-api';
import { archetypeDrink } from './archetype-drink';
import { Drink, VibeTag } from '@/lib/data';

// SECURITY: Limit the maximum number of drinks to prevent DoS via amplification.
const MAX_INJECT_COUNT = 10;

export async function getInjectedDrinks(count: number = 5): Promise<Drink[]> {
  // SECURITY: Enforce hard limit on count
  const safeCount = Math.min(Math.max(1, count), MAX_INJECT_COUNT);

  const drinks: Drink[] = [];

  for (let i = 0; i < safeCount; i++) {
    const rawDrink = await fetchRandomDrink();
    if (rawDrink) {
      const arch = await archetypeDrink(rawDrink.strDrink, rawDrink.strInstructions);
      drinks.push({
        name: rawDrink.strDrink,
        type: "Cocktail", // Defaulting to Cocktail for random DB results
        x: arch.x,
        y: arch.y,
        hasSmoke: arch.hasSmoke,
        hasAnise: arch.hasAnise,
        isBitter: arch.isBitter,
        tags: arch.tags as VibeTag[],
      });
    }
  }

  return drinks;
}
