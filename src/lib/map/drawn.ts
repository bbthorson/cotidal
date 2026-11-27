import { drinkDatabase, type Drink } from '../drinks/data';

/**
 * Which drinks the map draws. The library holds more drinks than the map can
 * show and still be read, and always will: what a view draws is chosen, never
 * everything. With nothing to filter by, the map draws the staples; a filter
 * (a bar's menu, a region, a type, the edge of what you know) draws its own
 * drinks instead; and the drinks a view is about (the open one, your pours, a
 * drink's neighbours, your menu) are drawn whatever the filter.
 * (docs/map-first.md, What the map draws.)
 */

/** The most marks one view draws from a filter, so no filter can crowd the map as the whole library would. */
export const MAX_MARKS = 60;

/**
 * The drinks drawn when nothing filters the map: the ones most people know or
 * would be asked about, spread over all four regions and every kind of drink,
 * no two at one point (`tests/unit/map-drawn.test.ts`). By slug, which never
 * changes. A drink earns a place here by being ordered, not by being good.
 */
export const STAPLE_SLUGS = [
  // Crisp · Sweet
  'aperol-spritz', 'daiquiri', 'margarita', 'mojito', 'paloma', 'moscow-mule', 'tom-collins',
  'french-75', 'whiskey-sour', 'mai-tai', 'cuba-libre', 'prosecco', 'moscato-d-asti',
  // Rich · Sweet
  'espresso-martini', 'white-russian', 'cosmopolitan', 'pina-colada', 'irish-coffee', 'amaretto-sour',
  'sidecar', 'clover-club', 'mint-julep', 'port-tawny', 'milk-stout',
  // Crisp · Savory
  'gin-and-tonic', 'dry-martini', 'dirty-martini', 'vodka-soda', 'gimlet', 'bloody-mary', 'michelada',
  'last-word', 'sancerre', 'pinot-grigio', 'provence-rose', 'champagne-brut', 'pinot-noir-burgundy',
  'pilsner-german', 'ipa-west-coast', 'hefeweizen',
  // Rich · Savory
  'negroni', 'old-fashioned', 'manhattan', 'boulevardier', 'sazerac', 'penicillin', 'black-russian',
  'guinness', 'islay-scotch', 'cabernet-sauvignon-napa', 'malbec-mendoza', 'chardonnay-oaked',
] as const;

export const staples: readonly Drink[] = STAPLE_SLUGS.flatMap((slug) => drinkDatabase.filter((d) => d.slug === slug));

const stapleNames: ReadonlySet<string> = new Set(staples.map((d) => d.name));

export function isStaple(drink: { name: string }): boolean {
  return stapleNames.has(drink.name);
}

/**
 * At most `MAX_MARKS` of a filter's drinks: all of them when they fit;
 * otherwise the staples among them first, then the rest in the order given,
 * so a filter ranked by your ground keeps its highest.
 */
export function capMarks(drinks: readonly Drink[]): Drink[] {
  if (drinks.length <= MAX_MARKS) return [...drinks];
  return [...drinks.filter(isStaple), ...drinks.filter((d) => !isStaple(d))].slice(0, MAX_MARKS);
}

export interface DrawnView {
  /** A bar's menu, by drink name: it alone is drawn. */
  pins?: readonly string[] | null;
  /** A filter's drinks, already capped (`capMarks`): drawn in place of the staples. */
  focus?: ReadonlySet<string> | null;
  /** Drawn whatever the filter: the open drink, your pours, the drinks a view names. */
  also?: Iterable<string | null | undefined>;
}

/** The names of the drinks a view draws. */
export function drawnDrinks({ pins = null, focus = null, also = [] }: DrawnView): Set<string> {
  const out = new Set<string>(pins ?? focus ?? stapleNames);
  for (const name of also) if (name) out.add(name);
  return out;
}
