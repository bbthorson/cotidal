import type { Drink, Tolerances } from '@/lib/data';
import { complexityDemand } from '@/lib/palate-state';

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

export interface MinimalDrinkLog {
  drinkName: string;
  location?: string;
  hedonicScale: number;
  createdAt: string;
}

/**
 * Bounded adjustment [-8, +8] from the three EKF readings not drawn on the 2D
 * chart (bitter tolerance, tannin/structure tolerance, complexity). Only
 * active once at least one pour has trained the filter (`eventCount > 0`), so
 * a fresh quiz coordinate ranks strictly on 2D distance + vibe tags.
 */
function toleranceAdjustment(tolerances: Tolerances | null | undefined, drink: Drink): number {
  if (!tolerances || tolerances.eventCount <= 0) return 0;
  let delta = 0;
  if (drink.isBitter) {
    delta += (tolerances.bitter - 5) * 0.8;
  }
  const structured = drink.hasSmoke || (drink.profile ? drink.profile.structure >= 2.5 : false);
  if (structured) {
    delta += (tolerances.tannin - 5) * 0.6;
  }
  const complexityFit = Math.max(0, 1 - Math.abs(tolerances.complexity - complexityDemand(drink)) / 7.5);
  delta += complexityFit * 4 - 2;
  return Math.max(-8, Math.min(8, delta));
}

export const calculateWeightedRelevance = (
  user: { x: number; y: number; vibeTags?: Record<string, number> | null; tolerances?: Tolerances | null },
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

  // Weighted combination + bounded EKF tolerance refinement
  const totalScore =
    0.40 * sensoryScore +
    0.30 * vibeScore +
    0.20 * historyScore +
    0.10 * venueScore +
    toleranceAdjustment(user.tolerances, drink);

  return Math.round(Math.max(0, Math.min(100, totalScore)));
};

