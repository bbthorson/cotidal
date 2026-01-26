import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { drinkDatabase } from '@/lib/data';

export interface ExplanationUserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
}

// Caching Logic
const CACHE_SIZE_LIMIT = 100;
const cache = new Map<string, string>();

type GeneratorFunction = (prompt: string) => Promise<string>;

const defaultGenerator: GeneratorFunction = async (prompt) => {
  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt,
  });
  return text;
};

export function _getCacheSize() {
  return cache.size;
}

export function _clearCache() {
  cache.clear();
}

export async function getDrinkExplanation(
  drinkName: string,
  profile: ExplanationUserProfile,
  generator: GeneratorFunction = defaultGenerator
): Promise<string> {
  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    return `The Oracle senses your essence is drawn to the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} vibration of this match.`;
  }

  // Construct Cache Key
  // Quantize coordinates to quadrants (since that's what the prompt uses)
  const quadrantX = profile.x > 0 ? 'pos' : 'neg';
  const quadrantY = profile.y > 0 ? 'pos' : 'neg';
  const key = `${drinkName}|${quadrantX}|${quadrantY}|${profile.dislikesSmoke}|${profile.dislikesBitter}`;

  if (cache.has(key)) {
    const val = cache.get(key)!;
    // Refresh LRU: Remove and re-insert to move to end (most recently used)
    cache.delete(key);
    cache.set(key, val);
    return val;
  }

  const prompt = `
    You are "The Oracle," a witty, sophisticated, and slightly mystic sommelier.
    A seeker has matched with the essence of a "${drinkName}".

    The Seeker's Palate Aura:
    - Essence: ${profile.x > 0 ? 'Crisp & Clean' : 'Rich & Deep'} and ${profile.y > 0 ? 'Sweet & Fruity' : 'Savory & Complex'}
    - Elemental Filters: ${profile.dislikesSmoke ? 'Avoids Smoke' : 'Embraces Smoke'}, ${profile.dislikesBitter ? 'Avoids Bitterness' : 'Embraces Bitterness'}.

    Provide a 2-sentence revelation of why this drink perfectly aligns with their palate's unique vibration.
    Voice: Witty, Sophisticated, Mystic.
    Use words like "Aura", "Essence", "Vibration", or "Oracle".
    Do NOT mention "coordinates", "algorithms", "x", or "y".
  `;

  try {
    const text = await generator(prompt);

    // Cache the result
    if (cache.size >= CACHE_SIZE_LIMIT) {
        // Evict the oldest (first) item
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
            cache.delete(firstKey);
        }
    }

    cache.set(key, text);

    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    return `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
  }
}
