import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

interface UserProfile {
    x: number;
    y: number;
    dislikesSmoke: boolean;
    dislikesBitter: boolean;
}

// In-memory cache: Key -> Explanation
const explanationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

export function _getCacheSize() {
    return explanationCache.size;
}

// Clear cache for testing/maintenance
export function _clearCache() {
    explanationCache.clear();
}

type GeneratorFunction = (prompt: string) => Promise<string>;

export async function getDrinkExplanation(
    drinkName: string,
    profile: UserProfile,
    generator?: GeneratorFunction
): Promise<string> {
    // 1. Generate Cache Key based on quantized inputs
    const xTag = profile.x > 0 ? 'pos' : 'neg';
    const yTag = profile.y > 0 ? 'pos' : 'neg';
    const smokeTag = profile.dislikesSmoke ? 'noSmoke' : 'smoke';
    const bitterTag = profile.dislikesBitter ? 'noBitter' : 'bitter';

    const key = `${drinkName}:${xTag}:${yTag}:${smokeTag}:${bitterTag}`;

    // 2. Check Cache
    if (explanationCache.has(key)) {
        return explanationCache.get(key)!;
    }

    // 3. Prepare Prompt
    const essenceX = profile.x > 0 ? 'Crisp & Clean' : 'Rich & Deep';
    const essenceY = profile.y > 0 ? 'Sweet & Fruity' : 'Savory & Complex';
    const filterSmoke = profile.dislikesSmoke ? 'Avoids Smoke' : 'Embraces Smoke';
    const filterBitter = profile.dislikesBitter ? 'Avoids Bitterness' : 'Embraces Bitterness';

    const prompt = `
    You are "The Oracle," a witty, sophisticated, and slightly mystic sommelier.
    A seeker has matched with the essence of a "${drinkName}".

    The Seeker's Palate Aura:
    - Essence: ${essenceX} and ${essenceY}
    - Elemental Filters: ${filterSmoke}, ${filterBitter}.

    Provide a 2-sentence revelation of why this drink perfectly aligns with their palate's unique vibration.
    Voice: Witty, Sophisticated, Mystic.
    Use words like "Aura", "Essence", "Vibration", or "Oracle".
    Do NOT mention "coordinates", "algorithms", "x", or "y".
  `;

    // 4. Generate
    let text = "";
    try {
        if (generator) {
            text = await generator(prompt);
        } else {
            const result = await generateText({
                model: google('gemini-1.5-flash'),
                prompt: prompt,
            });
            text = result.text;
        }
    } catch (error) {
        console.error("AI Generation Error:", error);
        // Fallback
        return `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
    }

    // 5. Cache Result (LRU-ish eviction)
    if (explanationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = explanationCache.keys().next().value;
        if (firstKey) explanationCache.delete(firstKey);
    }
    explanationCache.set(key, text);

    return text;
}
