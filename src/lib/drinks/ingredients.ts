/**
 * The canonical Ingredients Index — cocktail sensory primitives.
 *
 * One vocabulary shared by three surfaces:
 * 1. Region prose (`INGREDIENT_GROUPS`, `sharedIngredients`): counts what the
 *    verified drinks in a region share from their own entries, never hand-listed.
 * 2. Aversion detection (`detectAversions` in `ingredient-match.ts`): smoke,
 *    bitterness, and anise flags live on the primitives themselves.
 * 3. Directional placement (`placeDirectional` in `ingredient-match.ts`):
 *    estimates a directional `(x, y)` on the palate map for house cocktails on
 *    bar menus that list ingredients without ratios or methods.
 *
 * Directional pulls (`pull: { x, y }`) are calibrated against the 72 verified
 * cocktails in `src/content/drinks/*.md` (checked by
 * `tests/unit/ingredients-placement.test.ts`), analogous to `placement.ts` for
 * wines and beers.
 */

export type IngredientRole =
  | 'base'
  | 'modifier'
  | 'sweetener'
  | 'acid'
  | 'bitter'
  | 'lengthener'
  | 'dairy'
  | 'aromatic';

export interface IngredientFlags {
  smoke?: boolean;
  bitter?: boolean;
  anise?: boolean;
}

export interface IngredientPrimitive {
  /** Stable kebab-case identifier (never a brand name unless iconic). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Structural role in a drink build. */
  role: IngredientRole;
  /** Pattern matching the ingredient across spec cards and bar menus. */
  match: RegExp;
  /** Sensory aversion flags carried by this primitive. */
  flags?: IngredientFlags;
  /**
   * Calibrated directional pull on Rich (−10) ↔ Crisp (+10) and
   * Savory (−10) ↔ Sweet (+10), grounded in verified cocktails.
   */
  pull: { x: number; y: number };
  /**
   * Whether this primitive is counted in region shared-ingredient summaries.
   * Defaults to true for the 40 register groups; false for menu-only additions
   * that do not yet appear in enough verified entries.
   */
  regionGroup?: boolean;
}

/** Structural weight of each role when computing directional placement. */
export const ROLE_WEIGHT: Record<IngredientRole, number> = {
  dairy: 1.4,
  base: 1.3,
  bitter: 1.2,
  modifier: 1.1,
  lengthener: 1.1,
  acid: 1.0,
  sweetener: 0.9,
  aromatic: 0.6,
};

export const INGREDIENT_INDEX: readonly IngredientPrimitive[] = [
  // Fortified wines & aperitifs
  { id: 'sweet-vermouth', name: 'Sweet vermouth', role: 'modifier', match: /sweet vermouth|rosso vermouth|carpano|cocchi di torino|punt e mes/i, pull: { x: -4.5, y: -6.5 } },
  { id: 'dry-vermouth', name: 'Dry vermouth', role: 'modifier', match: /dry (french )?vermouth|french dry vermouth|extra dry vermouth/i, pull: { x: 6.5, y: -5.5 } },
  { id: 'lillet-cocchi', name: 'Lillet or Cocchi Americano', role: 'modifier', match: /lillet|cocchi americano|blanc vermouth/i, pull: { x: 3.5, y: -2.0 } },
  { id: 'sherry', name: 'Sherry', role: 'modifier', match: /sherry|fino|oloroso|amontillado|manzanilla/i, pull: { x: 6.5, y: -6.5 } },
  { id: 'sparkling-wine', name: 'Sparkling wine', role: 'lengthener', match: /prosecco|champagne|sparkling wine|cava|cr[eé]mant/i, pull: { x: 7.5, y: 4.0 } },

  // Bitters & liqueurs
  { id: 'campari', name: 'Campari', role: 'bitter', match: /campari/i, flags: { bitter: true }, pull: { x: 0.0, y: -4.5 } },
  { id: 'aperol', name: 'Aperol', role: 'bitter', match: /aperol/i, flags: { bitter: true }, pull: { x: 4.0, y: 3.5 } },
  { id: 'fernet', name: 'Fernet-Branca', role: 'bitter', match: /fernet/i, flags: { bitter: true }, pull: { x: -6.5, y: -8.0 } },
  { id: 'chartreuse', name: 'Chartreuse', role: 'modifier', match: /chartreuse/i, pull: { x: -1.5, y: -4.0 } },
  { id: 'benedictine', name: 'Bénédictine', role: 'modifier', match: /b[eé]n[eé]dictine/i, pull: { x: -8.0, y: -5.0 } },
  { id: 'maraschino', name: 'Maraschino liqueur', role: 'modifier', match: /maraschino/i, pull: { x: 0.0, y: -0.5 } },
  { id: 'orange-liqueur', name: 'Orange liqueur', role: 'modifier', match: /cointreau|cura[cç]ao|grand marnier|orange liqueur|triple sec/i, pull: { x: -1.0, y: 4.0 } },
  { id: 'creme-de-cacao', name: 'Crème de cacao', role: 'modifier', match: /cr[eè]me de cacao|cacao liqueur/i, pull: { x: -6.5, y: 7.5 } },
  { id: 'coffee-liqueur', name: 'Coffee liqueur', role: 'modifier', match: /coffee liqueur|kahl[uú]a|mr\.? black/i, pull: { x: -7.5, y: 6.0 } },
  { id: 'absinthe', name: 'Absinthe', role: 'aromatic', match: /absinthe|pastis|pernod|ricard|herbsaint|ouzo|sambuca|arak/i, flags: { anise: true }, pull: { x: -2.5, y: -1.0 } },
  { id: 'angostura', name: 'Angostura bitters', role: 'aromatic', match: /angostura/i, flags: { bitter: true }, pull: { x: -5.5, y: -6.0 } },
  { id: 'orange-bitters', name: 'Orange bitters', role: 'aromatic', match: /orange bitters/i, flags: { bitter: true }, pull: { x: 3.0, y: -6.5 } },
  { id: 'peychauds', name: 'Peychaud’s bitters', role: 'aromatic', match: /peychaud/i, flags: { bitter: true }, pull: { x: -8.0, y: -6.5 } },

  // Base spirits
  { id: 'gin', name: 'Gin', role: 'base', match: /\bgin\b/i, pull: { x: 3.0, y: -1.5 } },
  { id: 'vodka', name: 'Vodka', role: 'base', match: /vodka/i, pull: { x: 0.5, y: 2.5 } },
  { id: 'rye', name: 'Rye whiskey', role: 'base', match: /\brye\b/i, pull: { x: -6.0, y: -5.0 } },
  { id: 'bourbon', name: 'Bourbon', role: 'base', match: /bourbon/i, pull: { x: -3.0, y: 2.0 } },
  { id: 'scotch', name: 'Scotch whisky', role: 'base', match: /scotch/i, pull: { x: -7.5, y: -4.5 } },
  { id: 'irish-whiskey', name: 'Irish whiskey', role: 'base', match: /irish whiskey/i, pull: { x: -6.5, y: -0.5 } },
  { id: 'cognac-brandy', name: 'Cognac or brandy', role: 'base', match: /\bcognac\b|aged brandy|\barmagnac\b|\bbrandy\b/i, pull: { x: -6.5, y: 2.0 } },
  { id: 'rum', name: 'Rum', role: 'base', match: /\brum\b|cacha[cç]a/i, pull: { x: 4.5, y: 5.5 } },
  { id: 'tequila', name: 'Tequila', role: 'base', match: /tequila|reposado|blanco|a[nñ]ejo/i, pull: { x: 3.0, y: 3.5 } },
  { id: 'mezcal', name: 'Mezcal', role: 'base', match: /mezcal|espad[ií]n|bacanora|raicilla/i, flags: { smoke: true }, pull: { x: -0.5, y: -1.5 } },

  // Citrus & fruit
  { id: 'lemon', name: 'Lemon juice', role: 'acid', match: /lemon juice|\blemon\b/i, pull: { x: 1.5, y: 3.5 } },
  { id: 'lime', name: 'Lime juice', role: 'acid', match: /lime juice|^whole lime|\blime\b/i, pull: { x: 5.0, y: 3.0 } },
  { id: 'grapefruit', name: 'Grapefruit', role: 'acid', match: /grapefruit/i, pull: { x: 7.0, y: 2.5 } },

  // Sweeteners & texture
  { id: 'sugar-syrup', name: 'Sugar or syrup', role: 'sweetener', match: /simple syrup|sugar cube|\bsugar\b(?!\s+snap\b)|cane sugar|demerara|gomme/i, pull: { x: 1.5, y: 3.0 } },
  { id: 'honey', name: 'Honey', role: 'sweetener', match: /\bhoney\b/i, pull: { x: -4.0, y: 1.5 } },
  { id: 'agave', name: 'Agave nectar', role: 'sweetener', match: /agave/i, pull: { x: 1.0, y: 2.0 } },
  { id: 'grenadine', name: 'Grenadine', role: 'sweetener', match: /grenadine/i, pull: { x: -1.0, y: 7.0 } },
  { id: 'egg-white', name: 'Egg white', role: 'dairy', match: /egg white|aquafaba/i, pull: { x: -2.5, y: 6.0 } },
  { id: 'cream', name: 'Cream', role: 'dairy', match: /heavy cream|\bcream\b|half[- ]and[- ]half/i, pull: { x: -7.5, y: 8.0 } },

  // Herbs & lengtheners
  { id: 'mint', name: 'Mint', role: 'aromatic', match: /\bmint\b|spearmint/i, pull: { x: 7.5, y: 6.0 } },
  { id: 'soda', name: 'Soda water', role: 'lengthener', match: /club soda|sparkling water|sparkling mineral water|soda water|\bsoda\b/i, pull: { x: 7.5, y: 1.0 } },
  { id: 'tonic', name: 'Tonic water', role: 'lengthener', match: /\btonic\b/i, flags: { bitter: true }, pull: { x: 8.0, y: -5.0 } },

  // Menu-only primitives (broaden directional coverage for house cocktails without altering region counts)
  { id: 'amaro', name: 'Amaro', role: 'bitter', match: /\bamaro\b|averna|montenegro|nonino|cynar|suze|gentian|cinchona|mal[oö]rt|bruto americano|amer picon|ramazz?otti/i, flags: { bitter: true }, pull: { x: -3.5, y: -5.5 }, regionGroup: false },
  { id: 'herbal-liqueur', name: 'Herbal liqueur', role: 'modifier', match: /centerbe|genepy|g[eé]n[eé]pi|strega|galliano/i, pull: { x: -1.5, y: -4.0 }, regionGroup: false },
  { id: 'anise-herb', name: 'Anise & herbal leaf', role: 'aromatic', match: /hoja santa|\bfennel\b|star anise|aniseed/i, flags: { anise: true }, pull: { x: 1.5, y: -2.5 }, regionGroup: false },
  { id: 'whiskey', name: 'Whiskey', role: 'base', match: /\bwhiske?y\b/i, pull: { x: -5.5, y: -2.0 }, regionGroup: false },
  { id: 'vermouth', name: 'Vermouth', role: 'modifier', match: /\bvermouth\b/i, pull: { x: 1.0, y: -5.0 }, regionGroup: false },
  { id: 'na-botanical', name: 'Zero-proof botanical', role: 'base', match: /\b(everleaf|pentire|aplos|roots divino|seedlip|ghia|lyre'?s|pathfinder|wilderton|st\.?\s*agrestis|phoney negroni)\b/i, pull: { x: 4.0, y: -1.5 }, regionGroup: false },
  { id: 'peated-whisky', name: 'Peated whisky', role: 'base', match: /peated|\bpeat\b|\bislay\b|laphroaig|ardbeg|lagavulin/i, flags: { smoke: true }, pull: { x: -7.5, y: -5.5 }, regionGroup: false },
  { id: 'pineapple', name: 'Pineapple', role: 'sweetener', match: /pineapple/i, pull: { x: 3.5, y: 6.5 }, regionGroup: false },
  { id: 'passionfruit', name: 'Passion fruit', role: 'sweetener', match: /passion ?fruit|chinola/i, pull: { x: 4.5, y: 6.0 }, regionGroup: false },
  { id: 'cranberry', name: 'Cranberry', role: 'acid', match: /cranberry/i, pull: { x: 5.5, y: 4.0 }, regionGroup: false },
  { id: 'orange-juice', name: 'Orange juice', role: 'sweetener', match: /orange juice|blood orange/i, pull: { x: 3.0, y: 6.0 }, regionGroup: false },
  { id: 'ginger', name: 'Ginger', role: 'lengthener', match: /\bginger\b/i, pull: { x: 5.0, y: 2.5 }, regionGroup: false },
  { id: 'orgeat', name: 'Orgeat', role: 'sweetener', match: /orgeat|almond syrup/i, pull: { x: -1.5, y: 6.5 }, regionGroup: false },
  { id: 'coconut', name: 'Coconut', role: 'dairy', match: /coconut/i, pull: { x: -4.0, y: 7.5 }, regionGroup: false },
  { id: 'elderflower', name: 'Elderflower', role: 'modifier', match: /elderflower|st\.?[- ]germain/i, pull: { x: 5.5, y: 5.5 }, regionGroup: false },
  { id: 'espresso', name: 'Espresso or coffee', role: 'modifier', match: /espresso|cold brew|\bcoffee\b/i, pull: { x: -6.0, y: 4.0 }, regionGroup: false },
  { id: 'cucumber', name: 'Cucumber', role: 'aromatic', match: /cucumber/i, pull: { x: 7.5, y: 0.5 }, regionGroup: false },
  { id: 'savory-herb', name: 'Savory herbs', role: 'aromatic', match: /\b(basil|rosemary|thyme|sage|cilantro|tarragon)\b/i, pull: { x: 4.5, y: -2.5 }, regionGroup: false },
  { id: 'chile', name: 'Chile', role: 'aromatic', match: /\b(jalape[nñ]o|habanero|ancho|chile|chili|serrano|cayenne)\b/i, pull: { x: 2.5, y: -2.0 }, regionGroup: false },
  { id: 'olive-brine', name: 'Olive brine', role: 'aromatic', match: /olive brine|brine|\bdirty\b|saline/i, pull: { x: 6.5, y: -8.0 }, regionGroup: false },
];

/** The 40 register ingredient groups counted on region pages (`tests/unit/region-content.test.ts`). */
export const INGREDIENT_GROUPS: readonly { name: string; match: RegExp }[] = INGREDIENT_INDEX.filter(
  (p) => p.regionGroup !== false
).map(({ name, match }) => ({ name, match }));

/** An ingredient is "shared" once this many of a region's drinks carry it. */
export const SHARED_MIN = 3;

export interface SharedIngredient {
  name: string;
  /** How many of the drinks carry it. */
  count: number;
}

/**
 * Ingredient groups carried by at least `SHARED_MIN` of `drinks`, most common
 * first. Each drink counts once per group, however many of its ingredients
 * match.
 */
export function sharedIngredients(
  drinks: readonly { ingredients: readonly { name: string }[] }[]
): SharedIngredient[] {
  return INGREDIENT_GROUPS.map(({ name, match }) => ({
    name,
    count: drinks.filter((d) => d.ingredients.some((i) => match.test(i.name))).length,
  }))
    .filter((g) => g.count >= SHARED_MIN)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
