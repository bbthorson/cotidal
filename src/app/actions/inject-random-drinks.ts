'use server';

import { fetchRandomDrink } from '@/lib/cocktail-api';
import { archetypeDrink } from './archetype-drink';
import { Drink, VibeTag } from '@/lib/data';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_INJECT_COUNT = 10;

export async function getInjectedDrinks(count: number = 5): Promise<Drink[]> {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Security: Enforce hard limit to prevent DoS via massive loops.
  // Although archetypeDrink also rate limits, this prevents fetching random drinks excessively.
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
