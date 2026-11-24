import { drinkDatabase, type Drink } from './data';

/**
 * The one way a name finds its drink on the map. Every caller that turns
 * words — a pour, a menu line, a chat assistant's query — into a `Drink`
 * comes through here, so "margarita" means the same drink in the rating sheet, in a menu on
 * Compass and in a chat. It used to be three lookups that disagreed: exact
 * lower case in the pour pipeline, a looser one in the menu screen, this one in
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

/**
 * The drink a stored reference means — a pour's `drink`, a menu item's — by
 * its `slug` when it carries one the catalog still has, and otherwise by its
 * name (`matchDrink`). Every reader of a record goes through this, so a
 * renamed drink or an edited alias does not cut its old pours off from it.
 */
export function drinkOf(ref: { name: string; slug?: string }, drinks: readonly Drink[] = drinkDatabase): Drink | null {
  const bySlug = ref.slug ? drinks.find((d) => d.slug === ref.slug) : undefined;
  return bySlug ?? matchDrink(ref.name, drinks);
}
