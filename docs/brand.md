# Brand

Superseded `docs/blueprint.md`, which specified Rust / Cream / Olive while
`AGENTS.md` specified "Mystic Pharmacy" sage and terracotta and the CSS
actually shipped amber on charcoal. One definition now, and it is the CSS.

## Voice

**Cold instrument, warm secret.** The system is precise and restrained; the
*reveals* — your coordinate appearing, an archetype naming itself — are where
it gets strange and warm.

The brief was elegant, bold, and a little mysterious. Applied to cocktails
that triad lands on **speakeasy** by default, and speakeasy is saturated. The
instrument reading is the ownable one, and it suits a product that is actually
rigorous.

Amber on obsidian *was* the speakeasy default this document warned about. The
palette below is the correction: printed matter rather than mood lighting —
a menu, a specimen card, a wine list. Elegant is easier to hold on paper,
because paper has no glow to hide behind.

- **Elegant is restraint.** Typography and space, not ornament.
- **Bold is one move per screen.** Something is allowed to be big.
- **Mysterious is withholding.** Show the map before labelling the axes. A
  magician who opens with "I will now use misdirection" has no act.

## Vocabulary

**"Triangulation" is internal only.** It is an accurate name for the algorithm
— independent bearings locating a point — and it stays in `AGENTS.md` and in
the code. It must not appear in the interface: it describes our process rather
than the reader's benefit, and it explains the trick before performing it.

User-facing, the same idea is a **coordinate**. Two axes, four quadrants,
named rather than explained:

| Quadrant | Axis | |
|---|---|---|
| **The Deep** | Rich · Savory | Dark, bitter, unhurried. Negronis, Manhattans, amaro, peat. |
| **The Salt Line** | Crisp · Savory | Dry, mineral, exact. Martinis, fino sherry, a gin and tonic. |
| **The Eddy** | Rich · Sweet | Dense, warm, slow. Port, cream, coffee. |
| **The Surf** | Crisp · Sweet | Bright, cold, quick. Spritzes, daiquiris, mojitos. |

Each gloss names drinks, because a reader recognises a Negroni before they
recognise "rich and savory". The drinks named must be ones the map puts in
that region (`drinkDatabase`); a gloss that names a drink placed elsewhere
is the drift this codebase keeps producing.

The names are one vocabulary — water and motion, as on a chart — rather than
the ember / vault / orchard set they replaced, which mixed fire, a room and a
field. They are still a little astrological: a coordinate you *have*, a place
you belong, glossed but never justified. They live in `src/lib/copy.ts` and
can be replaced in one file; the ids are URLs, so a rename adds a redirect
(`astro.config.mjs`, `formerQuadrantIds`).

Chart words carry the brand — *the chart*, *drift*, *reckoned*, *within
hail*, *come aboard* — but links and navigation use plain words ("Drinks"): a
reader should never have to decode where a link goes. A chart word has to be
one a reader already knows. *The rutter* (a mariner's book of sailing
directions) named the drinks register until a reader pointed out that nobody
knows it; it is gone from the interface.

The register is solitary hydrography, not dress-up: never *ahoy*, pirates,
treasure, setting sail or shanties.

The app's own words follow the same rule: plain enough to need no decoding,
nautical where a plain word allows it.

| Word | Means | |
|---|---|---|
| **Radio** | The feed | How you hear the boats around you |
| **Compass** | The map and your menu | Which way to go next |
| **Log** | Yours: coordinate, pours, account | A ship's log is its own record |
| **Pick a drink** | The harbour's steps | Never *order*: Cotidal is not connected to the bar, and the bartender takes the order |
| **Come aboard** | Sign in | The button that starts Bluesky sign-in says so: "Come aboard with Bluesky" |
| **Go ashore** | Sign out | Its explanation says it signs you out |

## Claims

**The copy says only what the product does today.** A precise instrument that
overstates itself has spent the one thing it sells. So: the register does not
*verify* anything, it separates what is on the record from what is told;
coordinates are placed, not computed from a recipe's proportions; a bartender
cannot read "−4.2 · −3.1", but can read three drink names; and anything not
built yet says **Later:** (comparing with the people you follow) rather than
being described as if it were there. No other app reads these records yet, so
"an open record" says *can*. It does not add "today, that is only this one":
true, but it describes an empty room rather than an open door.

**Drift is your ratings, nothing else.** A drink rated 7 or more pulls the
point toward it, 3 or less pushes it away, "what was off" nudges it, and each
step shrinks as the point grows surer. Nothing tracks the season, the hour or
the weather, so the copy never implies it does ("what you want in July isn't
what you want in November" was cut for that reason).

**Things the copy may not say**, each because it isn't true or can't be
checked: *verified* (the register separates the attested from the told; it
verifies nothing), *forever*, *no trackers* or *no algorithm*, and any word
from the code (*latent*, *triangulation*, *calibration*).

**The AT Protocol is plumbing.** To a drinker it is "your own Bluesky
account". Name the protocol only where the reader needs it (the For Bars
page, chat assistants), and compare it to things people know (a blog's feed),
never to crypto.

## Palette

Defined once, in `src/styles/globals.css`, as HSL custom properties consumed
through Tailwind tokens.

The ground is **warm paper**, not obsidian. Everything is ink on stock.

| Token | Value | |
|---|---|---|
| `--background` | `47 39% 93%` | Warm paper |
| `--card` | `45 50% 97%` | A brighter sheet laid on it |
| `--foreground` | `148 20% 17%` | Forest ink — near-black, but green |
| `--primary` | `8 55% 40%` | Terracotta — the accent that carries |
| `--secondary` | `140 22% 24%` | Deep forest |
| `--accent` | `80 24% 76%` | Sage |
| `--border` | `41 29% 81%` | Tan hairline |
| `--muted-foreground` | `125 6% 39%` | Warm grey-green |

**The open question is closed.** The previous palette paired amber with
burnished copper and noted that the two sat too close to create any tension.
Terracotta against deep forest is that tension: warm against cool, both muted,
neither of them decoration. Sage is the third, used flat and large rather than
as a tint.

The ink is green, not black. It is the difference between a printed menu and a
laser-printed handout, and it is nearly subliminal at body size — which is the
right amount of strange for a colour you look at all day.

The obsidian palette is gone; there is no dark theme.

### Shadows

On paper, light does not glow — it presses. `shadow-bar` lifts a sheet a
millimetre off the stock, and `shadow-mcm` is a hard letterpress offset in
terracotta.

### Form

- **Hairline rules over boxes.** Sections are separated by a 1px rule, and the
  heavier rule is `--foreground`, not `--border`.
- **Square corners.** Radius is used sparingly; a menu is not a card UI.
- **Dot leaders** carry name → amount, the way a wine list does
  (`.dot-leader` with a `.leader` spacer in `globals.css`).
- **One large move per screen.** On `/` it is the cotidal chart; on a drink
  entry it is the title plate.

## The mark and the figure

Both are a **cotidal chart**: lines radiating from an amphidrome, the one point
where the tide does not rise, joining the places that reach high water at the
same hour. It is the name drawn literally, and it is the product's own
geometry — a zero point at the centre of the map, and lines joining everyone
at the same phase.

- **The figure** (`ChartFigure.astro`, the landing page's one large move):
  co-range rings and six cotidal lines labelled by hour, over the map's axes;
  one band between two lines filled in terracotta, with the coordinate sitting
  in it; the sage disc is the moon.
- **The mark** (`Monogram.astro`, `public/icon.svg`, `favicon.ico`): the same
  chart reduced to a letter — an open ring for the C, three cotidal lines, and
  the one filled band, which is what keeps it legible at 16px.

The coupe glass they replace belonged to the old name, and to the speakeasy
register this document already warned about.

## Rules

Everything user-facing is a pure function of tokens, schema, content, and
state — none of which may be authored inside a component.

1. **No raw values in components.** Colours, sizes, and shadows come from
   Tailwind tokens. Undefined utilities fail silently: `text-2xs` and
   `text-3xs` were used 41 times while defined nowhere, and every one of those
   elements rendered at inherited size.
2. **No hard-coded copy in components.** Strings live in `src/lib/copy.ts`
   so the voice can be revised in one place. The quiz's questions are the one
   exception, because each sits beside the numbers that score it
   (`discovery-questions.ts`); the drink and region prose are content
   (`src/content/`).
3. **Fonts are tokens too.** `font-body` / `font-serif` / `font-condensed`
   resolve through `--font-*` variables in `globals.css`. Those variables were
   missing entirely, so all three Google Fonts downloaded and none applied.

Items 1 and 2 are enforced: `eslint.config.mjs` bans arbitrary Tailwind values, raw
colours, and words typed into markup (JSX text, or a literal `placeholder`,
`aria-label`, `title` or `alt`), as an error in `src/pages/`, `src/layouts/` and every component. The
app's components once carried ~38 hard-coded colours as warnings; they are
tokens now, and none remain.

Item 3 is still a convention.

## Writing the words

The voice is the one the newest questions already have: *"Cold enough to
ache."* *"Same bar, different stools."* *"Nobody by that name."* Short, concrete,
a little dry, said to one person.

- **Say the thing.** "Pastis, fennel, absinthe", not "herbaceous botanical
  aromatics". If a list holds three words for the same sensation, keep the best.
- **No stacked adjectives, no Title Case pairs.** "Sharp and mineral", not
  "Sharp Citrus & Mineral".
- **Don't announce the contrast.** "Not a quiz result, a record" and "a
  palate isn't static, neither is your map" are a shape, not a sentence.
  Say what it is.
- **Sparing with dashes.** A dash is a pause. Three in a paragraph is a tic;
  a colon or a full stop usually does the job.
- **Labels are not sentences.** No trailing full stop on a button or an option.
- **Say "actually" only when something is contrasted with what is merely
  claimed**, which is the register's whole job. Elsewhere it is filler.
- **Say what it is, not what they'll feel.** "Rye, sweet vermouth, bitters",
  not "a warm hug at the end of the night". No *delicious*, *refreshing*,
  *perfect* or *magical*.
- **Buttons are sentence case and start with a verb.** "Find your
  coordinate", "Log this pour", never "Map Your Palate".
- **Words for people, not for the system.** An error says what to do next
  ("Couldn't save your coordinate. Try again."), never the name of the field.
