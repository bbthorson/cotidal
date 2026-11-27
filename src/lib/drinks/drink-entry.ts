/**
 * A drink's write-up as the card draws it (`DrinkEntry.tsx`): everything on
 * its entry in `src/content/drinks/`, with the prose rendered to HTML at
 * build time. Plain data, so the static page and the map's card draw the
 * same thing: the page reads it on the server (`drink-entry.server.ts`), the
 * island fetches it prerendered (`drinkEntryPath`) when a drink is opened.
 */

export interface Attested {
  claim: string;
  source: string;
}
export interface Asserted {
  claim: string;
  note: string;
}
export interface Reference {
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

/** What drinks and regions share: what is on the record, what is only told, and where it comes from. */
export interface Sourced {
  documented: Attested[];
  claimed: Asserted[];
  sources: Reference[];
}

export interface DrinkEntryData extends Sourced {
  slug: string;
  /** The join key: a `name` in `drinkDatabase`. */
  name: string;
  title: string;
  family: string;
  summary: string;
  /** The entry's prose, rendered from its own Markdown at build time. */
  html: string;
  ingredients: { amount?: string; name: string; optional: boolean }[];
  build: { glass: string; method: string; garnish?: string };
}

/** Where the island fetches a drink's entry: prerendered beside its page. */
export const drinkEntryPath = (slug: string) => `/drinks/${slug}.json`;
