import type { User, Drink, ContextType } from '@/lib/data';

export const calculateDistance = (user: User, drink: Drink) => {
    return Math.sqrt(Math.pow(user.x - drink.x, 2) + Math.pow(user.y - drink.y, 2));
};

export const calculateContextScore = (drink: Drink, context: ContextType) => {
    let score = 0;
    const tags = new Set(drink.tags);

    switch (context) {
        case 'business':
            if (tags.has('messy') || tags.has('polarizing')) return -100; // Hard filter out
            if (tags.has('classic')) score += 5;
            if (tags.has('prestige')) score += 8;
            break;
        case 'holiday':
            if (tags.has('comfort')) score += 5;
            if (tags.has('warm')) score += 5;
            if (tags.has('spice')) score += 5;
            break;
        case 'party':
            if (tags.has('social')) score += 5;
            if (tags.has('crushable')) score += 5;
            if (tags.has('complex')) score -= 2; // Keep it simple
            break;
        case 'usual':
        default:
            return 0; // No extra boosting
    }
    return score;
};
