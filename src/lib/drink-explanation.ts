import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { drinkDatabase } from '@/lib/data';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
});

// Optimization: In-memory LRU cache to prevent expensive AI calls for identical requests.
// Key: drinkName + quadrant + filters
// Value: AI explanation text
const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

// Internal helpers for verification/testing
export function _getCacheSize() { return cache.size; }
export function _clearCache() { cache.clear(); }

export async function getDrinkExplanation(
    drinkName: string,
    userProfile: unknown,
    // Dependency injection for easier testing
    checkRateLimitFn: () => Promise<boolean> = checkRateLimit
) {
  // SECURITY: Validate userProfile structure to prevent injection/crashes
  const profileResult = UserProfileSchema.safeParse(userProfile);

  if (!profileResult.success) {
      console.warn("Security: Invalid userProfile structure", profileResult.error);
      return "This drink is an excellent choice for your palate.";
  }

  const profile = profileResult.data;

  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    return `The Oracle senses your essence is drawn to the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} vibration of this match.`;
  }

  // Optimization: Check cache before rate limiting (avoids headers() call) and before expensive AI call.
  // We use a simplified key based on the factors that actually affect the prompt.
  const cacheKey = `${drinkName}|${profile.x > 0}|${profile.y > 0}|${profile.dislikesSmoke}|${profile.dislikesBitter}`;

  if (cache.has(cacheKey)) {
    // LRU: Refresh usage by deleting and re-setting
    const val = cache.get(cacheKey)!;
    cache.delete(cacheKey);
    cache.set(cacheKey, val);
    return val;
  }

  // Rate limit check only if we need to hit the AI (costly operation)
  const isAllowed = await checkRateLimitFn();
  if (!isAllowed) {
    return "The Sommelier is currently overwhelmed with requests. Please try again in a minute.";
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

  let resultText = "";

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'), // Using a widely available model, can be updated.
      prompt: prompt,
    });
    resultText = text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    resultText = `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
  }

  // Cache the result (even if it's the fallback, to prevent repeated failures/retries)
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict oldest (first inserted)
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(cacheKey, resultText);

  return resultText;
}
