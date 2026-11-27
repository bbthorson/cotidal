---
summary: Voice, the region names and app vocabulary, what copy may and may not claim, the palette's intent, the mark and share cards, and how to write interface words.
read_when: Writing or changing any interface copy, naming something, or touching the mark, icons or share cards.
---

# Brand

## Voice

**Cold instrument, warm secret.** The system is precise and restrained; the
reveals (your coordinate appearing, a pour moving it) are where it gets warm.
Speakeasy is the cocktail default and saturated; an instrument is ownable and
suits a product that is actually rigorous. Printed matter, not mood lighting:
a menu, a specimen card, a wine list.

- **Elegant is restraint.** Typography and space, not ornament.
- **Bold is one move per screen.** On a map page it is the map; on a reading
  page, the title plate.
- **Mysterious is withholding** how, never what: the front door is the map,
  regions and axes named, a sample palate gaining ratings on it.

## Vocabulary

Internal words ("triangulation", "calibration", *latent*) never appear in the
interface. User-facing, the idea is a **coordinate**: two axes, four regions,
named rather than explained (`quadrants` in `src/lib/copy/`):

| Region | Axis | Gloss |
|---|---|---|
| **The Deep** | Rich · Savory | Dark, bitter, unhurried. Negronis, Manhattans, amaro, peat. |
| **The Salt Line** | Crisp · Savory | Dry, mineral, exact. Martinis, fino sherry, a gin and tonic. |
| **The Eddy** | Rich · Sweet | Dense, warm, slow. Port, cream, coffee. |
| **The Surf** | Crisp · Sweet | Bright, cold, quick. Spritzes, daiquiris, mojitos. |

A gloss names only drinks the map places in that region. The names are one
register (water and motion, as on a chart). They name parts of the map, never
a person. The ids are URLs (`/map?region=<id>`).

Chart words carry the brand (*the chart*, *drift*, *reckoned*), but links,
buttons and navigation use plain words ("Map", "Sign in"), and a chart word
must be one a reader already knows (not *rutter*). Never *ahoy*, pirates,
treasure, setting sail.

| Word | Means | |
|---|---|---|
| **Map** | The app: your terrain, every drink, the card | A chart you read, not a street map |
| **You lean** | Your taste in the axes' words, a phrase per hill | Never a region's name for a person |
| **Pick a drink** | A bar's menu on the map, and the offer to open it | Never *order*: the bartender takes the order |
| **Rate** | Open rating for a drink you had | Its button is **Log it**; **Done** closes |
| **Log** | Where a rated pour lands | Never *ledger* in the interface |
| **Sign in / Sign out** | Bluesky sign-in | Plain words: navigation |
| **Your track** | The way your coordinate came | Not *wake*, not *course* |
| **Moved** / **held** | What one pour did | "Moved 0.7", or "held" for a 4–6. Never *fix* |

## Claims

**Copy says only what the product does today.** The register separates what
is on the record from what is told; it verifies nothing. Anything not built
says **Later:**. No other app reads these records yet, so "an open record"
says *can*.

**Drift is your ratings, nothing else.** A rating of 7+ pulls toward the
drink, 3 or less pushes away, "what was off" nudges, and steps shrink as the
point grows surer. Nothing tracks season, hour or weather; copy never implies
it does.

**Never say** *verified*, *forever*, *no trackers*, *no algorithm*, or any
word from the code.

**The AT Protocol is plumbing.** To a drinker it is "your own Bluesky
account". Name the protocol only where the reader needs it (For bars, chat
assistants), compared to things people know (a blog's feed), never crypto.

## Palette

Tokens and values: `docs/design-system.md`, Token Dictionary. The intent:
**warm paper**, not obsidian; ink on stock. The ink is forest green, nearly
subliminal at body size, the difference between a printed menu and a
laser-printed handout. **Terracotta** against **deep forest** is the tension
(warm against cool, both muted); sage is the third, used flat and large. Pale
water (`--shoal`) is where you probably are, and nothing else. There is no
dark theme. Light presses rather than glows: `shadow-bar` lifts a sheet,
`shadow-mcm` is a hard letterpress offset.

Form: hairline rules over boxes (the heavier rule is `--foreground`), square
corners, dot leaders for name → amount.

## The mark and the figure

Both are a **cotidal chart**: lines from an amphidrome, the one point where
the tide doesn't rise, joining places at the same phase. It is the name drawn
literally and the product's geometry: a zero point at the map's centre.

- **The figure** (`ChartFigure.astro`, the share cards): a line for every
  hour, every third an index line (the four region boundaries), dashed
  co-range rings, the Surf band (0h–3h) in terracotta. Nothing else: a new
  element has to be part of the map (a decorative moon was removed for that).
- **The mark** (`Monogram.astro` and the icon files): the same chart as a
  circular dial, legible at 16px. Drawn once in `src/lib/mark.ts` from
  `markGeometry`; `npm run images` writes the icons, which carry tokens as hex
  (`tests/unit/mark.test.ts` checks them against `globals.css`). On dark
  browser chrome, `icon.svg` draws in paper and `favicon.ico` fills its disc
  in paper.
- **Share cards** are what a link unfurls into: the site's card by default,
  and a region's card for `/map?region=<id>`. A person's link uses the site's
  card: a coordinate moves with every pour and a scraper's cached image does
  not. Each card is a page (`/share/<card>`) captured to `public/share/` by
  `npm run images` after a build; re-run it when the chart, a token or a
  card's words change.

## Rules

Everything user-facing is a function of tokens, schema, content and state,
none authored inside a component.

1. **No raw values in components.** Colours, sizes and shadows are tokens.
2. **No hard-coded copy in components.** Strings live in `src/lib/copy/`;
   the quiz questions (beside their scoring) and the prose (`src/content/`)
   are the exceptions.
3. **Fonts are tokens too** (`--font-*` in `globals.css`).

1 and 2 are lint errors (`docs/design-system.md`, Strict Enforcement
Architecture); 3 is a convention.

## Writing the words

Short, concrete, a little dry, said to one person: *"Cold enough to ache."*
*"Same bar, different stools."* *"Nobody by that name."*

- **Say the thing.** "Pastis, fennel, absinthe", not "herbaceous botanical
  aromatics".
- **No stacked adjectives or Title Case pairs.** "Sharp and mineral".
- **Don't announce the contrast** ("not a quiz result, a record"). Say what
  it is.
- **Sparing with dashes**; a colon or full stop usually does it.
- **Labels are not sentences:** no full stop on a button or option.
- **"Actually" only against what is merely claimed.**
- **Say what it is, not what they'll feel.** No *delicious*, *refreshing*,
  *perfect*, *magical*.
- **Buttons are sentence case and start with a verb:** "Find your
  coordinate", "Log this pour".
- **Words for people, not the system:** an error says what to do next
  ("Couldn't save your coordinate. Try again."), never a field name.
