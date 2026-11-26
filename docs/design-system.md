# Design System Specification & Enforcement

This document specifies the design system of **Cotidal** and details the technical enforcement mechanisms that prevent drift.

---

## 1. Brand Philosophy: "Cold Instrument, Warm Secret"

The visual voice is an empirical, printed specimen catalog rather than a dim speakeasy:
- **Paper Ground**: Everything is ink on warm stock, not a glowing obsidian screen.
- **Restraint Over Ornamentation**: 1px hairline rules, generous whitespace, square edges, and dot leaders.
- **One Large Move Per Screen**: On `/`, it is the cotidal chart, `ChartFigure`. On a drink's page, it is the title plate.
- **Zero Client JavaScript on Reading Routes**: The homepage (`/`) and a drink's own page (`/drinks/[slug]`) ship no script.

---

## 2. Token Dictionary

All colors, typography, elevations, and layout metrics are defined centrally in `src/styles/globals.css` and mapped to Tailwind utilities in `tailwind.config.ts`.

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

**Caps are for structure.** Condensed caps set buttons, navigation, eyebrows, field and column labels and map axes. What a reader picks from or reads — chips, tags, a pour's sender and place, a distance, a count — is sentence case in PT Sans (`text-meta`). Nothing is smaller than `text-label` (12px); the old 10px and 11px sizes are gone.
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

### Form & Component Patterns
- **Dot Leader**: `.dot-leader` with `.leader` spacer for wine-list style alignments (`Name .......... Amount`).
- **Menu Row**: `.menu-row` — a hairline above a line of a spec sheet (an ingredient, a principle), never a thing you can open: those are `DrinkRow`.
- **Option plate**: the whole plate is the button; chosen = ink edge + `shadow-mcm`, struck through when the question asks what to push away.
- **Segmented control**: `.segmented` frame with `.segment` cells (`aria-pressed` is forest; a radio's `aria-checked` is terracotta, for what is yours). The columns are the caller's (`grid grid-cols-3`), or `.segmented-stack` for a column.
- **Tags**: axis (outline, forest), region (terracotta fill), status (sage fill). A static label is `.tag`; a toggle is `.chip` (`<Chip>`, `aria-pressed` is forest). Both are sentence case in PT Sans. No other tag styles.
- **Tab** ("you are here"): `.tab` — muted until `aria-current`, then bold ink over a 3px `foreground` rule. The header nav draws it from `lg`; the questions' progress bar is the same ink.
- **Three text actions, no others.** A button is `.btn` (`btn-primary` for the card's one action, `btn-outline` for a second). A link or text button standing on its own — back, Read the entry →, Sign in · Rate one as a guest — is `.link-caps`: 44px, condensed, wide-set, `text-secondary` (muted for back), underlined on hover. A link inside a sentence is `.link-inline`: ink, a grey-green underline that inks on hover, in the sentence's own face and size.
- **One readout** (`Readout`, `ui.tsx`): a few labelled figures side by side, ruled above and below, never boxed — a drink's coordinate and region (its page and the map's card), a person's coordinate and pours (`/p`), your pours and bars. Figures in condensed numerals; a name in Playfair, linked when it has a page.
- **One comparison** (`Comparison.tsx`, `compare.ts`): a drink or a person against a taste, under a `SectionTitle` ("On your map", "On @alice’s map"): a `Readout` of the distance from the nearest hill and which way, an italic line for whether it is reached for (or how many of the top ten are shared), a `text-meta` line for the ratings behind it, and, for a person, where the two part as `DrinkRow`s. The map's drink card, a drink on someone's map and two people compared all use it (docs/map-first.md, Comparing).
- **One notice** (`Notice`, `ui.tsx`): a line about the state of the screen — sign-in is off, a publish failed, the map was shared — ruled above and below. `alert` is destructive ink and announced; `status` is announced politely; `note` is quiet. A field's own error sits under the field, unruled.
- **Section title**: `SectionTitle` (`ui.tsx`), or `.section-title` where it has nothing beside it — a rule of ink under a bold serif line, with an optional `aside` at the right (a note, the axis a region runs on, when a menu was published).
- **One row** (`DrinkRow.tsx`): everything you can open from a list — a drink on your menu, a bar's or a region's; a bar near you or yours; a person you follow; a pour in your log — is one row: an optional rank in the margin, the title in bold Playfair at `text-prose` (terracotta when it is the one shown, or the first of your menu), an optional figure at the end on a dot leader (a coordinate, a distance, a rating), a `text-meta` note under it, and anything else (a pour's tags and quote) under that. The whole row is the target — a link, a button, or plain text — and it carries its own hairline, so a list is an `<ol>` or `<ul>` of rows under a `SectionTitle`. React, rendered on the server with no directive on the static pages, so a drink's page and `/map` draw the same row.
- **Text field**: `.field` — 16px, hairline border, terracotta on focus.
- **Where components live**: `src/components/app/` holds React — the map, the card's screens and the shared forms (`ui.tsx`, `DrinkRow.tsx`), all of which the static pages render on the server with no directive; `src/components/site/` holds the `.astro` pieces only a page uses (the app bar, the footer, the region filter, a drink's record).
- **Shared components** (`src/components/app/ui.tsx`, `ColdState.tsx`): `ScreenHeader` (how an app screen opens: `text-title` heading, optional lede, left-aligned; an eyebrow only on a sheet), `Empty` (a list with nothing in it yet: one italic sentence in the voice, ruled beneath, at most one action; it sits under the list's own heading), `GuestPrompt` (what signing in buys, with the one button; ruled above and below, not boxed), `Loading`, `Chip`, and `ColdState` (what the map's card, and rating, say to someone with no coordinate).
- **Paper Grain**: `.bar-texture` applies a subtle SVG fractal grain texture.

---

## 3. Navigation System

Navigation is unified across the site through two bars and a footer, all rendered from one list (`destinations` in `src/lib/site-nav.ts`) and one account control (`accountControl`):

- **`AppBar.astro`** is the top of every page's card (`MapScreen`'s `bar`): the map has the top of the screen to itself. The card is a phone's width at every size, so the bar is laid out for it: the mark, then the wordmark (or on `/map` the search), then Menu on a phone or the account control from `lg`; from `lg` a row of tabs under it (the map and the reading pages a drinker reads), so nothing is folded away on a wide screen. Islands receive it as a slot rendered on the server.
- **`SiteFooter.astro`** is the foot of a static page's card (the app screens have none).
1. **Zero Client JavaScript**: Rendered as semantic HTML `<header>` and `<nav aria-label="Main Navigation">`.
2. **Destinations** (header): the map (`/map`), the one app screen. How it works (`/#how-it-works`, the front door's card pulled up: not a page of its own) and For Bars (`/bars`) are public reading pages in the footer; there is no Drinks item — every drink is on the map and opens in its card, and a drink's own page (`/drinks/<slug>`) is reached from search and links. For Bars is also the supply side, a different product from the drinker's app, on the same one kind of page.
3. **The account control** (header) says what the server knows (`accountFor` in `session.ts`, read once in `AppShell`):
   - a member sees `@handle`, which opens `/settings` (on a phone, the last row of Menu, marked **Settings →**). **Sign out** is on `/settings` alone — a plain form post that answers with a redirect, like sign-in, so it needs no script; the header never repeats it;
   - a guest sees **Sign in** (on a phone, inside Menu);
   - a prerendered page (`/drinks/<slug>`) was built before anyone visited, so it says **Account** (also `/settings`, which sends a guest to `/sign-in`) rather than guess.
   - on an app page, **Sign in** opens the one sign-in sheet in place (`?signin=1`, handled by `AtprotoProvider`) rather than leaving for a page. On every other page it goes to `/sign-in`, which renders a plain form post and progressively enhances it with `<bsky-sign-in>`.
4. **Footer**: the visible reading pages only — How it works and For Bars for guests, plus Drinks for signed-in members (`footer: true` and `isVisibleDestination` in `site-nav.ts`). The map and the account are always in the bar. The app screen (`/map`) has no footer: the app bar carries the visible reading pages instead.
5. **Active State Indicators**: Routes are identified via `currentPath` and styled as a tab: bold ink over a 3px `foreground` rule from `lg`, bold alone in the phone's folded menu.
6. **Sub-Route Navigation**: In `/drinks/[slug]`, the header supports a semantic `backLink` while retaining global site navigation.
7. **Phones**: on every page the bar is wordmark · Menu — one control, so it reads the same wherever you are; on `/map` the search takes the wordmark's place. Menu opens three groups: the map, the visible reading pages a drinker reads (`menu` in `destinations`: How it works, plus Drinks for members), and the account last, under an ink rule (Sign in, `@handle · Settings →`, or Account). "Menu" is a `<details>` that opens the same `<nav>` through `peer-open`, so `/` still ships no JavaScript.
8. **Focus mode**: any element marked `data-focus-mode` (the questions, the reveal) hides the site header and footer below `lg` (`globals.css`, pure CSS so nothing flashes before hydration).
9. **The search is the first thing in the map's card**, not in the app bar: it searches drinks and bars, which is content, not navigation, so the bar names the page ("Map") as every bar does. `SearchBox.tsx` is drawn by the island on the server as a plain GET form to `/map?q=`, so it works before the island does and with script off; once the island is up, a submit opens the first result in place. It steps aside while rating or on the reveal, which have the card to themselves. There is no bar along the foot: the app is one screen.
10. **One action per app screen.** The map's is **Rate a drink**: on a phone it floats at the foot of the screen, over the card, where a thumb is (hidden while the search has the keyboard), and the card's list keeps room under its last row for it; from `lg` it sits in the card's head line, beside what your map says about you. It shows only on where to next — a drink, a bar, rating and the reveal each carry their own action. Choosing what to have is the search, the card's lists and the map itself; Pick this and Rate this belong to a drink, opened in the card.
11. **One page title.** Every card opens with `ScreenHeader` (`ui.tsx`): the title, left-aligned and at one size, with an optional action, a `gloss` (the italic line under a drink's, a region's or a bar's name) or a `lede` (plain prose), and a readout under them if the card has one. The app screens use it (where to next, a bar's menu titled with the bar's name, a drink, the cold state) and so does every static page. The eyebrow is the app bar's (`MapPage`'s `eyebrow`); rating, in the card, keeps its own ("Rate a drink").
12. **One sheet per screen.** Only what is yours — the chosen option, the pinned card — is a sheet with `shadow-mcm`. Everything else is a ruled section (`section-title`) or rows. The map sits in a frame on a ruled ground, as a printed chart does; that is a figure, not a sheet. The map's card is the screen's one sheet (`shadow-mcm` from `lg`). A pick waiting to be rated (`WaitingPick`) is a strip ruled in ink, not a sheet.
13. **Two kinds of empty.** A list with nothing in it yet is `Empty`: your pours' ledger, a search with no match, no bars near. A screen that cannot start without a coordinate is a `ScreenHeader` and its ways in: `ColdState` in the map's card and in rating; a bar's menu says what it needs in an `Empty`. Nothing else says "empty".
14. **One section heading.** A section inside any card opens with `SectionTitle` (or `.section-title`): a bold Playfair line over an ink rule. A heading with a link beside it ("Its drinks →") draws the same rule under the row. Small caps label a field or a column, never a section.
15. **Nothing smaller than 13px is prose.** `text-label` (12px) is for condensed caps only. A note or citation under an item is `text-meta` in PT Sans; an italic gloss is Playfair at `text-ui`.
16. **The eyebrow is the name of the way in.** The small caps line over a title is the label of the nav item, tab or button that opens the page — Drinks, Regions, For bars, Chat assistants, Public map, Rate a drink — and a page about one item adds what kind of item after a middle dot (`Drinks · Aperitivo`, `Regions · Rich and savory`). The landing page has none, and nor does an app tab's screen, whose tab is already marked current on the same screen (rule 11). Write it in sentence case in `copy.ts`; the caps are CSS.

## One kind of page

Every page a person visits is the map and its card (`MapScreen.tsx`):
`MapPage.astro` for a page with no script, and the app screen, `/map`, an
island whose card also runs the questions (`/map?quiz=1`). A new page does not lay itself out; it says
what the map draws and what the card holds:

- **The map** is a `PalateMap`: a drink marked, a region washed, someone's
  point, a bar's menu as pins, the sample palate, or, where the page has
  nothing of anyone's to draw, the tide turning (`MapPage`'s default). It
  says what it draws in its accessible name: "your map" on `/map`, the map
  itself (`explore.chartLabel`) where it draws nobody's.
- **The card** opens with the app bar (`AppBar`), which carries the page's
  name — the name of the way in, `MapPage`'s `eyebrow`, with its way back
  (`back`) as an arrow before it — in the wordmark's place, so the name is
  said once and takes no line of its own. Where the name is the page's only
  title (Settings), it is the page's `h1` (`heading`) and the card opens with
  no other. Then `ScreenHeader`, then ruled sections; its foot is the site
  footer. A line about what the map shows — what your map says about you on
  `/map`, "A sample palate" on the front door — is drawn on the map, in its
  lower-left corner (`PalateMap`'s `caption`), not as a line of the card.
- **One size of main action.** A card's main action is one full-width
  `btn btn-primary`; a second action is a full-width outline under it, or a
  quiet line of links (the cold state: Find your coordinate, then Sign in ·
  Rate one as a guest). `btn-lg` is for the front door and the two reveals
  (after the questions, after a pour). Actions on a row — Settings' rows,
  Show bars near me — keep their own size, and `/map`'s Rate a drink floats
  on a phone.
- **Every page behaves the same.** On a phone the map stays at the top as
  the page scrolls the card up over it, and the app bar sticks to the top of
  the screen once it gets there; from `lg` the card is a panel that scrolls
  on its own. `/map` too: there is no dragged card. On
  `/map` a tap on something that is a place on the map (a drink, a bar, back
  to where to next) scrolls back to the top, so the map shows and pushes the
  card down; rating scrolls the card up to the top of the screen.

Pages that are forms or records rather than places — Settings, For bars, a
bar's claim form, Chat assistants, an assistant asking for access, not found
— are cards like any other, with the tide turning or the reader's own point
behind them. Settings draws your point, and your code over your map
(`MapCode`), which prints as a coaster.

Moving between pages, the map holds still (`view-transition-name: map`,
CSS only), so the site reads as one screen. The map has the top of the
screen and the app bar is the top of the card; the card comes first in
the page's reading order, and CSS draws the map above it.

## The app as a chart

The screens show what the model already knows instead of describing it: your terrain on the map (where your answers and ratings are high and low, and how sure), what put each drink where it stands, your track in the card, how far a pour moved you after it, and the shoal narrowing on the map while the questions run in the card over it (`PalateMap`'s `shoal`, reported by `QuizCard.tsx`: the quiz's best guess, one standard deviation across on each axis). The question's stage is its eyebrow; there is no row of stages at the foot, because after the four fixed openers the questions do not come in stage order.

**Signed out is one thing per screen.** A stranger is asked to do one thing: find their coordinate. A guest with a coordinate sees what a member sees; what signing in keeps is said once, at the foot of Your map, after the first pour — the first moment it would keep something.

**Which way and how far, never a predicted score.** The filter's hedonic prediction sits near 9 for any drink close to you (see `applyPour`), so the interface does not show it as a forecast. Direction words are the axes' own: richer or crisper, sweeter or more savory.

## The first-visit flow (`/map?quiz=1`)

Questions → reveal → the map. The questions are a state of the map's card, never a page (`QuizCard.tsx` in `Explore.tsx`; `?quiz=1` asks for them on arrival, and Find your coordinate on the map opens them in place): the shoal narrows on the map as they are answered, and when they finish the point settles there while the card turns to the reveal on its ink ground. Each answer adds depth: the map draws the ground the answers so far make (the questions' own hill, `buildTerrain` with no pours), broad and faint while they are unsure, rising and sharpening as they agree, with the dashed shoal over it; the reveal's point settles on that hill. On a phone the app bar steps aside (`data-focus-mode`) and the map gives the card room (`rest="quiz"`), so a question and every plate fit one screen, an iPhone SE's included (tests/quiz-flow.spec.ts): the question and the plates are a size smaller and tighter than from `lg`. From a drink's page (`/map?drink=<slug>&quiz=1`) they finish on that drink, which is already open behind them. Someone who already has a coordinate goes straight on — the landing page's "Find your coordinate" is the same link for everyone — unless they came to start over (`/map?quiz=1&startover=1`, from `/settings` for members or the foot of the map's card for guests), which clears the device's copy first. Skipping goes to the map, whose card says there is no position yet and offers the questions first, rather than ranking drinks around a point nobody chose; the search works all the same.

Sign-in is offered where it would keep something, as one sheet (`SignInSheet.tsx`, mounted once by `AtprotoProvider`, backed by `createSignInController` with remembered accounts, handle typeahead and in-flow account creation); the sign-in page (`ConnectForm.astro`, `/sign-in`) mirrors it via `<bsky-sign-in>` progressive enhancement over a plain form post, followed by `connect.buys` and `Principles`. The radar chart, the archetypes and the Oracle tab are retired from the interface; the region is the only identity.

## Signed in, signed out

Everything works signed out, on the device; signing in moves the record into the member's own account and is what the social half needs. Pages that differ are told which by the server (`accountFor`, passed to every island as `member`), so nothing guesses or flashes: the island never asks the browser who is signed in. A member's first visit settles what a guest did before signing in (`useProfile`): the coordinate and quiz answers waiting on the device are written to the account, unless the account already has a coordinate.

| | Signed out (guest) | Signed in (member) |
|---|---|---|
| **The map** | Before a position: every drink, the search, and the card's ways in (**Find your coordinate**). After: everything | Everything |
| **A bar's menu** (the map) | Everything; the pick waits on the device | The same |
| **Rating** | Moves the coordinate on this device; the pour is kept there (`guestPours`, `device-store.ts`) | Written to the member's repository |
| **Your pours** (the map's card) | Track and pours; what signing in keeps, once there is a pour; start over | Track, pours, and a link to compare at your link |
| **Your link** (`/p/<handle>`) | — | Your map as others see it, the address, and **Compare palates**: people you follow who have a map (read on the server within a budget) and a handle form (`GET /p?handle=`) |
| **Settings** | — (sends a guest to `/sign-in`) | Who you are and Sign out; your link and Share to your feed; chat assistants; start over |
| **Rating** (the map's card) | The same form; the pour stays on the device | Written to the member's repository; the detail fields and cross-posting |

Signing out forgets the device's copy (`forgetDevice`), on whichever app page it lands (`AtprotoProvider`), while keeping remembered account cards (`atproto-cf-auth:recent-accounts`) for one-tap return sign-in. A guest's pours stay on the device when they sign in; they are not written to the account on their behalf.


## The map (`/map`, `Explore.tsx`)

The app on one screen (`docs/map-first.md`): **the map**, fixed in place as the background; **the search**, in the header; and **one card** for everything else. Nothing moves the map: opening a bar, a drink or a pour changes what is drawn on it, never where it is.

**The map** (`PalateMap.tsx`, `map-draw.ts`): the plane in a frame on a ruled ground that runs to the window's edges; the four regions named in italic like seas, as names for parts of the map, never for you; the axis words; **your terrain** (`terrain.ts`) as a wash — sage rising to forest where your answers and ratings are high, a terracotta wash where you rated low, paler where nothing you rated supports it — with its contour lines dashed like a chart's co-range lines; every drink as a small ring; and your pours, terracotta, filled at 7 or more, named with your rating ("Negroni · 9"). Labels are placed by what matters (the open drink, a bar's pins, your pours) and left out where they would overlap; every drink is still in the card's lists and the search. A tap takes the nearest mark within reach. Your point is not drawn: the terrain is your taste on the map.

On a phone the map is the full width under the header and the card rests in the space below it; from `lg` the card is a panel down the left and the map fills the rest.

**Drawn by the server, to scale.** The plane is one SVG whose viewBox is the map itself, so it is drawn at any size without measuring; the terrain's shading is three alpha masks (`ground-masks.ts`, PNGs written in `png.ts`) filled with token colours, so the server needs no canvas and no theme. What must keep its size on any screen — the marks, the labels, the region names and axis words — is HTML laid over the plane in percentages (`planePercent`), on a halo of the card's paper (`.halo-card`). Only which labels fit depends on the plane's size in pixels: the server places them for `NOMINAL_SIDE` (a phone), and `/map` places them again once measured. The screen's geometry — where the plane sits, where the card rests — is CSS (`.map-screen-*` in `globals.css`), so the page arrives laid out and nothing moves when the script does.

**One layout for every map page** (`MapScreen.tsx`, with `CardHead`): the map and one card. `live` is `/map`, where the card is pulled up by its head; `static` is a page with no script, where on a phone the map stays at the top as the page scrolls the card up over it — the pull is a scroll. A static page renders the same React components on the server with no directive, so the map and the card are one copy, not an Astro twin of each.

**The card.** What your map says about you in the axes' words ("You lean *crisp and sweet · rich and savory*", `leanings`), or "No position yet", is the map's caption, in its lower-left corner; the card opens with the search, and from `lg` the screen's one action under it. Pulling the card up is scrolling the page, as on every page; from `lg` its body scrolls on its own. It holds one of:

- **Where to next** (titled for a screen reader alone: the head says where you are and each section names itself): **Rate a drink** (the screen's one action, rule 10), a waiting pick, **Your menu** (`useMenu`: eight drinks, each with what put it there — "Near your Manhattan (9) and Penicillin (8)", "You gave it 8", "Near where your answers put you" — the first in terracotta), **Have a menu?**, **Your bars** (from your pours), **Bars near you** (`Near.tsx`, a list), and **Your pours**: the figures, your track up close (`TrackFigure`), the ledger (`PourLedger`), and for a member Compare with someone, for a guest what signing in keeps and Start over. Before a position it holds the cold state instead.
- **A drink**: its region and coordinate, what put it where it stands for you, your last pour of it, Also here, **Rate this**, **Pick this** (at the open bar, if any), and its entry. It is ringed on the map.
- **A bar's menu** (below).
- **Rating a pour** (below).

The menu is ranked by your terrain (`scoreDrinks`, `relevanceOf` in `scoring.ts`, `terrain.ts`): each drink by its height — your ratings of it and of the drinks around it, and where your answers put you — taken in bands of `HEIGHT_BAND`, highest first, and only within a band do the vibe tags, a good pour at this bar and the trained tolerances set the order. One rated 3 or less comes off. A row says what put the drink there, never a predicted score and never a distance, which would not match the order. There is no 0–100 score in the interface.

**The search** (`SearchBox.tsx`) is over drinks (by name, alias or what is in them: "mezcal") and bars (yours, near you, and any name typed, offered as Pick a drink at …). A drink opens in the card; a bar opens as a filter on the map; a name the map does not know can still be rated. With a bar open its name sits in the box as a chip (× leaves it) and the box searches its menu.

**Bars come from OpenStreetMap** through the Overpass API (`src/lib/osm.ts`): named places tagged bar, pub, beer garden or club within about 1.2 km, as a list — a bar is found by name and opened on your map, not panned to on a street map. Nothing is asked for until the reader taps **Show bars near me** — unless the browser already holds their yes for this site. The point leaves the device rounded to three decimal places (about 100 m), only to OpenStreetMap, and Cotidal keeps none of it; the list says so.

**Nothing moves under the reader.** The map never moves; the card opens over it rather than pushing it; a tap opens something in the card where the thumb is.

## Settings (`/settings`, `settings.astro`)

A member's account as one page: a left-aligned title like an app screen's, and rows — a thing, a line about it, its one action on the right. In order: who you are signed in as, with **Sign out** beside it (the only place it is offered); **Sharing** (Your link → Open, Share to your feed → Share); **Chat assistants** (connected ones with Disconnect, or how to set one up); **Start over**. Server-rendered with plain form posts and no script: sharing is a form post the page answers with a redirect and a notice, like Disconnect.

## A bar's menu (`MenuView.tsx`, `menu-rank.ts`)

A bar is a filter on the map, not a screen of its own. A bar opened from the search, your bars or bars near you, or **Have a menu?** (or `/map?menu=1`), fills the card with its menu: a back link, the bar's name as the title (or "Have a menu?" with an optional bar-name field when there is no bar), and the menu input. Type what they pour: a line that names a drink on the map (`matchDrink`) is placed, anything else is kept and marked unplaced. Each placed drink becomes a **numbered pin on the map**, 1 in terracotta, and every other drink fades to a speck; the card lists them in the same order (`rankMenu`, with the bar in the relevance score), each saying what put it there. With nothing placed yet, the map says **No known menu**. **Pick this** keeps the pick on the device (`pick` in `device-store.ts`) and returns to where to next, where the waiting strip offers **Rate it** — rating opened on the pick as a draft (the same hand-off a chat assistant's link makes), with no rating in it — or **Set it aside**. A menu with no bar is a pick at home. A drink opened in the card can be picked the same way. Photographing the menu is **Later:**.

**Where the bar is.** A bar picked from the bars near you carries its point through the pick, the draft link (`lat`, `lon` in `pour-draft.ts`) and the form, and the pour records it as `venue.address`: a `community.lexicon.location.geo` (`src/lib/atproto/location.ts`), the Lexicon Community's shape, strings not floats. It is written only while the pour is still at the bar the map named: a menu opened with no bar, or with another bar typed, drops it. The tests validate it against the community's published lexicon (`tests/fixtures/community-lexicon/`).

**It orders nothing.** Cotidal is rarely connected to a bar's own system, so nothing in the interface says *order*: you pick, the bartender takes the order. Interface copy about the bar itself ("what to order once you know it") is fine.

## Rating a pour (in the card)

In the map's card, not a page and not a dialog: `RatePanel.tsx`, where you found the drink. It takes the whole card on a phone; **Close** returns the card to where it was. Something missing (the drink, the bar or "At home", the rating) is said under that field, which takes focus, and goes away once it is answered; only what the server says sits under **Log it**. The screen gives it its own coordinate and pours (`useRateSheet`, `useRatePour`), so a pour updates the map and the card in place.

**URL contract.** `?rate=<drink>` on `/map` opens it on that drink (`?rate=` alone: on the drink closest to you); `?draft=1&drink=…` opens it on a draft (`pour-draft.ts`; a chat assistant's `draft_pour` link is `/map?draft=1&…`). The hook reads it once on arrival, like `?signin=1`; in-app triggers (**Rate this** on a drink, the waiting strip's **Rate it**, **Rate a drink**, "Rate … anyway" in the search) call `open()` and navigate nowhere. Closing, or logging, takes the request out of the address (`history.replaceState`) and leaves any other query.

One form (`PourForm.tsx`); its ledger is the card's Your pours (`PourLedger.tsx`). Ratings use the 9-point hedonic scale the pour record stores, as nine cells in an ink frame; "What was off" uses axis tags; spirit, glass, garnish and the sensory sliders sit behind "More detail" for signed-in members. Logging replaces the form, in the same card, with the after-a-pour screen (`Moved.tsx`) on the reveal ground, which the card takes for it: how far the pour moved your point, as the log says it (**Moved 0.7**, or **Held.** for a rating between 4 and 6), which way, and what the pour did to your menu (the drink's new rank, and a drink that joined it). The move itself is drawn on the map above the card, not on a chart of its own: a dashed terracotta trail from where you were (a ring) to your point, the drink marked, and the ground already changed by the rating; on a phone the screen scrolls back down so the map shows. **Done** returns the card to where to next, which already shows the new pour (the ledger, and the map, with your rating beside it) and has dropped the waiting pick.

---

## 4. Strict Enforcement Architecture

To guarantee the design system never drifts, automated enforcement is active at multiple layers:

### 1. ESLint Token Rules (`eslint.config.mjs`)
- **Banned Arbitrary Values**: Rejects Tailwind brackets like `bg-[#hex]`, `text-[13px]`, `shadow-[...]`.
- **Banned Raw Colors**: Rejects `#hex`, `rgba(...)`, `hsla(...)` in classes.
- **Banned Hand-Built Components**: Rejects a focus ring spelled out (`focus-visible:ring-*`, `focus-visible:outline-*`) a primary button spelled out (`bg-secondary` with `hover:bg-foreground`), and an outline button spelled out (`border-foreground` with `hover:bg-secondary`); use the classes above.
- **Banned Hand-Built Forms**: Rejects condensed caps spelled out (`font-condensed text-label uppercase tracking-label`: use `label-caps` for a label, `link-caps` for a text action), a link in a sentence spelled out (`underline decoration-muted-foreground`: `link-inline`), a section heading spelled out (`font-serif text-heading font-bold`: `SectionTitle`, or `text-plate` for a callout's title) and a ruled state line spelled out (`border-y border-border py-2.5 text-meta`: `Notice`).
- **Banned Default Scale**: Rejects Tailwind's own type sizes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`…) and `tracking-wide`/`wider`/`widest`; use the named roles above and `tracking-label` / `tracking-wordmark`.
- **Banned Opacity Modifiers**: Rejects a colour faded where it is used (`text-foreground/80`, `border-border/60`). De-emphasise text with size and weight; give a translucent colour a token.
- **Error Level**: Enforced as an error on `src/pages/`, `src/layouts/` and all of `src/components/`.

### 2. Copy Single Source of Truth (`src/lib/copy.ts`)
- All user-facing strings live in `src/lib/copy.ts`.
- No page, layout or component may hard-code interface text. This is a lint error: words in JSX text, and a literal `placeholder`, `aria-label`, `title` or `alt`, are rejected. Symbols and entities (`·`, `&rarr;`) are fine.
- Not covered: a sentence built in a variable, and the two places that keep words beside data on purpose (the quiz's questions, the drink and region prose).

### 3. Build & Static Analysis (`npm run check`)
- `npm run lexicons`: Checks AT Protocol schemas.
- `astro check`: Validates Astro component props and types.
- `tsc --noEmit`: Validates TypeScript types across the entire project.

### 4. Tests (`npm test`: Vitest in `tests/unit/`, Playwright in `tests/`)
- `tests/landing-static.spec.ts`: Asserts zero client scripts or hydration islands on `/` and `/sign-in`, a front door that asks one thing and fills the first screen exactly (header and content are `100dvh`, AppShell's `fill`, with the action at its foot), and the non-JS sign-in form.
- `tests/visual-identity.spec.ts`: Asserts computed CSS colors match the exact token values for paper ground (`rgb(244, 241, 230)`) and forest ink (`rgb(35, 52, 43)`).
- `tests/unit/drink-content.test.ts`: Asserts all drink entries join cleanly to the coordinate database and contain primary sources.
