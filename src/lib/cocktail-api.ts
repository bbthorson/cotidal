export interface CocktailDBResult {
    idDrink: string;
    strDrink: string;
    strDrinkThumb: string;
    strInstructions: string;
}

// In-memory cache to prevent redundant network requests and improve performance.
const drinkCache = new Map<string, Promise<CocktailDBResult | null>>();
const MAX_CACHE_SIZE = 100;

// Export for testing purposes
export function _getCacheSize() {
    return drinkCache.size;
}

export function fetchDrinkDetails(drinkName: string): Promise<CocktailDBResult | null> {
    if (drinkCache.has(drinkName)) {
        return drinkCache.get(drinkName)!;
    }

    // Security Enhancement: Prevent Unbounded Cache Growth (DoS)
    if (drinkCache.size >= MAX_CACHE_SIZE) {
        const firstKey = drinkCache.keys().next().value;
        if (firstKey) {
            drinkCache.delete(firstKey);
        }
    }

    const promise = (async () => {
        try {
            const response = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(drinkName)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            if (data.drinks && data.drinks.length > 0) {
                // We'll take the first result that matches loosely or just the first one.
                // Since we search by name, the first one is usually the best match.
                return data.drinks[0] as CocktailDBResult;
            }
            return null;
        } catch (error) {
            console.error(`Failed to fetch details for ${drinkName}:`, error);
            return null;
        }
    })();

    drinkCache.set(drinkName, promise);
    return promise;
}
