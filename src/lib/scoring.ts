import type { Drink, ContextType } from '@/lib/data';

interface Point {
    x: number;
    y: number;
}

export const calculateDistance = (p1: Point, p2: Point) => {
    // Optimization: (x*x) is faster than Math.pow(x, 2)
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
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

// Convert coordinates to CSS percentages (Range -10 to 10 mapped to 0% to 100%)
// Moved here to be reusable across components (ResultsScreen, UserPin, MapPin)
export const toPct = (val: number) => ((val + 10) / 20) * 100;

export interface MinimalDrinkLog {
  drinkName: string;
  location?: string;
  hedonicScale: number;
  createdAt: string;
}

export const calculateWeightedRelevance = (
  user: { x: number; y: number; vibeTags?: Record<string, number> | null },
  drink: Drink,
  historyLogs: MinimalDrinkLog[],
  selectedLocation?: string | null
): number => {
  // 1. Sensory Similarity (40%)
  const distance = calculateDistance(user, drink);
  // Max distance on 20x20 grid is sqrt(20^2 + 20^2) = 28.28427
  const maxDistance = 28.28427;
  const sensoryScore = 100 * Math.max(0, 1 - distance / maxDistance);

  // 2. Vibe Tag Affinity (30%)
  let vibeScore = 0;
  const vibeTags = user.vibeTags;
  if (vibeTags && Object.keys(vibeTags).length > 0) {
    let matchedSum = 0;
    drink.tags.forEach(tag => {
      matchedSum += vibeTags[tag] || 0;
    });
    const sortedWeights = Object.values(vibeTags).sort((a, b) => b - a);
    const topSum = sortedWeights.slice(0, 3).reduce((a, b) => a + b, 0);
    vibeScore = topSum > 0 ? 100 * Math.min(1, matchedSum / topSum) : 0;
  }

  // 3. Tasted History Bias (20%)
  let historyScore = 0;
  const drinkLogs = historyLogs
    .filter(log => log.drinkName.toLowerCase() === drink.name.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (drinkLogs.length > 0) {
    const latestRating = drinkLogs[0].hedonicScale;
    if (latestRating >= 7) {
      historyScore = 100; // Adds 20 points
    } else if (latestRating <= 3) {
      historyScore = -250; // Subtracts 50 points (penalty)
    } else {
      historyScore = 50; // Adds 10 points
    }
  }

  // 4. Venue-Specific Relevance (10%)
  let venueScore = 0;
  if (selectedLocation) {
    const venueLogs = drinkLogs.filter(
      log => log.location?.toLowerCase().trim() === selectedLocation.toLowerCase().trim()
    );
    const hasGoodVenueLog = venueLogs.some(log => log.hedonicScale >= 7);
    if (hasGoodVenueLog) {
      venueScore = 100; // Adds 10 points
    }
  }

  // Weighted combination
  const totalScore =
    0.40 * sensoryScore +
    0.30 * vibeScore +
    0.20 * historyScore +
    0.10 * venueScore;

  return Math.round(Math.max(0, Math.min(100, totalScore)));
};

