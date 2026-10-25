/**
 * What the menu needs from the drinks register (src/content/drinks/): a
 * printable name, the build as one line, and where the full entry lives.
 * Built server-side in src/pages/taste.astro and handed to the island, so
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
 * The catalog key a pour stores as `drink.slug`: the drink's entry in the
 * register (`/drinks/<slug>`), found by the same name join as everything else.
 * `undefined` for a drink the register has no entry for — a slug made up from
 * the name would name a page that does not exist (`daiquiri-classic` for
 * `/drinks/daiquiri`).
 */
export function catalogSlug(register: Register, drinkName: string): string | undefined {
  const wanted = drinkName.trim().toLowerCase();
  const name = Object.keys(register).find((n) => n.toLowerCase() === wanted);
  return name ? register[name].slug : undefined;
}
