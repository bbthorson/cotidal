/**
 * The names and vocabularies records are written with, and nothing else: no
 * schema and no dependency, so the browser can import it without pulling in
 * the validators (records.ts). records.ts re-exports all of it.
 */

export const DEFS_LEXICON = 'app.cotidal.defs';
export const PALATE_COLLECTION = 'app.cotidal.palate';
export const PALATE_RKEY = 'self';
export const POUR_COLLECTION = 'app.cotidal.pour';
export const MENU_COLLECTION = 'app.cotidal.menu';
export const RECIPE_COLLECTION = 'app.cotidal.recipe';
export const VENUE_COLLECTION = 'app.cotidal.venue';
export const MAKER_COLLECTION = 'app.cotidal.maker';
export const ELICITATION_COLLECTION = 'app.cotidal.elicitation';

/**
 * The namespace before the rename to Cotidal. Read-only: palates and pours
 * written under it are still read (publish.ts, public-read.ts) so nobody's
 * map empties, but nothing is written there and those records are never
 * rewritten or deleted by the app. The next palate write lands under
 * `app.cotidal.*`.
 */
export const LEGACY_PALATE_COLLECTION = 'app.crystalcoupe.palate';
export const LEGACY_POUR_COLLECTION = 'app.crystalcoupe.pour';

/** Records held at a fixed key, one per repo. */
export const SELF_RKEY = 'self';

export const DEVIATIONS = [
  'too-sweet', 'not-sweet-enough',
  'too-sour', 'not-sour-enough',
  'too-bitter', 'too-smoky', 'too-anise',
  'too-rich', 'too-crisp',
  'too-flat', 'too-fizzy',
] as const;
export type Deviation = (typeof DEVIATIONS)[number];

/**
 * Check-all-that-apply notes, as stored. Stable ids rather than the labels
 * shown (`pour.cata` in copy.ts), so rewording a label does not split the
 * data. Each id is its label slugified, which is also how a pour written
 * before the ids — when the label itself was stored — is read back.
 */
export const CATA = [
  'bright-citrus', 'lime-peel', 'stone-fruit', 'dark-cherry',
  'campfire-smoke', 'botanical-herb', 'baking-spice', 'toasted-oak',
  'floral-blossom', 'bittersweet-cocoa', 'briny-mineral', 'rich-velvet-body',
] as const;
export type CataNote = (typeof CATA)[number];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** A stored note as its id: an id stays, a pre-id label maps, anything else is kept as written. */
export function cataId(note: string): string {
  if ((CATA as readonly string[]).includes(note)) return note;
  const slug = slugify(note);
  return (CATA as readonly string[]).includes(slug) ? slug : note;
}
