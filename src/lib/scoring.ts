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

/** How far apart, in map points, two drinks may sit and still be ordered by taste rather than by distance. */
export const RELEVANCE_BAND = 1;
/** A drink you rated 7 or more ranks as if it sat this many points closer. */
export const LIKED_LIFT = 2;

export interface Relevance {
  /** From you to the drink, on the map, to one decimal: what the screens show. */
  distance: number;
  /** Sort key, lowest first. Compare with `byRelevance`; it means nothing on its own. */
  rank: number;
}

/**
 * Where a drink stands for you. Distance decides: drinks are taken in bands
 * of `RELEVANCE_BAND` points, nearest first, and only inside a band do the
 * quiz's vibe tags, a good pour at this bar and the filter's tolerances set
 * the order. A drink you rated 7 or more counts `LIKED_LIFT` points closer;
 * one rated 3 or less goes below everything else.
 *
 * It was a weighted sum (40% distance, 30% tags, 20% history, 10% venue),
 * under which tags could outweigh several points of distance: simulated
 * quizzes got a menu averaging 5.8 points away against 3.1 for their eight
 * nearest drinks, and a top drink outside their region a third of the time.
 */
export const relevanceOf = (
  user: { x: number; y: number; vibeTags?: Record<string, number> | null; tolerances?: Tolerances | null },
  drink: Drink,
  historyLogs: MinimalDrinkLog[],
  selectedLocation?: string | null
): Relevance => {
  const distance = calculateDistance(user, drink);

  // Vibe tags, 0–30: what your answers point to, as a share of your strongest three.
  let vibe = 0;
  const vibeTags = user.vibeTags;
  if (vibeTags && Object.keys(vibeTags).length > 0) {
    const matched = drink.tags.reduce((sum, tag) => sum + (vibeTags[tag] || 0), 0);
    const top = Object.values(vibeTags).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
    vibe = top > 0 ? 30 * Math.min(1, matched / top) : 0;
  }

  const drinkLogs = historyLogs
    .filter((log) => log.drinkName.toLowerCase() === drink.name.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latest = drinkLogs[0]?.hedonicScale;

  // A good pour of it at this bar, 0–10.
  const venue =
    selectedLocation &&
    drinkLogs.some(
      (log) => log.location?.toLowerCase().trim() === selectedLocation.toLowerCase().trim() && log.hedonicScale >= 7
    )
      ? 10
      : 0;

  const lift = latest !== undefined && latest >= 7 ? LIKED_LIFT : 0;
  const band = Math.floor(Math.max(0, distance - lift) / RELEVANCE_BAND) + (latest !== undefined && latest <= 3 ? 1000 : 0);
  // Inside a band: tags, venue and tolerances, at most 48 together, so never past the next band.
  const within = vibe + venue + toleranceAdjustment(user.tolerances, drink);

  return { distance: Math.round(distance * 10) / 10, rank: band * 100 - within + distance / 1000 };
};

/** Most relevant first; equal ranks keep their order. */
export const byRelevance = (a: { rank: number }, b: { rank: number }) => a.rank - b.rank;
