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

**Colour rules.** Terracotta marks what is *yours* (your dot, your top pick, focus); forest is for actions (primary buttons, active tabs). Text is full-strength ink, forest, terracotta or grey-green — de-emphasise with size and weight, never with opacity.

### The reveal ground (`reveal-*`)
Forest laid as the stock, paper as the ink. Used **only** where the product reveals something: the coordinate landing after the questions (`Reveal.tsx`) and moving after a pour (`Moved.tsx`). Never a theme the user switches to.

| Token | HSL Value | Hex | Role |
|---|---|---|---|
| `--reveal` | `148 20% 17%` | `#23342B` | Ground |
| `--reveal-foreground` | `47 39% 93%` | `#F4F1E6` | Text and rules |
| `--reveal-muted` | `80 24% 76%` | `#C6D1B2` | Labels (sage) |
| `--reveal-mark` | `9 55% 52%` | `#C8543F` | Your dot |
| `--reveal-trace` | `12 58% 78%` | `#E7B3A6` | Where your dot was |

### Typography Tokens
| Token | Font Family / Size | Tracking / Leading | Usage |
|---|---|---|---|
| `font-serif` | Playfair Display | `leading-display` | Headlines, titles, drink names |
| `font-body` | PT Sans | Normal | Editorial body prose, paragraphs |
| `font-condensed` | Barlow Condensed | `tracking-label` (0.2em) | Metadata labels, coordinates, nav links |
| `label-caps` | Barlow Condensed | `text-3xs uppercase tracking-label text-muted-foreground` | Standard field / column label |
| `tracking-wordmark` | `0.15em` | — | Site title wordmark |
| `text-3xs` | `0.625rem` / `0.875rem` | — | Micro labels & colophons |
| `text-2xs` | `0.6875rem` / `1rem` | — | Footnotes, specimen markers |
| `text-meta` | 13px / 1.5 | — | PT Sans small: glosses, notes |
| `text-ui` | 15px / 1.55 | — | PT Sans body |
| `text-prose` | 17px / 1.6 | — | Playfair prose |
| `text-plate` | 19px / 1.3 | — | Option and drink names |
| `text-title` | 30px / 1.15 | — | A question, a drink, a sheet title |
| `text-hero` | 40px / 1.05 | — | Landing headline on a phone |
| `text-region` | 56px / 1 | — | A region, revealed (Playfair 400 italic) |

Fonts (`Base.astro`): Playfair Display 400, 400 italic and 700; PT Sans 400/700; Barlow Condensed 400/600/700. `font-mono` resolves to Barlow — monospace is not a brand face.

### Elevation & Shadows
| Token | Definition | Intent |
|---|---|---|
| `shadow-bar` | `0 1px 2px 0 hsl(40 20% 40% / 0.06), 0 8px 24px -12px hsl(40 20% 30% / 0.18)` | A sheet lifted slightly off paper stock |
| `shadow-mcm` | `4px 4px 0px 0px hsl(8 55% 40%)` | Hard letterpress offset in terracotta |
| `shadow-glow` | `inset 0 0 0 1px hsl(41 29% 81%)` | An impression/stamp, not a digital light halo |

### Corners
Radius is 0 for sheets, plates, buttons and tabs. `rounded-sm` (2px) is the one exception, for inputs. `rounded-full` stays for the dots on the map.

### Form & Component Patterns
- **Dot Leader**: `.dot-leader` with `.leader` spacer for wine-list style alignments (`Name .......... Amount`).
- **Menu Row**: `.menu-row` creates a clean hairline top rule with generous breathing room.
- **Top pick sheet**: the one sheet that is yours — ink edge, `bg-card`, `shadow-mcm`.
- **Option plate**: the whole plate is the button; chosen = ink edge + `shadow-mcm`, struck through when the question asks what to push away.
- **Segmented control**: four equal cells in an ink frame; active cell `bg-secondary`.
- **Tags**: axis (outline, forest), region (terracotta fill), status (sage fill). No other tag styles.
- **Paper Grain**: `.bar-texture` applies a subtle SVG fractal grain texture.

---

## 3. Navigation System

Navigation is unified across the entire site through `<SiteHeader.astro>` and `<SiteFooter.astro>`, both rendered from one list (`destinations` in `src/lib/site-nav.ts`):
1. **Zero Client JavaScript**: Rendered as semantic HTML `<header>` and `<nav aria-label="Main Navigation">`.
2. **Destinations** (header): Palate Map (`/taste`), Log a Pour (`/log`), Drinks (`/drinks`), The Four Regions (`/#regions`), For Bars (`/bars`).
3. **The account control** (header) says what the server knows (`accountFor` in `session.ts`, read once in `AppShell`):
   - a member sees `@handle`, which opens `/account`, and **Sign out** — a plain form post that answers with a redirect, like sign-in, so it needs no script;
   - a guest sees **Sign in**;
   - a prerendered page (`/drinks`, `/regions/*`) was built before anyone visited, so it says **Account** (`/account`) rather than guess.
4. **Footer**: the reading pages only — Home, Drinks, The Four Regions, For Bars. The app destinations and the account are always in the header.
5. **Active State Indicators**: Routes are identified via `currentPath` and styled with `bg-secondary text-secondary-foreground shadow-bar`.
6. **Sub-Route Navigation**: In `/drinks/[slug]`, the header supports a semantic `backLink` while retaining global site navigation.
7. **Phones**: the header collapses to wordmark · account · Menu. "Menu" is a `<details>` that opens the same `<nav>` through `peer-open`, so `/` still ships no JavaScript; a member's Sign out sits at the foot of it.
8. **Focus mode**: any element marked `data-focus-mode` (the quiz, the reveal, the after-a-pour screen) hides the site header and footer below `lg` (`globals.css`, pure CSS so nothing flashes before hydration).
9. **In-App Controls**: In `/taste`, `<AppNavigation />` is Menu · Map — a bar along the bottom of a phone (the footer clears it: `AppShell`'s `bottomBar`), a ruled strip above the content from `lg`. Logging a pour is `/log`, not a tab; "Log this" on the map opens `/log?drink=…`.

## The first-visit flow (`/taste`)

Questions → reveal → your menu. Sign-in is offered once, after the reveal, as one sheet (`SignInSheet.tsx`) that states what it buys; the landing page's form (`ConnectForm.astro`) renders the same promise from `connect.buys` in `copy.ts`. The radar chart, the archetypes and the Oracle tab are retired from the interface; the region is the only identity. Logging a pour ends on the after-a-pour screen, which shows the coordinate moving and what changed on the menu.

## Logging a pour (`/taste` Log tab and `/log`)

One form (`PourForm.tsx`) and one ledger (`PourLedger.tsx`) serve both places. Ratings use the 9-point hedonic scale the pour record stores, as nine cells in an ink frame; "What was off" uses axis tags; spirit, glass, garnish and the sensory sliders sit behind "More detail" for signed-in members. Both places end on the same after-a-pour screen (`Moved.tsx`).

## The Map tab (`MapTab.tsx`)

The square map with three readings: Everything (menu drinks filled), Your menu, and Your pours (liked 7+ filled, 5–6 hollow, 4 or below muted). Each dot is a 24px target (`DrinkSpot`); drinks sharing a coordinate share one spot. Tapping a dot or a list row opens the drink under the map: region and coordinate, build, closeness, your last pour, "Log this" (which opens the Log tab on that drink) and the register entry. The list below is the full-size path to every drink. No trail of past positions is drawn, because coordinate history is not stored.

---

## 4. Strict Enforcement Architecture

To guarantee the design system never drifts, automated enforcement is active at multiple layers:

### 1. ESLint Token Rules (`eslint.config.mjs`)
- **Banned Arbitrary Values**: Rejects Tailwind brackets like `bg-[#hex]`, `text-[13px]`, `shadow-[...]`.
- **Banned Raw Colors**: Rejects `#hex`, `rgba(...)`, `hsla(...)` in classes.
- **Error Level**: Enforced as an error on `src/pages/`, `src/layouts/` and all of `src/components/`.

### 2. Copy Single Source of Truth (`src/lib/copy.ts`)
- All user-facing strings live in `src/lib/copy.ts`.
- No marketing or public-facing component may hard-code interface text.

### 3. Build & Static Analysis (`npm run check`)
- `npm run lexicons`: Checks AT Protocol schemas.
- `astro check`: Validates Astro component props and types.
- `tsc --noEmit`: Validates TypeScript types across the entire project.

### 4. Browser & Contract Tests (`npx playwright test`)
- `tests/landing-static.spec.ts`: Asserts zero client scripts or hydration islands on `/`, server-rendered quadrants, and non-JS form fallback.
- `tests/visual-identity.spec.ts`: Asserts computed CSS colors match the exact token values for paper ground (`rgb(244, 241, 230)`) and forest ink (`rgb(35, 52, 43)`).
- `tests/drink-content.spec.ts`: Asserts all drink entries join cleanly to the coordinate database and contain primary sources.
