'use server';

import { fetchRandomDrink } from '@/lib/cocktail-api';
import { archetypeDrink } from './archetype-drink';
import { Drink } from '@/lib/data';
import { checkRateLimit } from '@/lib/rate-limit';

export async function getInjectedDrinks(count: number = 5): Promise<Drink[]> {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
     console.warn("Rate limit exceeded for getInjectedDrinks");
     return [];
  }

  // Security: Limit count to prevent resource exhaustion
  const safeCount = Math.min(Math.max(1, count), 5);

  const drinks: Drink[] = [];
  
  for (let i = 0; i < safeCount; i++) {
    const rawDrink = await fetchRandomDrink();
    if (rawDrink) {
      try {
        const arch = await archetypeDrink(rawDrink.strDrink, rawDrink.strInstructions);
        drinks.push({
          name: rawDrink.strDrink,
          type: "Cocktail", // Defaulting to Cocktail for random DB results
          x: arch.x,
          y: arch.y,
          hasSmoke: arch.hasSmoke,
          hasAnise: arch.hasAnise,
          isBitter: arch.isBitter,
          tags: arch.tags as any[],
        });
      } catch (e) {
        console.error("Failed to archetype drink:", e);
      }
    }
  }
  
  return drinks;
}
