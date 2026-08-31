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
| **The Ember** | Rich · Savory | Bitter, aged, unhurried. Drinks that argue back. |
| **The Salt Line** | Crisp · Savory | Dry, mineral, exact. Nothing hidden behind sugar. |
| **The Vault** | Rich · Sweet | Dense and warm. The last drink of the night. |
| **The Orchard** | Crisp · Sweet | Bright, fast, built for company. |

The naming is deliberately a little astrological: a coordinate you *have*, a
place you belong, glossed but never justified. These names are a proposal —
they live in `src/lib/copy.ts` and can be replaced in one file.

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

The obsidian palette is kept behind `.dark` in `globals.css` so the inversion
is reversible. Nothing toggles that class today.

### Shadows

On paper, light does not glow — it presses. `shadow-glow` is now an inset
hairline (an impression, not a halo), `shadow-bar` lifts a sheet a millimetre
off the stock, and `shadow-mcm` is a hard letterpress offset in terracotta.

### Form

- **Hairline rules over boxes.** Sections are separated by a 1px rule, and the
  heavier rule is `--foreground`, not `--border`.
- **Square corners.** Radius is used sparingly; a menu is not a card UI.
- **Dot leaders** carry name → amount, the way a wine list does
  (`.dot-leader` with a `.leader` spacer in `globals.css`).
- **One large move per screen.** On `/` it is the coupe figure; on a drink
  entry it is the title plate.

## Rules

Everything user-facing is a pure function of tokens, schema, content, and
state — none of which may be authored inside a component.

1. **No raw values in components.** Colours, sizes, and shadows come from
   Tailwind tokens. Undefined utilities fail silently: `text-2xs` and
   `text-3xs` were used 41 times while defined nowhere, and every one of those
   elements rendered at inherited size.
2. **No hard-coded copy in marketing components.** Strings live in
   `src/lib/copy.ts` so the voice can be revised in one place.
3. **Fonts are tokens too.** `font-body` / `font-serif` / `font-condensed`
   resolve through `--font-*` variables in `globals.css`. Those variables were
   missing entirely, so all three Google Fonts downloaded and none applied.

Item 1 is enforced: `eslint.config.mjs` bans arbitrary Tailwind values and raw
colours, as an error in `src/pages/`, `src/layouts/` and
`src/components/marketing/`, and as a warning elsewhere so the pre-existing
violations in `src/components/app/` stay visible without blocking a commit.
Those ~38 remaining warnings are the last place raw colour still lives, and
they are the reason `/taste` has not fully followed the palette across.

Item 3 is still a convention.
