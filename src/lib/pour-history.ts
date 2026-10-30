import type { PourRecord } from '@/lib/atproto/records';

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
