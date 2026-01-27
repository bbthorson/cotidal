import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Simple LRU Cache implementation
const explanationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

export interface ExplanationProfile {
    x: number;
    y: number;
    dislikesSmoke: boolean;
    dislikesBitter: boolean;
}

export type GeneratorFunction = (prompt: string) => Promise<string>;

const defaultGenerator: GeneratorFunction = async (prompt: string) => {
    const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: prompt,
    });
    return text;
};

/**
 * Generates a cache key based on the drink name and categorical profile buckets.
 * We bucket the continuous x/y coordinates into quadrants to maximize cache hits.
 */
function getCacheKey(drinkName: string, profile: ExplanationProfile): string {
    const quadrantX = profile.x > 0 ? 'pos' : 'neg';
    const quadrantY = profile.y > 0 ? 'pos' : 'neg';
    const smoke = profile.dislikesSmoke ? 'noSmoke' : 'yesSmoke';
    const bitter = profile.dislikesBitter ? 'noBitter' : 'yesBitter';

    return `${drinkName}:${quadrantX}:${quadrantY}:${smoke}:${bitter}`;
}

export function _getCacheSize() {
    return explanationCache.size;
}

export function _clearCache() {
    explanationCache.clear();
}

export async function getDrinkExplanation(
    drinkName: string,
    profile: ExplanationProfile,
    generator: GeneratorFunction = defaultGenerator
): Promise<string> {
    const key = getCacheKey(drinkName, profile);

    if (explanationCache.has(key)) {
        // Refresh LRU order: delete and re-add
        const val = explanationCache.get(key)!;
        explanationCache.delete(key);
        explanationCache.set(key, val);
        return val;
    }

    // Construct the prompt
    // Note: We replicate the prompt logic from the original action to ensure consistency.
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

        // Update Cache
        if (explanationCache.size >= MAX_CACHE_SIZE) {
            const firstKey = explanationCache.keys().next().value;
            if (firstKey) explanationCache.delete(firstKey);
        }
        explanationCache.set(key, text);

        return text;
    } catch (error) {
        console.error("AI Generation Error in getDrinkExplanation:", error);
        // Throwing allows the caller (Server Action) to handle the fallback
        throw error;
    }
}
