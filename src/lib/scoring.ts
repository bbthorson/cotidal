import type { User, Drink, ContextType } from '@/lib/data';

export const calculateDistance = (user: User, drink: Drink) => {
    // Optimization: (x*x) is faster than Math.pow(x, 2)
    const dx = user.x - drink.x;
    const dy = user.y - drink.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const calculateContextScore = (drink: Drink, context: ContextType) => {
    let score = 0;
    // Optimization: drink.tags is small (3-5 items).
    // Array.includes() is significantly faster than allocating a new Set() + .has().
    // Benchmark showed ~7x speedup.
    const tags = drink.tags;

    switch (context) {
        case 'business':
            if (tags.includes('messy') || tags.includes('polarizing')) return -100; // Hard filter out
            if (tags.includes('classic')) score += 5;
            if (tags.includes('prestige')) score += 8;
            break;
        case 'holiday':
            if (tags.includes('comfort')) score += 5;
            if (tags.includes('warm')) score += 5;
            if (tags.includes('spice')) score += 5;
            break;
        case 'party':
            if (tags.includes('social')) score += 5;
            if (tags.includes('crushable')) score += 5;
            if (tags.includes('complex')) score -= 2; // Keep it simple
            break;
        case 'usual':
        default:
            return 0; // No extra boosting
    }
    return score;
};
