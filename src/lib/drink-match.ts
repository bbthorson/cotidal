import { drinkDatabase, type Drink } from './data';

/**
 * The one way a name finds its drink on the map. Every caller that turns
 * words — a pour, a menu line, a chat assistant's query — into a `Drink`
 * comes through here, so "margarita" means the same drink on /rate, in the
 * harbour and in a chat. It used to be three lookups that disagreed: exact
 * lower case in the pour pipeline, a looser one in the harbour, this one in
 * the MCP tools.
 */

/** Case, accents, apostrophes, "&" and punctuation folded away. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "Daiquiri (Classic)" → "daiquiri". No two drinks share one (tests/unit/drink-match.test.ts). */
export function baseName(name: string): string {
  return normalizeName(name.replace(/\([^)]*\)/g, ' '));
}

/**
 * The drink a name means: its full name, its name without the parenthetical,
 * or one of its `aliases`. Nothing looser, because a menu item matched to the
 * wrong drink would be ranked with confidence it has not earned, and a pour
 * matched to the wrong drink would move the coordinate the wrong way.
 */
export function matchDrink(input: string, drinks: readonly Drink[] = drinkDatabase): Drink | null {
  const wanted = normalizeName(input);
  if (!wanted) return null;
  return (
    drinks.find((d) => normalizeName(d.name) === wanted) ??
    drinks.find((d) => baseName(d.name) === wanted) ??
    drinks.find((d) => d.aliases?.some((a) => normalizeName(a) === wanted)) ??
    null
  );
}
