import { getCollection, getEntry } from 'astro:content';
import { drinkDatabase } from './data';
import { sharedIngredients } from './ingredients';
import { quadrantIdFor, type QuadrantId } from './quadrant';
import type { RegionEntryData } from './region-entry';

/**
 * A region's entry as plain data (`region-entry.ts`). Which drinks live in
 * it is the map's answer, never the entry's; what they share is counted from
 * their own entries. A region with no entry still has its counts.
 */
export async function loadRegionEntry(id: QuadrantId): Promise<RegionEntryData> {
  const entry = await getEntry('regions', id);
  const drinks = (await getCollection('drinks')).filter((e) => {
    const d = drinkDatabase.find((item) => item.name === e.data.name);
    return d && quadrantIdFor(d.x, d.y) === id;
  });
  return {
    id,
    html: entry?.rendered?.html ?? '',
    documented: entry?.data.documented ?? [],
    claimed: entry?.data.claimed ?? [],
    sources: entry?.data.sources ?? [],
    shared: sharedIngredients(drinks.map((e) => e.data)),
    writtenUp: drinks.length,
  };
}
