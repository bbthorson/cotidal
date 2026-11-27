import type { PourRecord } from '@/lib/atproto/records';
import { readGeo } from '@/lib/atproto/location';
import { drinkOf } from '@/lib/drinks/search';
import { metresBetween } from '@/lib/drinks/osm';

/** Folded for matching: case and accents aside. */
export const foldName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export interface BarVisits {
  /** As first typed, newest pour's spelling. */
  name: string;
  pours: number;
  /** ISO time of the latest pour there. */
  last: string;
}

/**
 * The bars your pours name, most recent first. "Attaboy" and "attaboy " are
 * one bar. Pours at home are not at a bar.
 */
export function barsFromPours(pours: PourRecord[]): BarVisits[] {
  const byName = new Map<string, BarVisits>();
  for (const p of pours) {
    const name = p.isHomePour ? null : p.venue?.entity?.name?.trim();
    if (!name) continue;
    const bar = byName.get(foldName(name)) ?? { name, pours: 0, last: p.createdAt };
    bar.pours += 1;
    if (p.createdAt > bar.last) bar.last = p.createdAt;
    byName.set(foldName(name), bar);
  }
  return [...byName.values()].sort((a, b) => b.last.localeCompare(a.last));
}

/** Names of the bars you have poured at, most recent first: the "Recently" chips. */
export function recentBarNames(pours: PourRecord[], limit?: number): string[] {
  const names = barsFromPours(pours).map((b) => b.name);
  return limit === undefined ? names : names.slice(0, limit);
}

/** The latest pour of each drink on the map, by its name on the map. A pour of a drink with no match is left out. */
export function lastPourByDrink(pours: PourRecord[]): Map<string, PourRecord> {
  const byName = new Map<string, PourRecord>();
  for (const p of pours) {
    const drink = drinkOf(p.drink);
    if (!drink) continue;
    const prev = byName.get(drink.name);
    if (!prev || new Date(p.createdAt) > new Date(prev.createdAt)) byName.set(drink.name, p);
  }
  return byName;
}

/** How near a pour's recorded point must be to a bar on the map to count as poured there. */
const SAME_BAR_METRES = 60;

/**
 * Which bars on the street map you have poured at, and how often: by name, or
 * by where the pour said the bar was (a pour picked from that map records it).
 * Bars with no pours are absent.
 */
export function poursAtBars(
  bars: { id: string; name: string; lat: number; lon: number }[],
  pours: PourRecord[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bars) {
    const n = pours.filter((p) => {
      if (p.isHomePour || !p.venue) return false;
      const at = readGeo(p.venue.address);
      return foldName(p.venue.entity.name) === foldName(b.name) || (at !== null && metresBetween(at, b) < SAME_BAR_METRES);
    }).length;
    if (n > 0) counts.set(b.id, n);
  }
  return counts;
}

/** What the log adds up to: how many pours and bars, the first pour, and the best-rated (of a tie, the one nearest the top of the list). */
export function logTotals(pours: PourRecord[]): {
  pours: number;
  bars: number;
  first: PourRecord | null;
  best: PourRecord | null;
} {
  return {
    pours: pours.length,
    bars: barsFromPours(pours).length,
    first: pours.length > 0 ? pours[pours.length - 1] : null,
    best: pours.reduce<PourRecord | null>((top, p) => (!top || p.rating.hedonic > top.rating.hedonic ? p : top), null),
  };
}
