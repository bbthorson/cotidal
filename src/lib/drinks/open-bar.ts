/** An open bar stays active on the device for a few hours unless explicitly left. */
export const OPEN_BAR_TTL_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;

/** True when a persisted open bar is still within the active session window. */
export function isOpenBarFresh(openedAt: string | undefined, now = Date.now()): boolean {
  if (!openedAt) return false;
  const then = Date.parse(openedAt);
  if (!Number.isFinite(then)) return false;
  const elapsed = now - then;
  return elapsed >= 0 && elapsed < OPEN_BAR_TTL_HOURS * HOUR_MS;
}

export interface RisenDrink {
  name: string;
  /** New 1-based rank on the bar's menu. */
  rank: number;
  /** How many places it climbed. */
  climbed: number;
}

/**
 * Which drink rose on a bar's ranked menu after a pour. Picks the highest-ranked
 * drink (excluding the one just rated) whose position improved; returns null if
 * no other drink moved up.
 */
export function risenDrink(
  before: readonly string[],
  after: readonly string[],
  ratedDrink: string
): RisenDrink | null {
  const rated = ratedDrink.toLowerCase();
  const prevIndex = new Map<string, number>();
  before.forEach((name, i) => prevIndex.set(name.toLowerCase(), i));

  let best: RisenDrink | null = null;
  for (let i = 0; i < after.length; i++) {
    const name = after[i];
    if (name.toLowerCase() === rated) continue;
    const prev = prevIndex.get(name.toLowerCase());
    if (prev !== undefined && i < prev) {
      const climbed = prev - i;
      if (!best || i + 1 < best.rank) {
        best = { name, rank: i + 1, climbed };
      }
    }
  }
  return best;
}
