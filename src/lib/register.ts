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
