import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

interface ExplanationParams {
  drinkName: string;
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
}

const CACHE_MAX_SIZE = 100;
const explanationCache = new Map<string, string>();

export function _getCacheSize() {
  return explanationCache.size;
}

export function _clearCache() {
  explanationCache.clear();
}

// Allow dependency injection for testing
type AIGenerator = (prompt: string) => Promise<string>;

/**
 * Generates a drink explanation using AI, with in-memory caching.
 * The cache key depends on the drink name and the *categorical* profile bucket,
 * not the exact coordinates, to maximize cache hits.
 */
export async function getDrinkExplanation(params: ExplanationParams, mockGenerator?: AIGenerator): Promise<string> {
  const { drinkName, x, y, dislikesSmoke, dislikesBitter } = params;

  // Categorize coordinates into buckets for caching
  const isCrisp = x > 0;
  const isSweet = y > 0;

  // Create a cache key based on the effective parameters
  const cacheKey = `${drinkName}|${isCrisp}|${isSweet}|${dislikesSmoke}|${dislikesBitter}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }

  const prompt = `
    You are "The Oracle," a witty, sophisticated, and slightly mystic sommelier.
    A seeker has matched with the essence of a "${drinkName}".

    The Seeker's Palate Aura:
    - Essence: ${isCrisp ? 'Crisp & Clean' : 'Rich & Deep'} and ${isSweet ? 'Sweet & Fruity' : 'Savory & Complex'}
    - Elemental Filters: ${dislikesSmoke ? 'Avoids Smoke' : 'Embraces Smoke'}, ${dislikesBitter ? 'Avoids Bitterness' : 'Embraces Bitterness'}.

    Provide a 2-sentence revelation of why this drink perfectly aligns with their palate's unique vibration.
    Voice: Witty, Sophisticated, Mystic.
    Use words like "Aura", "Essence", "Vibration", or "Oracle".
    Do NOT mention "coordinates", "algorithms", "x", or "y".
  `;

  try {
    let text: string;

    if (mockGenerator) {
      text = await mockGenerator(prompt);
    } else {
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: prompt,
      });
      text = result.text;
    }

    // Cache the result
    if (explanationCache.size >= CACHE_MAX_SIZE) {
      const firstKey = explanationCache.keys().next().value;
      if (firstKey !== undefined) {
        explanationCache.delete(firstKey);
      }
    }
    explanationCache.set(cacheKey, text);

    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Return fallback, but DO NOT cache errors/fallbacks so we retry next time
    return `The Oracle senses your aura aligns with the ${isCrisp ? 'Crisp' : 'Rich'} and ${isSweet ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
  }
}
