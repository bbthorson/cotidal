import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { drinkDatabase } from '@/lib/data';

export interface ExplanationProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
}

const explanationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

export function _getCacheSize() {
  return explanationCache.size;
}

export function _clearCache() {
  explanationCache.clear();
}

export async function getDrinkExplanation(
  drinkName: string,
  profile: ExplanationProfile,
  // Dependency injection for testing
  _generateText: typeof generateText = generateText
): Promise<string> {
  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    return `The Oracle senses your essence is drawn to the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} vibration of this match.`;
  }

  // Create a cache key based on the parameters that affect the prompt
  const isCrisp = profile.x > 0;
  const isSweet = profile.y > 0;

  const cacheKey = `${drinkName}|${isCrisp}|${isSweet}|${profile.dislikesSmoke}|${profile.dislikesBitter}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }

  // Enforce cache size limit (LRU-like: remove oldest insertion)
  if (explanationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = explanationCache.keys().next().value;
    if (firstKey) explanationCache.delete(firstKey);
  }

  const prompt = `
    You are "The Oracle," a witty, sophisticated, and slightly mystic sommelier.
    A seeker has matched with the essence of a "${drinkName}".

    The Seeker's Palate Aura:
    - Essence: ${isCrisp ? 'Crisp & Clean' : 'Rich & Deep'} and ${isSweet ? 'Sweet & Fruity' : 'Savory & Complex'}
    - Elemental Filters: ${profile.dislikesSmoke ? 'Avoids Smoke' : 'Embraces Smoke'}, ${profile.dislikesBitter ? 'Avoids Bitterness' : 'Embraces Bitterness'}.

    Provide a 2-sentence revelation of why this drink perfectly aligns with their palate's unique vibration.
    Voice: Witty, Sophisticated, Mystic.
    Use words like "Aura", "Essence", "Vibration", or "Oracle".
    Do NOT mention "coordinates", "algorithms", "x", or "y".
  `;

  try {
    // Timeout safety for AI calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { text } = await _generateText({
      model: google('gemini-1.5-flash'),
      prompt: prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);

    explanationCache.set(cacheKey, text);
    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key or timeout)
    return `The Oracle senses your aura aligns with the ${isCrisp ? 'Crisp' : 'Rich'} and ${isSweet ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
  }
}
