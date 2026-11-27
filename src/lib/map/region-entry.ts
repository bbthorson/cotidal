import type { Sourced } from '../drinks/drink-entry';
import type { QuadrantId } from './coordinates';

/**
 * A region's write-up as the map's card draws it under the region's drinks
 * (`RegionEntry.tsx`): its prose, rendered at build time, what its written-up
 * drinks share, and what is on the record. Fetched prerendered when a region
 * is opened (`regionEntryPath`), or drawn with the page (`/map?region=`).
 */
export interface RegionEntryData extends Sourced {
  id: QuadrantId;
  html: string;
  /** Ingredients its written-up drinks share, counted from their entries (`sharedIngredients`). */
  shared: { name: string; count: number }[];
  /** How many written-up drinks the counts are out of. */
  writtenUp: number;
}

export const regionEntryPath = (id: QuadrantId) => `/regions/${id}.json`;
