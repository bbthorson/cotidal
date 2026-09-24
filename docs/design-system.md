# Design System Specification & Enforcement

This document specifies the design system of **The Crystal Coupe** and details the technical enforcement mechanisms that prevent drift.

---

## 1. Brand Philosophy: "Cold Instrument, Warm Secret"

The visual voice is an empirical, printed specimen catalog rather than a dim speakeasy:
- **Paper Ground**: Everything is ink on warm stock, not a glowing obsidian screen.
- **Restraint Over Ornamentation**: 1px hairline rules, generous whitespace, square edges, and dot leaders.
- **One Large Move Per Screen**: On `/`, it is the geometric `CoupeFigure`. On `/drinks`, it is the title plate.
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

### Elevation & Shadows
| Token | Definition | Intent |
|---|---|---|
| `shadow-bar` | `0 1px 2px 0 hsl(40 20% 40% / 0.06), 0 8px 24px -12px hsl(40 20% 30% / 0.18)` | A sheet lifted slightly off paper stock |
| `shadow-mcm` | `4px 4px 0px 0px hsl(8 55% 40%)` | Hard letterpress offset in terracotta |
| `shadow-glow` | `inset 0 0 0 1px hsl(41 29% 81%)` | An impression/stamp, not a digital light halo |

### Form & Component Patterns
- **Dot Leader**: `.dot-leader` with `.leader` spacer for wine-list style alignments (`Name .......... Amount`).
- **Menu Row**: `.menu-row` creates a clean hairline top rule with generous breathing room.
- **Coaster**: `.coaster` applies nearly square corners (`rounded-sm`) with an inset border impression.
- **Paper Grain**: `.bar-texture` applies a subtle SVG fractal grain texture.

---

## 3. Navigation System

Navigation is unified across the entire site through `<SiteHeader.astro>`:
1. **Zero Client JavaScript**: Rendered as semantic HTML `<header>` and `<nav aria-label="Main Navigation">`.
2. **Unified Destinations**:
   - **Palate Map** (`/taste`)
   - **The Register** (`/drinks`)
   - **The Four Regions** (`/#regions`)
   - **Sign In** (`/#connect`)
3. **Active State Indicators**: Routes are identified via `currentPath` and styled with `bg-secondary text-secondary-foreground shadow-bar`.
4. **Sub-Route Navigation**: In `/drinks/[slug]`, the header supports a semantic `backLink` while retaining global site navigation.
5. **In-App Controls**: In `/taste`, `<AppNavigation />` adheres strictly to the paper token system (square corners, `font-condensed text-xs uppercase tracking-label`).

---

## 4. Strict Enforcement Architecture

To guarantee the design system never drifts, automated enforcement is active at multiple layers:

### 1. ESLint Token Rules (`eslint.config.mjs`)
- **Banned Arbitrary Values**: Rejects Tailwind brackets like `bg-[#hex]`, `text-[13px]`, `shadow-[...]`.
- **Banned Raw Colors**: Rejects `#hex`, `rgba(...)`, `hsla(...)` in classes.
- **Error Level**: Enforced strictly on `src/pages/`, `src/layouts/`, and `src/components/marketing/`.

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
