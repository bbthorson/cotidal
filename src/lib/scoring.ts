import type { Drink, Tolerances } from '@/lib/data';
import { complexityDemand } from '@/lib/palate-state';
import { drinkHeight, evidenceAt, kindOf, type Evidence, type Terrain } from '@/lib/terrain';

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
 * a fresh quiz coordinate ranks on its terrain and vibe tags alone.
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

/**
 * How close two drinks' heights on your terrain may be, in rating points, and
 * still be ordered by taste (the quiz's tags, a good pour at this bar, the
 * trained tolerances) rather than by height.
 */
export const HEIGHT_BAND = 0.25;
/** A latest rating at or below this takes a drink off your menu, and below everything in a bar's. */
export const DISLIKED_AT = 3;

export interface Relevance {
  /** From your point to the drink, on the map, to one decimal: which way and how far, on a drink's card. */
  distance: number;
  /** Sort key, lowest first. Compare with `byRelevance`; it means nothing on its own. */
  rank: number;
  /** The rated pours that put the drink where it stands, strongest pull first (`evidenceAt`). */
  evidence: Evidence[];
  /** Your latest rating of the drink itself, when you have rated it. */
  rated?: number;
}

/**
 * Where a drink stands for you: by its height on your terrain
 * (`drinkHeight`, `src/lib/terrain.ts`) — the ground your answers and ratings
 * make around it, and what you said of the drink itself. Drinks are taken in
 * bands of `HEIGHT_BAND`, highest first, and only inside a band do the
 * quiz's vibe tags, a good pour at this bar and the filter's tolerances set
 * the order, so they never carry a drink past a higher one. A drink whose
 * latest rating is `DISLIKED_AT` or less goes below everything else.
 *
 * It was distance from one point, in bands, with a liked drink counted two
 * points closer. One point cannot hold two parts of the map: someone who
 * loved drinks in the Deep and the Surf was ranked from the middle, between
 * them, where neither was (`tests/unit/terrain.test.ts`).
 */
export const relevanceOf = (
  user: { x: number; y: number; vibeTags?: Record<string, number> | null; tolerances?: Tolerances | null },
  drink: Drink,
  historyLogs: MinimalDrinkLog[],
  selectedLocation: string | null | undefined,
  terrain: Terrain
): Relevance => {
  const distance = calculateDistance(user, drink);
  const { rating } = drinkHeight(terrain, drink);

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

  const band = Math.floor(Math.max(0, 9 - rating) / HEIGHT_BAND) + (latest !== undefined && latest <= DISLIKED_AT ? 1000 : 0);
  // Inside a band: tags, venue and tolerances, at most 48 together, so never past the next band.
  const within = vibe + venue + toleranceAdjustment(user.tolerances, drink);

  return {
    distance: Math.round(distance * 10) / 10,
    rank: band * 100 - within + (9 - rating) / 1000,
    evidence: evidenceAt(terrain, drink.x, drink.y, kindOf(drink)).filter((e) => e.drink.name !== drink.name),
    ...(latest !== undefined ? { rated: latest } : {}),
  };
};

/** Most relevant first; equal ranks keep their order. */
export const byRelevance = (a: { rank: number }, b: { rank: number }) => a.rank - b.rank;
