# Design System Specification & Enforcement

This document specifies the design system of **Cotidal** and details the technical enforcement mechanisms that prevent drift.

---

## 1. Brand Philosophy: "Cold Instrument, Warm Secret"

The visual voice is an empirical, printed specimen catalog rather than a dim speakeasy:
- **Paper Ground**: Everything is ink on warm stock, not a glowing obsidian screen.
- **Restraint Over Ornamentation**: 1px hairline rules, generous whitespace, square edges, and dot leaders.
- **One Large Move Per Screen**: On `/`, it is the cotidal chart, `ChartFigure`. On `/drinks`, it is the title plate.
- **Zero Client JavaScript on Reading Routes**: The homepage (`/`) and register (`/drinks`, `/drinks/[slug]`) are pure static Astro.

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

**Colour rules.** Terracotta marks what is *yours* and nothing else: your dot, your region, your top pick, a value you gave and the app records (a rating, a chosen answer), and the focus ring. Forest is for acting and switching: the primary button, a pressed filter, segment or chip. **"You are here"** — the current page, tab or step — is neither: a bold label over a heavy ink (`foreground`) rule, like a printed tab (`.tab`, below). Links are underlined in grey-green and darken to ink on hover; text that is not underlined underlines on hover. Text is full-strength ink, forest, terracotta or grey-green — de-emphasise with size and weight, never with opacity.

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

A new size is added to `fontSize` in `tailwind.config.ts` **and** to `FONT_SIZES` in `src/lib/utils.ts` (`tests/class-merge.spec.ts` holds the two equal), so `cn()` does not read it as a colour.

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
- **Menu Row**: `.menu-row` creates a clean hairline top rule with generous breathing room.
- **Top pick sheet**: the one sheet that is yours — ink edge, `bg-card`, `shadow-mcm`.
- **Option plate**: the whole plate is the button; chosen = ink edge + `shadow-mcm`, struck through when the question asks what to push away.
- **Segmented control**: `.segmented` frame with `.segment` cells (`aria-pressed` is forest; a radio's `aria-checked` is terracotta, for what is yours). The columns are the caller's (`grid grid-cols-3`), or `.segmented-stack` for a column.
- **Tags**: axis (outline, forest), region (terracotta fill), status (sage fill). A static label is `.tag`; a toggle is `.chip` (`<Chip>`, `aria-pressed` is forest). Both are sentence case in PT Sans. No other tag styles.
- **Tab** ("you are here"): `.tab` — muted until `aria-current`, then bold ink over a 3px `foreground` rule. The caller sets which edge carries it: the app bar `border-t-3`, the harbour's steps `border-b-3`. The header nav draws the same rule from `lg`; the questions' progress bar is the same ink.
- **Caps link**: `.link-caps` — 44px, condensed, wide-set; the colour is the caller's. The italic underlined link in running serif is `.link-serif` (grey-green underline, ink on hover).
- **Section title**: `.section-title` — a rule of ink under a bold serif line.
- **Text field**: `.field` — 16px, hairline border, terracotta on focus.
- **Shared components** (`src/components/app/ui.tsx`, `PinnedCard.tsx`, `ColdState.tsx`): `ScreenHeader` (how an app screen opens: eyebrow, `text-title` heading, optional lede, left-aligned), `Empty` (a list with nothing in it yet: one italic sentence in the voice, ruled beneath, at most one action; it sits under the list's own heading), `GuestPrompt` (what signing in buys, with the one button; ruled above and below, not boxed), `Loading`, `Chip`, `PinnedCard` (the drink card and the bar card: pinned above the app bar), and `ColdState` (what Log and Rate say to someone with no coordinate).
- **Paper Grain**: `.bar-texture` applies a subtle SVG fractal grain texture.

---

## 3. Navigation System

Navigation is unified across the entire site through `<SiteHeader.astro>` and `<SiteFooter.astro>`, both rendered from one list (`destinations` in `src/lib/site-nav.ts`):
1. **Zero Client JavaScript**: Rendered as semantic HTML `<header>` and `<nav aria-label="Main Navigation">`.
2. **Destinations** (header): Radio (`/radio`), Compass (`/compass`), Log (`/log`), Drinks (`/drinks`), The Four Regions (`/#regions`). For Bars (`/bars`) is the supply side, a different product from the drinker's app, so it is in the footer and on the landing page, not the header; `/bars/*` is reserved for it and will get its own layout.
3. **The account control** (header) says what the server knows (`accountFor` in `session.ts`, read once in `AppShell`):
   - a member sees `@handle`, which opens the account (the foot of Log, `/log#account`), and **Sign out** — a plain form post that answers with a redirect, like sign-in, so it needs no script;
   - a guest sees **Sign in**;
   - a prerendered page (`/drinks`, `/regions/*`) was built before anyone visited, so it says **Account** (also `/log#account`) rather than guess. `/account` itself redirects there.
   - on an app page, **Sign in** opens the one sign-in sheet in place (`?signin=1`, handled by `AtprotoProvider`) rather than leaving for the landing page's form. On every other page it goes to `/#connect`.
4. **Footer**: the reading pages only — Home, Drinks, The Four Regions, For Bars (`app: false` in `destinations`). The app destinations and the account are always in the header. On a page with a bar pinned along the bottom (`AppShell`'s `bottomBar`) it is left out below `lg`: the bar is that page's foot, and the header's Menu already lists the same pages.
5. **Active State Indicators**: Routes are identified via `currentPath` and styled as a tab: bold ink over a 3px `foreground` rule from `lg`, bold alone in the phone's folded menu.
6. **Sub-Route Navigation**: In `/drinks/[slug]`, the header supports a semantic `backLink` while retaining global site navigation.
7. **Phones**: on the reading pages the header collapses to wordmark · account · Menu. On the app pages there is no Menu — the app bar is the navigation, and the reading pages and Go ashore sit at the foot of Log (`SiteHeader`'s `appPage`). "Menu" is a `<details>` that opens the same `<nav>` through `peer-open`, so `/` still ships no JavaScript; a member's Sign out sits at the foot of it.
8. **Focus mode**: any element marked `data-focus-mode` (the questions, the reveal, the after-a-pour screen) hides the site header and footer below `lg` (`globals.css`, pure CSS so nothing flashes before hydration).
9. **The app bar** (`AppBar.astro`): **Radio · Compass · Log** along the foot of a phone on the app pages (`AppShell`'s `bottomBar`) — listen, navigate, record. Plain links, no script; hidden in focus mode and from `lg`, where the header carries the same destinations. A card pinned above it (`PinnedCard`) uses the `tabbar` spacing token.
10. **Pick a drink** (`PickButton.astro`): choosing what to have is the one thing you *do*, not a place, so it is a floating button rather than a tab — above the app bar on a phone; from `lg` at the foot of the content's right edge (`right-frame-edge`), not the window's corner. It opens the harbour. Not drawn on the harbour, while a drink card is open, or in focus mode.
11. **Two tiers of page title.** Reading pages open with the centred `PageTitle`. App screens open with `ScreenHeader` — the tab's name as the eyebrow, then the screen's own title — left-aligned and at one size. Every app screen uses it: Radio, Compass and Log (eyebrow: the tab's name), the harbour (eyebrow "Pick a drink", the title the step's question, under the step strip), Rate ("Rate it" · "How was it?") and the cold state (`ColdState`). The two focused tasks, the harbour and Rate, keep a single centred form column on every width; the three tabs use the `frame` width and lay out in columns from `lg`.
12. **One sheet per screen.** Only what is yours — the top pick, the chosen option, the pinned card — is a sheet with `shadow-mcm`. Everything else is a ruled section (`section-title`) or rows. A map sits in a frame on the ground, as a printed chart does; that is a figure, not a sheet.
13. **Two kinds of empty.** A list with nothing in it yet is `Empty`: Radio's log and its Later dials, Log's ledger, Compass's menu without a coordinate, a search with no match, no bars near. A screen that cannot start without a coordinate is a `ScreenHeader` and its ways in: `ColdState` on Log and Rate, the harbour's own. Nothing else says "empty".

## The first-visit flow (`/questions`)

Questions → reveal → Compass. The questions are a page of their own (`Questions.tsx`): no tab is current and the bar along the foot is left out. Someone who already has a coordinate is sent on to Compass — the landing page's "Find your coordinate" is the same link for everyone — unless they came to start over (`/questions?startover=1`, from the account on Log), which clears the device's copy first. Skipping goes to Compass, which browses and searches without a coordinate; in the top pick's place it says the menu starts with the questions, rather than ranking drinks around a point nobody chose.

Sign-in is offered where it would keep something, as one sheet (`SignInSheet.tsx`, mounted once by `AtprotoProvider`) that states what it buys; the landing page's form (`ConnectForm.astro`) renders the same promise from `connect.buys` in `copy.ts`. The radar chart, the archetypes and the Oracle tab are retired from the interface; the region is the only identity.

## Signed in, signed out

Everything works signed out, on the device; signing in moves the record into the member's own account and is what the social half needs. Pages that differ are told which by the server (`accountFor`, passed to every island as `member`), so nothing guesses or flashes: the island never asks the browser who is signed in. A member's first visit settles what a guest did before signing in (`useProfile`): the coordinate and quiz answers waiting on the device are written to the account, unless the account already has a coordinate.

| | Signed out (guest) | Signed in (member) |
|---|---|---|
| **Compass** | Everything | Everything |
| **Pick a drink** (harbour) | Everything; the pick waits on the device | The same |
| **Rating** | Moves the coordinate on this device; the pour is kept there (`guestPours`, `device-store.ts`) | Written to the member's repository |
| **Radio** | Their pours on this device, and once what signing in buys | Their pours; Following and Nearby are **Later:** |
| **Log** | Coordinate and pours, marked *On this device*, and what signing in keeps; start over | `@handle`, coordinate, pours, the account (public map, share, chat assistants, start over, sign out) |
| **Rate** | The same form; the pour stays on the device | Written to the member's repository; the detail fields and cross-posting |

Signing out forgets the device's copy (`forgetDevice`), on whichever app page it lands (`AtprotoProvider`). A guest's pours stay on the device when they sign in; they are not written to the account on their behalf.

## Radio (`/radio`, `Radio.tsx`)

It opens with its `ScreenHeader` ("On the air"). Pours as they go out, newest first, kept like a radio log: grouped by day, the time in a narrow margin (`grid-cols-radio`), who sent it and where, the drink and its score. The dial is All · Following · Nearby; the last two say plainly that they are Later rather than standing empty. A pick waiting to be rated sits at the top.

From `lg` the log takes two thirds of AppShell's `frame` width and the dial sits beside it (sticky), with a pick waiting and what signing in buys; on a phone the dial comes first.

## Log (`/log`, `LogScreen.tsx`)

Yours — personal details, so the map lives here. It opens with its `ScreenHeader` ("Where you stand"), then the chart, then what the log adds up to (pours, bars, since, best so far), the ledger, and **the account** (`AccountSection.tsx`, `#account`): who you are, your public map, share, chat assistants, start over, and Go ashore. Rating is not here: "Rate a drink" beside the ledger opens `/rate`.

From `lg` the chart and its figures hold the left column (sticky) while the ledger and the account scroll beside them, in AppShell's `frame` width; on a phone they stack, chart first.

**The chart** (`Chart.tsx`):
- **The map** has a graticule — ticks along the frame every 2.5, longer at ±5 — as a printed chart marks its border. Each dot is a 24px target (`DrinkSpot`); drinks sharing a coordinate share one spot.
- **The title block** is the chart's cartouche: where you are (region and coordinate; "On this device" for a guest), the legend, and the reading (Drinks: your menu filled, the rest hollow; Your pours: liked 7+ filled, 5–6 hollow, 4 or below muted).
- **A drink** tapped on it opens in the drink card.

No trail of past positions is drawn yet; the pours to rebuild one from are stored.

## Compass (`/compass`, `Compass.tsx`)

Finding something, not looking at yourself: the taste map is Log's. It opens with its `ScreenHeader` ("Where to next"), then one search over drinks — by name or by what is in them ("mezcal") — and bars, across the page. Under it, a **street map** of the bars around you (`Near.tsx`, `NearMap.tsx`) and then your menu: the top-pick sheet and seven rows (`useMenu`, the same ranking Log's map fills in), then **Your bars** from your pours. Without a coordinate the menu's place is a ruled section that offers the questions.

- **From `lg` the map and the menu sit side by side** (the page uses AppShell's `frame` width, the header's own band): the map, taller, with the bars near you under it, on the left; the menu, or the search results, on the right. On a phone they stack, map first, and the map steps aside while a search is typed.

- **Bars come from OpenStreetMap** through the Overpass API (`src/lib/osm.ts`): named places tagged bar, pub, beer garden or club within about 1.2 km. Nothing is asked for until the reader taps **Show bars near me** — unless the browser already holds their yes for this site, and then the map opens on its own. The point leaves the device rounded to three decimal places (about 100 m), only to OpenStreetMap, and Cotidal keeps none of it; the panel says so.
- **The map is quieter than the chart.** OpenStreetMap's tiles are washed toward paper (`.map-paper` in `globals.css`) and carry no graticule or cartouche, so the two maps in the app do not look alike. Bars you have poured at — by name, or by where a pour said the bar was — are terracotta, the colour for what is yours. Leaflet loads only when the map shows.
- **The panel holds its height** (`h-72`) through every state — asking, finding, denied, failed — so nothing under it moves when the map fills.
- **A bar** opens in a card like the drink card: kind and distance, how often you have poured there, **Pick a drink here** — the harbour already there, carrying where the bar is — and a link to it on OpenStreetMap.

**The drink card** (`DrinkCard`, a `PinnedCard`, on Compass and Log alike): pinned above the app bar, the way a maps app opens a place — region and coordinate, build, closeness, your last pour, "Log this" and the register entry.

**Nothing moves under the reader.** A tap opens something where the thumb is rather than inserting it above what was tapped; anything that loads after paint (the top pick's line) holds its space while it does.

## Pick a drink (`/harbour`, `Harbour.tsx`)

The screen is "Pick a drink" to the people using it; the address and the code keep the name harbour.

At a bar, deciding. Composed in steps like a post, numbered in a three-cell strip: **Where** (a bar, a recent one, or at home) → **Menu** (type what they pour; a line that names a drink on the map is placed, anything else is kept and marked unplaced) → **Pick** (the placed drinks ranked by closeness, with the venue in the relevance score; the unplaced listed apart). "Pick this" keeps the pick on the device (`pick` in `device-store.ts`) and offers **Rate it now** — `/rate` opened on the pick as a draft (`draftPath`, the same hand-off a chat assistant uses), with no rating in it — or **Rate it later** (to Compass), in which case Radio, Compass and Log show it waiting until it is rated or set aside. Photographing the menu is **Later:**.

**Where the bar is.** A bar picked from the map carries its point through the pick, the draft link (`lat`, `lon` in `pour-draft.ts`) and the form, and the pour records it as `venue.address`: a `community.lexicon.location.geo` (`src/lib/atproto/location.ts`), the Lexicon Community's shape, strings not floats. It is written only while the pour is still at the bar the map named: typing another bar, or choosing At home, drops it. The tests validate it against the community's published lexicon (`tests/fixtures/community-lexicon/`).

**It orders nothing.** Cotidal is rarely connected to a bar's own system, so nothing in the interface says *order*: you pick, the bartender takes the order. Interface copy about the bar itself ("what to order once you know it") is fine.

## Rating a pour (`/rate`)

One screen of its own (`Rate.tsx`; no tab is current), opened on a drink handed over ("Log this", a pick, a chat's draft: `/log?drink=` and `/log?draft=` redirect here) or on the drink closest to you. One form (`PourForm.tsx`); its ledger is Log's (`PourLedger.tsx`). Ratings use the 9-point hedonic scale the pour record stores, as nine cells in an ink frame; "What was off" uses axis tags; spirit, glass, garnish and the sensory sliders sit behind "More detail" for signed-in members. It ends on the after-a-pour screen (`Moved.tsx`): where the coordinate went, and what the pour did to your menu (the drink's new rank, and a drink that joined it). "Back to your ledger" returns to Log.

---

## 4. Strict Enforcement Architecture

To guarantee the design system never drifts, automated enforcement is active at multiple layers:

### 1. ESLint Token Rules (`eslint.config.mjs`)
- **Banned Arbitrary Values**: Rejects Tailwind brackets like `bg-[#hex]`, `text-[13px]`, `shadow-[...]`.
- **Banned Raw Colors**: Rejects `#hex`, `rgba(...)`, `hsla(...)` in classes.
- **Banned Hand-Built Components**: Rejects a focus ring spelled out (`focus-visible:ring-*`, `focus-visible:outline-*`) a primary button spelled out (`bg-secondary` with `hover:bg-foreground`), and an outline button spelled out (`border-foreground` with `hover:bg-secondary`); use the classes above.
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

### 4. Browser & Contract Tests (`npx playwright test`)
- `tests/landing-static.spec.ts`: Asserts zero client scripts or hydration islands on `/`, server-rendered quadrants, and non-JS form fallback.
- `tests/visual-identity.spec.ts`: Asserts computed CSS colors match the exact token values for paper ground (`rgb(244, 241, 230)`) and forest ink (`rgb(35, 52, 43)`).
- `tests/drink-content.spec.ts`: Asserts all drink entries join cleanly to the coordinate database and contain primary sources.
