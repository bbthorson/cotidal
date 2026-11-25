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
- **Menu Row**: `.menu-row` creates a clean hairline top rule with generous breathing room.
- **Option plate**: the whole plate is the button; chosen = ink edge + `shadow-mcm`, struck through when the question asks what to push away.
- **Segmented control**: `.segmented` frame with `.segment` cells (`aria-pressed` is forest; a radio's `aria-checked` is terracotta, for what is yours). The columns are the caller's (`grid grid-cols-3`), or `.segmented-stack` for a column.
- **Tags**: axis (outline, forest), region (terracotta fill), status (sage fill). A static label is `.tag`; a toggle is `.chip` (`<Chip>`, `aria-pressed` is forest). Both are sentence case in PT Sans. No other tag styles.
- **Tab** ("you are here"): `.tab` — muted until `aria-current`, then bold ink over a 3px `foreground` rule. The caller sets which edge carries it: the app bar `border-t-3`. The header nav draws the same rule from `lg`; the questions' progress bar is the same ink.
- **Caps link**: `.link-caps` — 44px, condensed, wide-set; the colour is the caller's. The italic underlined link in running serif is `.link-serif` (grey-green underline, ink on hover).
- **Section title**: `.section-title` — a rule of ink under a bold serif line.
- **Text field**: `.field` — 16px, hairline border, terracotta on focus.
- **Shared components** (`src/components/app/ui.tsx`, `PinnedCard.tsx`, `ColdState.tsx`): `ScreenHeader` (how an app screen opens: `text-title` heading, optional lede, left-aligned; an eyebrow only on a sheet), `Empty` (a list with nothing in it yet: one italic sentence in the voice, ruled beneath, at most one action; it sits under the list's own heading), `GuestPrompt` (what signing in buys, with the one button; ruled above and below, not boxed), `Loading`, `Chip`, `PinnedCard` (the drink card and the bar card: pinned above the app bar), and `ColdState` (what Log, and the rating sheet, say to someone with no coordinate).
- **Paper Grain**: `.bar-texture` applies a subtle SVG fractal grain texture.

---

## 3. Navigation System

Navigation is unified across the entire site through `<SiteHeader.astro>` and `<SiteFooter.astro>`, both rendered from one list (`destinations` in `src/lib/site-nav.ts`):
1. **Zero Client JavaScript**: Rendered as semantic HTML `<header>` and `<nav aria-label="Main Navigation">`.
2. **Destinations** (header): Compass (`/compass`), Log (`/log`). Drinks (`/drinks`) and For Bars (`/bars`) are reading pages, so they are in the footer, not the header; For Bars is also the supply side, a different product from the drinker's app; `/bars/*` is reserved for it and will get its own layout.
3. **The account control** (header) says what the server knows (`accountFor` in `session.ts`, read once in `AppShell`):
   - a member sees `@handle`, which opens `/settings` (on a phone, the last row of Menu, marked **Settings →**). **Sign out** is on `/settings` alone — a plain form post that answers with a redirect, like sign-in, so it needs no script; the header never repeats it;
   - a guest sees **Sign in** (on a phone, inside Menu);
   - a prerendered page (`/drinks`, `/drinks/regions/*`) was built before anyone visited, so it says **Account** (also `/settings`, which sends a guest to `/sign-in`) rather than guess.
   - on an app page, **Sign in** opens the one sign-in sheet in place (`?signin=1`, handled by `AtprotoProvider`) rather than leaving for a page. On every other page it goes to `/sign-in`, which renders a plain form post and progressively enhances it with `<bsky-sign-in>`.
4. **Footer**: the reading pages only — How it works, Drinks, For Bars (`app: false` in `destinations`); a region page marks Drinks current here. The app destinations and the account are always in the header. On a page with a bar pinned along the bottom (`AppShell`'s `bottomBar`) it is left out below `lg`: the bar is that page's foot, and the header's Menu already lists the same pages.
5. **Active State Indicators**: Routes are identified via `currentPath` and styled as a tab: bold ink over a 3px `foreground` rule from `lg`, bold alone in the phone's folded menu.
6. **Sub-Route Navigation**: In `/drinks/[slug]`, the header supports a semantic `backLink` while retaining global site navigation.
7. **Phones**: on every page, app or reading, the header is wordmark · Menu — one control, so the header reads the same wherever you are. Menu opens three groups: the app (Compass, Log), the reading pages a drinker reads (`menu` in `destinations`: Drinks, How it works), and the account last, under an ink rule (Sign in, `@handle · Settings →`, or Account). On an app page the app bar repeats Compass and Log; that duplication is the one a thumb wants. "Menu" is a `<details>` that opens the same `<nav>` through `peer-open`, so `/` still ships no JavaScript.
8. **Focus mode**: any element marked `data-focus-mode` (the questions, the reveal) hides the site header and footer below `lg` (`globals.css`, pure CSS so nothing flashes before hydration).
9. **The app bar** (`AppBar.astro`): **Compass · Log** along the foot of a phone on the app pages and Settings (`AppShell`'s `bottomBar`) — choose, record. On Settings no tab is current. Plain links, no script; hidden in focus mode and from `lg`, where the header carries the same destinations. A card pinned above it (`PinnedCard`) uses the `tabbar` spacing token.
10. **One action per app screen.** Choosing what to have is the Compass tab (its search and **Have a menu?**); Log's action is **Rate a drink**. There is no floating Pick a drink button: on Log it was a second forest button beside Rate a drink, and it only repeated the tab under it.
11. **Two tiers of page title.** Reading pages open with the centred `PageTitle`. App screens open with `ScreenHeader` — the screen's own title, with an optional action button — left-aligned and at one size. Every app screen uses it: Compass and Log, a bar's menu on Compass (the title the bar's name), and the cold state (`ColdState`). A tab's screen has no eyebrow: the app bar, or the header from `lg`, already marks the tab current, and the same word again over the title is labelling for its own sake. The rating sheet, which no tab names, keeps its eyebrow ("Rate a drink"). A menu on Compass keeps a single centred column on every width; the two tabs use the `frame` width and lay out in columns from `lg`.
12. **One sheet per screen.** Only what is yours — the chosen option, the pinned card — is a sheet with `shadow-mcm`. Everything else is a ruled section (`section-title`) or rows. A map sits in a frame on the ground, as a printed chart does; that is a figure, not a sheet — and so is the chart's title block (`Chart.tsx`), which the frame continues around. A pick waiting to be rated (`WaitingPick`) is a strip ruled in ink, not a sheet, so it never competes with the chart.
13. **Two kinds of empty.** A list with nothing in it yet is `Empty`: Log's ledger, Compass's menu without a coordinate, a search with no match, no bars near. A screen that cannot start without a coordinate is a `ScreenHeader` and its ways in: `ColdState` on Log and in the rating sheet; a menu on Compass says what it needs in an `Empty`. Nothing else says "empty".
14. **One section heading.** A section inside any page, reading or app, opens with `section-title`: a bold Playfair line over an ink rule. A heading with a link beside it ("Its drinks →") draws the same rule under the row. Small caps label a field or a column, never a section.
15. **Nothing smaller than 13px is prose.** `text-label` (12px) is for condensed caps only. A note or citation under an item is `text-meta` in PT Sans; an italic gloss is Playfair at `text-ui`.
16. **The eyebrow is the name of the way in.** The small caps line over a title is the label of the nav item, tab or button that opens the page — Drinks, Regions, For bars, Chat assistants, Public map, Rate a drink — and a page about one item adds what kind of item after a middle dot (`Drinks · Aperitivo`, `Regions · Rich and savory`). The landing page has none, and nor does an app tab's screen, whose tab is already marked current on the same screen (rule 11). Write it in sentence case in `copy.ts`; the caps are CSS.

## The app as a chart

The screens show what the model already knows — where you are, how sure it is, the way you came, which way a drink lies and how far — instead of describing it: the chart first on Compass, your track on Log, how far a pour moved you after it, and the shoal narrowing under the questions (`Narrowing` in `Questionnaire.tsx`: the quiz's best guess, one standard deviation across on each axis, drawn small at the foot so a phone shows the question whole). The question's stage is its eyebrow; there is no row of stages at the foot, because after the four fixed openers the questions do not come in stage order.

**Signed out is one thing per screen.** A stranger is asked to do one thing: find their coordinate. A guest with a coordinate sees what a member sees; what signing in keeps is said once, at the foot of Log, after the first pour — the first moment it would keep something.

**Which way and how far, never a predicted score.** The filter's hedonic prediction sits near 9 for any drink close to you (see `applyPour`), so the interface does not show it as a forecast. Direction words are the axes' own: richer or crisper, sweeter or more savory.

## The first-visit flow (`/questions`)

Questions → reveal → Compass. The questions are a page of their own (`Questions.tsx`): no tab is current and the bar along the foot is left out. Someone who already has a coordinate is sent on to Compass — the landing page's "Find your coordinate" is the same link for everyone — unless they came to start over (`/questions?startover=1`, from `/settings` for members or the foot of Log for guests), which clears the device's copy first. Skipping goes to Compass, which says there is no position yet and offers the questions first, and search when asked for, rather than ranking drinks around a point nobody chose.

Sign-in is offered where it would keep something, as one sheet (`SignInSheet.tsx`, mounted once by `AtprotoProvider`, backed by `createSignInController` with remembered accounts, handle typeahead and in-flow account creation); the sign-in page (`ConnectForm.astro`, `/sign-in`) mirrors it via `<bsky-sign-in>` progressive enhancement over a plain form post, followed by `connect.buys` and `Principles`. The radar chart, the archetypes and the Oracle tab are retired from the interface; the region is the only identity.

## Signed in, signed out

Everything works signed out, on the device; signing in moves the record into the member's own account and is what the social half needs. Pages that differ are told which by the server (`accountFor`, passed to every island as `member`), so nothing guesses or flashes: the island never asks the browser who is signed in. A member's first visit settles what a guest did before signing in (`useProfile`): the coordinate and quiz answers waiting on the device are written to the account, unless the account already has a coordinate.

| | Signed out (guest) | Signed in (member) |
|---|---|---|
| **Compass** | Before a position: the chart, **Find your coordinate**, and search when asked for. After: everything | Everything |
| **A menu** (Compass) | Everything; the pick waits on the device | The same |
| **Rating** | Moves the coordinate on this device; the pour is kept there (`guestPours`, `device-store.ts`) | Written to the member's repository |
| **Log** | Coordinate, track and pours, marked *On this device*; what signing in keeps, once there is a pour; start over | Coordinate, track, pours, and a link to compare on your public map |
| **Your public map** (`/p/<handle>`) | — | Your map, your link, and **Compare palates**: people you follow who have a map (read on the server within a budget) and a handle form (`GET /p?handle=`) |
| **Settings** | — (sends a guest to `/sign-in`) | Who you are and Sign out; your public map and Share to your feed; chat assistants; start over |
| **Rating sheet** | The same form; the pour stays on the device | Written to the member's repository; the detail fields and cross-posting |

Signing out forgets the device's copy (`forgetDevice`), on whichever app page it lands (`AtprotoProvider`), while keeping remembered account cards (`atproto-cf-auth:recent-accounts`) for one-tap return sign-in. A guest's pours stay on the device when they sign in; they are not written to the account on their behalf.


## Log (`/log`, `LogScreen.tsx`)

Yours: where you are, the way you came, what moved you, and who to compare with. It opens with its `ScreenHeader` ("Your log" + primary **Rate a drink** button), then where you are (region and coordinate; "On this device" for a guest), **your track** (`TrackFigure`), what the log adds up to (pours, bars, moved in all, since; nothing before the first pour, where the log's own empty line says it) and EKF tolerances once trained, the log itself, and for a member a link to **Compare palates** on their public map (`/p/<handle>#compare`), where both dots are drawn. A guest finds Start over at the foot (`StartOver.tsx`). The account — public map, share, assistants, start over, sign out — is `/settings`, reached by your handle in the header. Log is also where a link from outside the app (a chat assistant's draft) lands.

From `lg` where you are, the track and the figures hold the left column (sticky) while the log scrolls beside them, in AppShell's `frame` width; on a phone they stack, track first.

**The track** (`TrackFigure.tsx`, `useTrack`, `src/lib/track.ts`) is never stored. It is replayed from your latest quiz's answers (the account's for a member, the device's copy for a guest; the centre for a guest who tried a pour first) through every pour since, by the same `applyPour` that moved you, and drawn only when the replay lands where you are. The figure is zoomed to the track so a half-point move shows: a square where you started, a dot per pour that moved you, numbered as the log numbers them, and you at the end.

**The log** (`PourLedger.tsx`): each pour a numbered entry, newest first — the drink (linked to its entry in Drinks), the score, where and when, and **Moved 0.7** or **Held** (a rating between 4 and 6 moves nothing) when the track adds up; what was off and the note under it. The last entry is where the track starts: the questions, or the centre.

A guest is told what signing in keeps once, under the log, after the first pour — the first moment it would keep something.

## Settings (`/settings`, `settings.astro`)

A member's account as one app screen: the app bar along the foot (no tab current), a left-aligned title like a tab's screen, and rows — a thing, a line about it, its one action on the right. In order: who you are signed in as, with **Sign out** beside it (the only place it is offered); **Your map** (Public map → Open, Share to your feed → Share); **Chat assistants** (connected ones with Disconnect, or how to set one up); **Start over**. Server-rendered with plain form posts and no script: sharing is a form post the page answers with a redirect and a notice, like Disconnect.

## Compass (`/compass`, `Compass.tsx`)

The chart first. It opens with its `ScreenHeader` ("Where to next"), then **the chart** (`Chart.tsx`): every drink at its place, you, the **shoal** around you (`ShoalMark`: pale water whose radius is the track's spread, dashed, with no number), **your track** (`TrackLine`) when it adds up, and the title block (where you are, the legend, Drinks or Your pours). It does not say *On this device* for a guest: Log, the screen about your record, says where it is kept. Then one search over drinks — by name or by what is in them ("mezcal") — and bars, **Have a menu?**, **Your menu** (`useMenu`: eight drinks, each with which way it lies from you and how far, `wayTo`; the first in terracotta), **Your bars** from your pours, and the bars near you (`Near.tsx`, `NearMap.tsx`).

The menu is ranked by distance (`scoreDrinks`, `relevanceOf` in `scoring.ts`): drinks are taken in 1-point bands, nearest first, and only within a band do the vibe tags, a good pour at this bar and the trained tolerances set the order. A drink you rated 7 or more counts as 2 points closer, so it can rank above a nearer one; one rated 3 or less comes off. Every screen shows the same figure for a drink: how far it sits from you (the menu, search, a bar's menu, the drink card). There is no 0–100 score in the interface.

**Before you have a position** Compass asks one thing: "No position yet", one line, **Find your coordinate** and "or look up a drink" above the chart, which shows every drink and no title block. Search and bars appear when asked for; there is no menu, because ranking around a point nobody chose would be nobody's.

- **From `lg` the chart sits beside the menu** (sticky, in AppShell's `frame` width); on a phone they stack, chart first, and the chart steps aside while a search is typed.

- **Bars come from OpenStreetMap** through the Overpass API (`src/lib/osm.ts`): named places tagged bar, pub, beer garden or club within about 1.2 km. Nothing is asked for until the reader taps **Show bars near me** — unless the browser already holds their yes for this site, and then the map opens on its own. The point leaves the device rounded to three decimal places (about 100 m), only to OpenStreetMap, and Cotidal keeps none of it; the panel says so.
- **The map is quieter than the chart.** OpenStreetMap's tiles are washed toward paper (`.map-paper` in `globals.css`) and carry no graticule or cartouche, so the two maps in the app do not look alike. Bars you have poured at — by name, or by where a pour said the bar was — are terracotta, the colour for what is yours. Leaflet loads only when the map shows.
- **Before it is asked for, a ruled section** ("Near you", the note on where the location goes, **Show bars near me**), not an empty frame. **Once asked, the panel holds its height** (`h-72`, `h-96` from `lg`) through every state — finding, denied, failed — so nothing under it moves when the map fills.
- **A bar** opens in a card like the drink card: kind and distance, how often you have poured there, **Pick a drink here** — that bar's menu, opened in place of the list and carrying where the bar is — and a link to it on OpenStreetMap.

**The drink card** (`DrinkCard`, a `PinnedCard`, on Compass and Log alike): pinned above the app bar, the way a maps app opens a place — region and coordinate, build, closeness, your last pour, "Log this" and the register entry.

**Nothing moves under the reader.** A tap opens something where the thumb is rather than inserting it above what was tapped; anything that loads after paint holds its space while it does.

## A menu on Compass (`MenuView.tsx`, `menu-rank.ts`)

Choosing what to have is part of Compass, not a screen of its own. A bar opened from the map, from search or from "Your bars", or **Have a menu?** under the search (or `/compass?menu=1`, which the floating Pick a drink button on Log uses), replaces the list with one sheet: a back link, the bar's name as the title (or "Have a menu?" with an optional bar-name field when there is no bar), and the menu input. Type what they pour: a line that names a drink on the map (`matchDrink`) is placed, anything else is kept and marked unplaced. Once there are placed drinks they are ranked by closeness, with the bar in the relevance score (`rankMenu`), and **Pick this** keeps the pick on the device (`pick` in `device-store.ts`) and returns to Compass, where the waiting strip offers **Rate it** — the rating sheet opened on the pick as a draft (the same hand-off a chat assistant's link makes), with no rating in it — or **Set it aside**. A menu with no bar is a pick at home. A drink opened in the drink card on Compass can be picked the same way (**Pick this**; no bar, so no place). Photographing the menu is **Later:**.

**Where the bar is.** A bar picked from the map carries its point through the pick, the draft link (`lat`, `lon` in `pour-draft.ts`) and the form, and the pour records it as `venue.address`: a `community.lexicon.location.geo` (`src/lib/atproto/location.ts`), the Lexicon Community's shape, strings not floats. It is written only while the pour is still at the bar the map named: a menu opened with no bar, or with another bar typed, drops it. The tests validate it against the community's published lexicon (`tests/fixtures/community-lexicon/`).

**It orders nothing.** Cotidal is rarely connected to a bar's own system, so nothing in the interface says *order*: you pick, the bartender takes the order. Interface copy about the bar itself ("what to order once you know it") is fine.

## Rating a pour (the rating sheet)

A sheet over the screen you are on, not a page and not a tab: `RateSheet.tsx`, a Radix dialog like the sign-in sheet (focus trapped and returned to what opened it, Escape and **Close** dismiss it, it scrolls on a phone, inputs stay 16px). A tap on the scrim does not close it, so a half-written note is not lost; it cannot be dismissed while a pour is being written. It opens with focus on the sheet itself, not on Close. Something missing (the drink, the bar or "At home", the rating) is said under that field, which takes focus, and goes away once it is answered; only what the server says sits under **Log it**. Centred from `sm`, it keeps 2rem of ground above and below (`max-h-sheet`). Compass and Log each mount one, driven by `useRateSheet`, and give it their own coordinate and pours, so a pour updates the screen underneath in place.

**URL contract.** `?rate=<drink>` on `/compass` or `/log` opens it on that drink (`?rate=` alone: on the drink closest to you); `?draft=1&drink=…` opens it on a draft (`pour-draft.ts`; a chat assistant's `draft_pour` link is `/log?draft=1&…`). The hook reads it once on arrival, like `?signin=1`; in-app triggers (**Rate this** on a drink card, the waiting strip's **Rate it**, **Rate a drink** on Log, "Rate … anyway" in Compass search) call `open()` and navigate nowhere. Closing, or logging, takes the request out of the address (`history.replaceState`) and leaves any other query.

One form (`PourForm.tsx`); its ledger is Log's (`PourLedger.tsx`). Ratings use the 9-point hedonic scale the pour record stores, as nine cells in an ink frame; "What was off" uses axis tags; spirit, glass, garnish and the sensory sliders sit behind "More detail" for signed-in members. Logging replaces the form, in the same sheet, with the after-a-pour screen (`Moved.tsx`) on the reveal ground — full-bleed on a phone: how far the pour moved you, as the log says it (**Moved 0.7**, or **Held.** for a rating between 4 and 6), which way, where you were and where you are with the drink that pulled you, and what the pour did to your menu (the drink's new rank, and a drink that joined it). No shoal: one pour narrows it too little to see. **Done** closes the sheet onto the screen underneath, which already shows the new pour (Log's ledger and chart) and has dropped the waiting pick (Compass).

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

### 4. Tests (`npm test`: Vitest in `tests/unit/`, Playwright in `tests/`)
- `tests/landing-static.spec.ts`: Asserts zero client scripts or hydration islands on `/` and `/sign-in`, a front door that asks one thing and fills the first screen exactly (header and content are `100dvh`, AppShell's `fill`, with the action at its foot), and the non-JS sign-in form.
- `tests/visual-identity.spec.ts`: Asserts computed CSS colors match the exact token values for paper ground (`rgb(244, 241, 230)`) and forest ink (`rgb(35, 52, 43)`).
- `tests/unit/drink-content.test.ts`: Asserts all drink entries join cleanly to the coordinate database and contain primary sources.
