---
summary: The design spec — every token, component pattern, navigation rule and screen (the map, its card, rating, a bar's menu, settings) — and how lint and tests enforce it.
read_when: Building or changing anything a person sees; check the token tables before styling and the screen sections before changing a card.
---

# Design system

Every token, component and screen, and how the rules are enforced. Why it
looks this way and how it speaks: `docs/brand.md`. A token is defined here
and in `globals.css` (mapped to Tailwind in `tailwind.config.ts`), nowhere else.

## Token Dictionary

### Palette (HSL)
| Token | HSL Value | Hex Equivalent | Role |
|---|---|---|---|
| `--background` | `47 39% 93%` | `#F4F1E6` | Warm paper ground stock |
| `--card` | `45 50% 97%` | `#FAF8F2` | Brighter specimen sheet |
| `--foreground` | `148 20% 17%` | `#23342B` | Deep forest ink (body text, dark rules) |
| `--primary` | `8 55% 40%` | `#9E3E2F` | Terracotta (accent marks, focus, highlights) |
| `--secondary` | `140 22% 24%` | `#30493B` | Forest green (buttons, badges, active tabs) |
| `--accent` | `80 24% 76%` | `#C6D1B2` | Muted sage mass |
| `--border` | `41 29% 81%` | `#D6CEBA` | Tan hairline border |
| `--muted-foreground` | `125 6% 39%` | `#5D6A61` | Warm grey-green for metadata & glosses |
| `--destructive` | `0 65% 42%` | `#B12828` | Errors only |
| `--shoal` | `156 17% 88%` | `#DCE6E2` | Pale water: where you probably are on the chart, and where the questions' answers point. Nothing else |

**Colour rules.** Terracotta marks what is *yours* and nothing else: your dot, your region, your track, the first drink on your menu, a value you gave and the app records (a rating, a chosen answer), and the focus ring. Forest is for acting and switching: the primary button, a pressed filter, segment or chip. **"You are here"** — the current page, tab or step — is neither: a bold label over a heavy ink (`foreground`) rule, like a printed tab (`.tab`, below). Links are underlined in grey-green and darken to ink on hover; text that is not underlined underlines on hover. Text is full-strength ink, forest, terracotta or grey-green — de-emphasise with size and weight, never with opacity.

### The reveal ground (`reveal-*`)
Forest laid as the stock, paper as the ink. Used **only** where the product reveals something: the coordinate landing after the questions (`Reveal.tsx`) and moving after a pour (`Moved.tsx`). Never a theme the user switches to.

| Token | HSL Value | Hex | Role |
|---|---|---|---|
| `--reveal` | `148 20% 17%` | `#23342B` | Ground |
| `--reveal-foreground` | `47 39% 93%` | `#F4F1E6` | Text and rules |
| `--reveal-muted` | `80 24% 76%` | `#C6D1B2` | Labels (sage) |
| `--reveal-mark` | `9 55% 52%` | `#C8543F` | Your dot |
| `--reveal-trace` | `12 58% 78%` | `#E7B3A6` | Where your dot was |
| `--reveal-rule` | `--reveal-muted` at 45% | — | The map's frame, a list's top rule |
| `--reveal-hairline` | `--reveal-muted` at 28% | — | The map's axes, rules between rows |
| `--reveal-dim` | `--reveal-foreground` at 58% | — | Drinks off your menu, your mark's crosshair |

### Translucent tokens
A colour that needs transparency gets a name here, in `globals.css`, rather than an opacity modifier (`/55`) where it is used.

| Token | Value | Role |
|---|---|---|
| `--scrim` | `--foreground` at 55% | Laid over the page behind a sheet |
| `--chart-axis` | `--foreground` at 20% | The map's axes on the cotidal chart (`ChartFigure`) |
| `--chart-ring` | `--foreground` at 40% | Its co-range rings |
| `--chart-cross` | `--card` at 70% | The crosshair on the terracotta band |
| `--leader` | `--foreground` at 30% | The dotted leader between a name and its figure |
| `--leader-reveal` | `--reveal-foreground` at 35% | The same leader on the reveal ground |
| `--shade`, `--shade-deep` | warm greys | What `shadow-bar` is cast in |

### Typography Tokens
Sizes are named for the role, not the number. Tailwind's own sizes (`text-sm`, `text-xl`…) and `tracking-wider` are not used: the lint rule below rejects them.

| Token | Font Family / Size | Tracking / Leading | Usage |
|---|---|---|---|
| `font-serif` | Playfair Display | — | Headlines, titles, drink names |
| `font-body` | PT Sans | Normal | Editorial body prose, paragraphs |
| `font-condensed` | Barlow Condensed | `tracking-label` (0.2em) | Metadata labels, coordinates, nav links |
| `label-caps` | Barlow Condensed | `text-label uppercase tracking-label text-muted-foreground` | Standard field / column label |

| `tracking-wordmark` | `0.15em` | — | Site title wordmark |
| `text-label` | 12px / 16px | — | Condensed caps: labels, links, buttons |
| `text-meta` | 13px / 1.5 | — | PT Sans small: glosses, notes |
| `text-ui` | 15px / 1.55 | — | PT Sans body; running text on the reading pages |
| `text-field` | 16px / 1.5 | — | A text field. Never smaller: iOS zooms on focus |
| `text-prose` | 17px / 1.6 | — | Playfair prose; list-item names |
| `text-plate` | 19px / 1.3 | — | Option and drink names |
| `text-heading` | 20px / 1.3 | — | A section heading |
| `text-subtitle` | 24px / 1.2 | — | A card's title; the region in the chart's cartouche |
| `text-title` | 30px / 1.15 | — | A question, a drink, a sheet title |
| `text-display` / `text-display-lg` | 36px / 48px, 1.05 | — | A page title (phone / from `md`) |
| `text-hero` / `text-hero-lg` | 40px / 60px, 1.05 | — | Landing headline (phone / from `md`) |
| `text-region` | 56px / 1 | — | A region, revealed (Playfair 400 italic) |

**Caps are for structure.** Condensed caps set buttons, navigation, eyebrows, field and column labels and map axes. What a reader picks from or reads — chips, tags, a pour's sender and place, a distance, a count — is sentence case in PT Sans (`text-meta`). Nothing is smaller than `text-label` (12px); the old 10px and 11px sizes are gone.

A new size is added to `fontSize` in `tailwind.config.ts` **and** to `FONT_SIZES` in `src/lib/utils.ts` (`tests/unit/class-merge.test.ts` holds the two equal), so `cn()` does not read it as a colour.

Fonts (`Base.astro`): Playfair Display 400, 400 italic and 700; PT Sans 400/700; Barlow Condensed 400/600/700. `font-mono` resolves to Barlow — monospace is not a brand face.

### Elevation & Shadows
| Token | Definition | Intent |
|---|---|---|
| `shadow-bar` | `0 1px 2px 0 hsl(var(--shade) / 0.06), 0 8px 24px -12px hsl(var(--shade-deep) / 0.18)` | A sheet lifted slightly off paper stock |
| `shadow-mcm` | `4px 4px 0 0 hsl(var(--primary))` | Hard letterpress offset in terracotta |

### Corners
Radius is 0 for sheets, plates, buttons and tabs. `rounded-sm` (2px) is the one exception, for inputs. `rounded-full` stays for the dots on the map.

### Focus
Drawn once, by the base `:focus-visible` rule in `globals.css`: a 2px terracotta outline, 2px off the element. Nothing needs a class to get it. An outline rather than a `ring-*` box-shadow, so focusing the chosen option plate keeps its `shadow-mcm`.
- `focus-ring-inset` — cells inside a frame (segmented controls, tabs, list rows), where an outer ring would be clipped or cross a neighbour.
- `focus-ring-reveal` — on the reveal ground, in `--reveal-mark`.
- Text fields mark focus with their border instead (`focus:border-primary focus:outline-none`).

### Buttons
`.btn` is the shape — square, ink edge, condensed bold caps, 44px tall; `.btn-lg` is the large size (52px, `text-sm`) for a screen's main action. A colour class says what it is:
- `.btn-primary` — forest, deepening to ink on hover, muted when disabled.
- `.btn-outline` — the second action beside or below a primary one: an ink edge on the ground, filled forest on hover.
- `.btn-reveal` — paper on forest, for the reveal ground.

Width and padding stay with the layout (`w-full`, `px-8`).

### Component patterns

Components live in `src/components/app/` (React: the map, the card's
screens, shared pieces in `ui.tsx`, all server-rendered with no directive on
static pages) and `src/components/site/` (`.astro` pieces only a page uses).

- **Dot leader**: `.dot-leader` with a `.leader` spacer (`Name …… Amount`).
- **Menu row**: `.menu-row`, a hairline over a line of a spec sheet (an
  ingredient), never something you open (that is `DrinkRow`).
- **Option plate**: the whole plate is the button; chosen is an ink edge and
  `shadow-mcm`, struck through when the question asks what to push away.
- **Segmented control**: `.segmented` with `.segment` cells (`aria-pressed`
  forest; a radio's `aria-checked` terracotta, for what is yours);
  `.segmented-stack` for a column.
- **Tags**: axis (outline, forest), region (terracotta fill), status (sage).
  Static is `.tag`, a toggle `.chip` (`<Chip>`). Sentence case, PT Sans.
- **Tab** ("you are here"): `.tab`, bold ink over a 3px `foreground` rule
  when `aria-current`.
- **Three text actions, no others:** `.btn` (`btn-primary` for the card's one
  action, `btn-outline` for a second); `.link-caps` for a link or text button
  on its own (44px, condensed, `text-secondary`); `.link-inline` for a link
  in a sentence.
- **One readout** (`Readout`, `ui.tsx`): labelled figures side by side, ruled
  above and below, never boxed (a drink's coordinate and region, a person's
  pours).
- **One comparison** (`Comparison.tsx`, `compare.ts`): under a
  `SectionTitle` ("On your map"), a `Readout` of distance and way from the
  nearest hill, an italic line for whether it is reached for, a `text-meta`
  line for the ratings behind it, and for a person where the two part as
  `DrinkRow`s (`docs/map-first.md`, Comparing).
- **One notice** (`Notice`, `ui.tsx`): a line about the screen's state, ruled
  above and below; `alert` (destructive, announced), `status` (polite),
  `note` (quiet). A field's own error sits under the field, unruled.
- **Section title**: `SectionTitle` or `.section-title`, a bold serif line
  over an ink rule, with an optional `aside`.
- **One row** (`DrinkRow.tsx`): everything you can open from a list (a drink,
  a bar, a person, a pour) is one row: optional rank in the margin, the title
  in bold Playfair at `text-prose` (terracotta when it is the one shown or
  first on your menu), an optional figure on a dot leader, a `text-meta` note,
  anything else under that. The whole row is the target and carries its own
  hairline; a list is an `<ol>`/`<ul>` of rows under a `SectionTitle`.
- **Text field**: `.field`, 16px, hairline border, terracotta on focus.
- **Shared** (`ui.tsx`, `ColdState.tsx`): `ScreenHeader` (how a card opens),
  `Empty` (one italic sentence, at most one action), `GuestPrompt`,
  `Loading`, `Chip`, `ColdState` (no coordinate yet).
- **Paper grain**: `.bar-texture`.

---

## Navigation

One list (`destinations` in `src/lib/site-nav.ts`) and one account control
(`accountControl`) render every bar and footer, with no JavaScript (`/`'s
phone Menu is a `<details>` opening the same `<nav>` via `peer-open`).

1. **The app bar** (`AppBar.astro`) is the top of every page's card, since
   the map has the top of the screen: mark · the page's name · Menu on a
   phone; from `lg`, the account control and a row of tabs. Islands receive
   it as a slot rendered on the server.
2. **Destinations:** the map (`/map`) in the bar; How it works
   (`/#how-it-works`) and For Bars (`/bars`) in the footer (`footer: true`).
   No Drinks or Regions items. `/map` has no footer.
3. **The account control** says what the server knows (`accountFor`, read
   once in `AppShell`): `@handle` → `/settings` for a member (on a phone,
   Menu's last row, **Settings →**); **Sign in** for a guest; **Account** on
   a prerendered page. On an app page Sign in opens the sign-in sheet in
   place (`?signin=1`); elsewhere it goes to `/sign-in`. Sign out is on
   `/settings` only, a plain form post.
4. **Current page:** a tab (bold ink over a 3px rule) from `lg`, bold alone
   in the phone's Menu.
5. **A way back:** `MapPage`'s `back`, an arrow before the page's name.
6. **Focus mode:** `data-focus-mode` (the questions, the reveal) hides the
   bar and footer below `lg`, in CSS.
7. **The search is the first thing in the map's card**, not the bar: it is
   content. `SearchBox.tsx` is a plain GET form to `/map?q=` until the island
   is up. It steps aside while rating and on the reveal.
8. **One action per app screen.** The map's is **Rate a drink**: floating at
   the foot on a phone (hidden while the keyboard is up), in the card's head
   from `lg`, and only on where to next.
9. **One page title:** every card opens with `ScreenHeader` (title, optional
   action, `gloss` or `lede`, optional readout). The eyebrow is the app bar's
   (`MapPage`'s `eyebrow`); rating keeps its own.
10. **One sheet per screen.** Only what is yours (the chosen option, the
    map's card from `lg`) is a sheet with `shadow-mcm`; everything else is a
    ruled section or rows. `WaitingPick` is a strip ruled in ink.
11. **Two kinds of empty:** `Empty` for a list with nothing yet; `ColdState`
    for a screen that can't start without a coordinate.
12. **One section heading:** `SectionTitle`. Small caps label a field or
    column, never a section.
13. **Nothing smaller than 13px is prose.** `text-label` (12px) is caps only.
14. **The eyebrow is the name of the way in:** the label of the item that
    opened the page (For bars, Chat assistants, Public map, Rate a drink),
    plus the kind of item after a middle dot (`Drinks · Aperitivo`). None on
    the landing page. Sentence case in `copy/`; caps are CSS.

## One kind of page

Every page is the map and its card (`MapScreen.tsx`): `MapPage.astro` with no
script, or `/map`'s island. A new page says what the map draws and what the
card holds; it does not lay itself out.

- **The map** is a `PalateMap`: a drink marked, a region washed, someone's
  terrain, a bar's pins, the sample palate, or the tide turning (the default,
  for a page with nothing of anyone's). Its accessible name says what it
  draws. A line about what it shows (your leanings, "A sample palate") is its
  `caption`, lower left.
- **The card** opens with the app bar, carrying the page's name; where that
  is the only title (Settings) it is the `h1` (`heading`). Then
  `ScreenHeader`, ruled sections, and the site footer.
- **One size of main action:** a full-width `btn btn-primary`, a second as a
  full-width outline or a quiet line of links. `btn-lg` only on the front door
  and the two reveals.
- **Every page scrolls the same:** on a phone the map stays at the top and
  the card scrolls up over it, its app bar sticking; from `lg` the card is a
  panel that scrolls on its own. On `/map`, a tap on a place on the map
  scrolls back to the top; rating scrolls the card up.
- Forms and records (Settings, For bars, a claim form, Chat assistants, an
  assistant asking for access, not found) are cards like any other. Settings
  draws your point and your code over your map (`MapCode`), which prints as a
  coaster.
- Between pages the map holds still (`view-transition-name: map`). The card
  comes first in reading order; CSS draws the map above it.

## The app as a chart

The screens show what the model knows rather than describe it: your terrain,
what put each drink where it stands, your track, how far a pour moved you,
and the shoal narrowing while the questions run (`PalateMap`'s `shoal`, one
standard deviation each way).

- **Signed out is one thing per screen:** find your coordinate. A guest with
  a coordinate sees what a member sees; what signing in keeps is said once,
  after the first pour.
- **Which way and how far, never a predicted score.** The filter's
  prediction sits near 9 for anything close, so it is never a forecast.
  Direction words are the axes': richer or crisper, sweeter or more savory.

## The first-visit flow (`/map?quiz=1`)

Questions → reveal → the map, all in the card. The map draws the ground the
answers so far make (`buildTerrain` with no pours), faint while unsure, with
the dashed shoal over it; at the reveal the point settles on that hill, on
the reveal ground. On a phone the app bar steps aside (`data-focus-mode`) and
the card gets room (`rest="quiz"`) so a question and every plate fit one
screen, an iPhone SE's included (`tests/quiz-flow.spec.ts`). From a drink's
page (`/map?drink=<slug>&quiz=1`) they finish on that drink. Anyone with a
coordinate goes straight on unless starting over (`&startover=1`, which
clears the device first). Skipping lands on the map's cold state.

Sign-in is one sheet (`SignInSheet.tsx`, mounted once by `AtprotoProvider`,
`createSignInController`: remembered accounts, handle typeahead, account
creation); `/sign-in` (`ConnectForm.astro`) mirrors it via `<bsky-sign-in>`
over a plain form post.

## Signed in, signed out

Everything works signed out, on the device; signing in moves the record into
the member's account. The server says which (`accountFor`, passed to every
island as `member`), so nothing guesses or flashes. A member's first visit
writes what they did as a guest (coordinate and answers) to the account,
unless it already has a coordinate; a guest's pours stay on the device.

| | Guest | Member |
|---|---|---|
| **The map** | Before a position: every drink, search, **Find your coordinate**. After: everything | Everything |
| **Rating** | Moves the coordinate here; pour kept on the device (`guestPours`) | Written to their repository, with detail fields and cross-posting |
| **Your pours** | Track, pours, what signing in keeps, Start over | Track, pours, a link to compare |
| **Your link** (`/p/<handle>`) | — | Your map as others see it; Compare palates (people you follow, or a handle via `GET /p?handle=`) |
| **Settings** | Sends to `/sign-in` | Sign out, your link, Share to your feed, chat assistants, Start over |

Signing out forgets the device's copy (`forgetDevice`) but keeps remembered
accounts (`atproto-cf-auth:recent-accounts`).

## The map (`/map`, `Explore.tsx`)

**The map** (`PalateMap.tsx`, `map-draw.ts`): the plane framed on a ruled
ground running to the window's edges; the four regions in italic, as names
for parts of the map, never for you; the axis words; **your terrain** as a
wash (sage to forest where high, terracotta where you rated low, paler where
nothing supports it) with dashed contours; the drinks the view draws as rings
(the staples, or a filter's own; `docs/map-first.md`, What the map draws);
your menu named; your pours
in terracotta, filled at 7+, named with your rating ("Negroni · 9"). Labels
go by priority (the open drink, a bar's pins, your pours) and drop where they
would overlap. A tap takes the nearest mark within reach. Your point is not
drawn. On a phone the map is full width and the card rests below it; from
`lg` the card is a panel down the left.

**Drawn by the server, to scale.** One SVG whose viewBox is the map; the
terrain's shading is three alpha masks (`groundMasks` in `map-draw.ts`, PNGs
from `png.ts`) filled with token colours. Marks and labels are HTML over the
plane in percentages (`planePercent`) on a paper halo (`.halo-card`); the
server places labels for `NOMINAL_SIDE` and `/map` re-places them once
measured. Screen geometry is CSS (`.map-screen-*`), so nothing moves when the
script arrives. `MapScreen` is `live` on `/map`, `static` elsewhere.

**The card** opens with the search. It holds one of:

- **Where to next:** **Rate a drink**, a waiting pick, **Your menu**
  (`useMenu`: eight drinks, each with what put it there, "Near your Manhattan
  (9)", the first in terracotta), **Have a menu?**, **Your bars**, **Bars near
  you** (`Near.tsx`), and **Your pours** (figures, `TrackFigure`,
  `PourLedger`; Compare for a member, what signing in keeps and Start over for
  a guest). The cold state before a position.
- **A drink:** region and coordinate, what put it there, your last pour,
  Also here, **Rate this**, **Pick this** (at an open bar), its entry. Ringed
  on the map.
- **A bar's menu** and **rating a pour** (below).

**Ranking** is by height on your terrain (`scoreDrinks`, `relevanceOf`):
bands of `HEIGHT_BAND`, highest first, and only within a band do tags, a good
pour at this bar and trained tolerances order. One rated 3 or less comes off.
No 0–100 score, no distance in a row.

**Search** covers drinks (name, alias, ingredient) and bars (yours, near you,
any name typed). With a bar open its name is a chip in the box (× leaves it)
and the box searches its menu.

**Bars near you** come from OpenStreetMap's Overpass API
(`src/lib/drinks/osm.ts`): bars, pubs, beer gardens and clubs within about
1.2 km, as a list. Nothing is asked until **Show bars near me** (unless the
browser already allows it). The point leaves rounded to about 100 m, only to
OpenStreetMap, and Cotidal keeps none; the list says so.

## Settings (`/settings`, `settings.astro`)

Rows: a thing, a line about it, its one action on the right. Who you are with
**Sign out**; **Sharing** (Your link, Share to your feed); **Chat
assistants** (Disconnect, or how to set one up); **Start over**. Plain form
posts, no script.

## A bar's menu (`MenuView.tsx`, `menu-rank.ts`)

A bar opened from search, your bars, bars near you, or **Have a menu?**
(`/map?menu=1`) fills the card: a back link, the bar's name (or an optional
bar-name field), and the menu input. Typed lines that name a drink
(`matchDrink`) are placed; others are kept and marked unplaced. A member can
also **Scan a menu photo** (`/api/menu/capture`, `docs/generation.md`); a
guest is offered sign-in for it. Each placed drink is a numbered pin (1 in
terracotta), every other drink fades to a speck, and the card lists them in
the same order (`rankMenu`). Nothing placed yet: **No known menu**. **Pick
this** keeps the pick on the device (`pick`, `device-store.ts`); the waiting
strip offers **Rate it** (a draft, no rating) or **Set it aside**.

A bar picked from bars near you carries its point through the pick, the draft
link (`lat`, `lon`) and the form, and the pour records it as `venue.address`
(`community.lexicon.location.geo`, strings not floats), only while the pour is
still at that bar.

**It orders nothing.** The interface never says *order*: you pick, the
bartender takes the order.

## Rating a pour (in the card)

`RatePanel.tsx`, where you found the drink; the whole card on a phone;
**Close** returns it. A missing answer (drink, bar or "At home", rating) is
said under its field, which takes focus; only the server's answer sits under
**Log it**. `useRateSheet` and `useRatePour` give it its own coordinate and
pours, so a pour updates the map and card in place.

**URL contract.** `?rate=<drink>` opens it on that drink (`?rate=` alone: the
nearest); `?draft=1&drink=…` on a draft (`pour-draft.ts`; a chat's
`draft_pour` link). Read once on arrival; in-app triggers call `open()` and
navigate nowhere. Closing or logging removes the request from the address
(`history.replaceState`), keeping any other query.

One form (`PourForm.tsx`): nine cells for the 9-point hedonic scale; "What
was off" as axis tags; spirit, glass, garnish and sensory sliders under "More
detail" for members. Logging replaces it with `Moved.tsx` on the reveal
ground: **Moved 0.7** or **Held.** (a rating of 4–6), which way, and what
changed on your menu. The move is drawn on the map: a dashed terracotta trail
from a ring to your point. **Done** returns to where to next, which already
shows the pour and has dropped the waiting pick.

---

## Strict Enforcement Architecture

**ESLint** (`eslint.config.mjs`), as errors in `src/pages/`, `src/layouts/`
and `src/components/`:

- No arbitrary values (`bg-[#hex]`, `text-[13px]`), raw colours, or opacity
  modifiers (`text-foreground/80`): give a translucent colour a token.
- No Tailwind type sizes (`text-xs`…`text-2xl`) or `tracking-wide*`: use the
  named roles and `tracking-label` / `tracking-wordmark`.
- No hand-built forms of a component: a spelled-out focus ring, primary or
  outline button, condensed caps (`label-caps` / `link-caps`), inline link
  (`link-inline`), section heading (`SectionTitle`) or ruled state line
  (`Notice`).
- No words in markup: JSX text, or a literal `placeholder`, `aria-label`,
  `title` or `alt`; strings live in `src/lib/copy/`. Not covered: a sentence
  built in a variable, and the quiz questions and prose, which keep words
  beside data on purpose.

**Static analysis** (`npm run check`): lint, `npm run lexicons`,
`astro check`, `tsc --noEmit`, `knip`.

**Tests:** `tests/landing-static.spec.ts` (no script on `/`, a drink's page or
`/sign-in`; the front door's one action on a phone's first screen; regions as
filters; sign-in with JavaScript off), `tests/visual-identity.spec.ts` (paper
`rgb(244, 241, 230)` and forest ink `rgb(35, 52, 43)` computed as tokened),
`tests/unit/class-merge.test.ts` (`FONT_SIZES` equals the config),
`tests/unit/drink-content.test.ts`.
