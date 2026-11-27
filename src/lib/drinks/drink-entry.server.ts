import { getCollection, type CollectionEntry } from 'astro:content';
import type { DrinkEntryData } from './drink-entry';

/** An entry of the drinks collection as plain data, its prose rendered (`drink-entry.ts`). */
export function drinkEntryData(entry: CollectionEntry<'drinks'>): DrinkEntryData {
  const d = entry.data;
  return {
    slug: entry.id,
    name: d.name,
    title: d.title,
    family: d.family,
    summary: d.summary,
    html: entry.rendered?.html ?? '',
    ingredients: d.ingredients,
    build: d.build,
    documented: d.documented,
    claimed: d.claimed,
    sources: d.sources,
  };
}

/** The entry for a slug, or null for a drink with no write-up. */
export async function loadDrinkEntry(slug: string): Promise<DrinkEntryData | null> {
  const entry = (await getCollection('drinks')).find((e) => e.id === slug);
  return entry ? drinkEntryData(entry) : null;
}
