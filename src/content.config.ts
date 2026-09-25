import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Drink entries — the prose corpus behind `/drinks`.
 *
 * Two rules hold this to the discipline in AGENTS.md:
 *
 * 1. **No coordinates here.** `src/lib/data.ts` is the single source of truth
 *    for where a drink sits on the map. An entry joins to it by `name`, and
 *    `tests/drink-content.spec.ts` fails if the join breaks. Copying `x`/`y`
 *    into frontmatter would be the fourth instance of the drift this codebase
 *    keeps producing.
 *
 * 2. **`documented` is required and non-empty.** Cocktail origin stories are
 *    overwhelmingly unsourced retelling. An entry may carry as much lore as it
 *    likes in `claimed`, but it cannot be published without at least one thing
 *    that is actually attested — see `docs/brand.md` on the instrument voice.
 *
 * Prose is written from primary sources rather than adapted from any single
 * reference text, so nothing here inherits a share-alike obligation.
 */

/** Classic families. Adding one is a deliberate act — extend the enum first. */
export const DRINK_FAMILIES = [
  'old-fashioned',
  'martini',
  'manhattan',
  'sour',
  'highball',
  'aperitivo',
  'dessert',
  'wine',
  'fortified-wine',
  'beer',
  'spirit',
] as const;

const ingredient = z.object({
  /** As written on a spec card, e.g. `3/4 oz`. Absent for "to top". */
  amount: z.string().optional(),
  name: z.string(),
  optional: z.boolean().default(false),
});

/** Something with a citation behind it. */
const attested = z.object({
  claim: z.string(),
  source: z.string(),
});

/** Something people say. The note is why it does not qualify above. */
const asserted = z.object({
  claim: z.string(),
  note: z.string(),
});

const reference = z.object({
  title: z.string(),
  author: z.string().optional(),
  year: z.number().int().min(1700).max(2100).optional(),
  url: z.string().url().optional(),
});

const drinks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/drinks' }),
  schema: z.object({
    /** Join key. Must equal a `name` in `drinkDatabase` exactly. */
    name: z.string(),
    /** Display heading. Often tidier than the join key. */
    title: z.string(),
    family: z.enum(DRINK_FAMILIES),
    /** One line. Shown on the index. */
    summary: z.string().max(200),
    build: z.object({
      glass: z.string(),
      method: z.string(),
      garnish: z.string().optional(),
    }),
    ingredients: z.array(ingredient).default([]),
    documented: z.array(attested).min(1),
    claimed: z.array(asserted).default([]),
    sources: z.array(reference).min(1),
  }),
});

export const collections = { drinks };
