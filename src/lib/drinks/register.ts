import { matchDrink } from './search';

/**
 * What the menu needs from the drinks register (src/content/drinks/): a
 * printable name, the build as one line, and where the full entry lives.
 * Built server-side by `loadRegister` (register.server.ts) and handed to the island, so
 * the island never imports the content collection itself.
 */
export interface RegisterEntry {
  slug: string;
  title: string;
  /** "Gin · Campari · Sweet vermouth" — required ingredients only. */
  build: string;
}

/** Keyed by `name`, the join key shared with `drinkDatabase`. */
export type Register = Record<string, RegisterEntry>;

/**
 * The catalog key a pour stores as `drink.slug`: the slug of the drink the
 * name means ("margarita" is the Tommy's), as every lookup is. Every drink on
 * the map has one, whether or not the register has written it up;
 * `undefined` only for a drink the map does not know.
 */
export function catalogSlug(drinkName: string): string | undefined {
  return matchDrink(drinkName)?.slug;
}

/** The printed name for a drink: its register title, or the name it goes by on the map. */
export function titleOf(register: Register, drinkName: string): string {
  return register[drinkName]?.title ?? drinkName;
}
