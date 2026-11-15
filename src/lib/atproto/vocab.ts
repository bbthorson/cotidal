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
 * A bar's permissioned space (`app.cotidal.bar.json`, docs/spaces.md). Its
 * authority is the venue's DID, and a venue has one, so the key is `self`.
 */
export const BAR_SPACE_TYPE = 'app.cotidal.bar';
export const BAR_SPACE_KEY = 'self';

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
 * data.
 */
export const CATA = [
  'bright-citrus', 'lime-peel', 'stone-fruit', 'dark-cherry',
  'campfire-smoke', 'botanical-herb', 'baking-spice', 'toasted-oak',
  'floral-blossom', 'bittersweet-cocoa', 'briny-mineral', 'rich-velvet-body',
] as const;
export type CataNote = (typeof CATA)[number];

/** A drink's base spirit, as stored on `drinkRef.baseSpirit`. Labels: `pour.spirits` in copy.ts. */
export const BASE_SPIRITS = [
  'bourbon', 'rye', 'scotch', 'gin', 'rum', 'tequila',
  'mezcal', 'vodka', 'brandy', 'amaro', 'non-alcoholic',
] as const;
export type BaseSpirit = (typeof BASE_SPIRITS)[number];

/** The glass, as stored on a pour or a recipe. Labels: `pour.glasses` in copy.ts. */
export const GLASSWARE = ['coupe', 'nick-and-nora', 'rocks', 'highball', 'martini', 'tiki-mug'] as const;
export type Glassware = (typeof GLASSWARE)[number];

/** Tags a drink carries and a palate weighs (`vibeTagWeights`). */
export const VIBE_TAGS = [
  'bold', 'classic', 'visual', 'social', 'comfort', 'complex', 'sweet',
  'messy', 'polarizing', 'prestige', 'warm', 'spice', 'crushable',
] as const;

/**
 * The anchors of the generalized Labeled Magnitude Scale, where a pour's
 * perceived intensities are placed (0–100, whole points). Positions are the
 * published ones (Bartoshuk et al.) rounded to integers: 1.4, 6, 17, 34.7,
 * 52.5, 100. Labels: `pour.glms` in copy.ts.
 */
export const GLMS_ANCHORS = [
  { id: 'barely-detectable', at: 1 },
  { id: 'weak', at: 6 },
  { id: 'moderate', at: 17 },
  { id: 'strong', at: 35 },
  { id: 'very-strong', at: 53 },
  { id: 'strongest-imaginable', at: 100 },
] as const;
export type GlmsAnchor = (typeof GLMS_ANCHORS)[number]['id'];

/** The intensities the pour form asks for, in order. All are fields of `perceivedIntensities`. */
export const ASKED_INTENSITIES = ['sweetness', 'sourness', 'bitterness', 'alcoholHeat'] as const;
export type AskedIntensity = (typeof ASKED_INTENSITIES)[number];
