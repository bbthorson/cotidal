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

| Token | Value | |
|---|---|---|
| `--background` | `220 15% 8%` | Obsidian, warm-shifted |
| `--primary` | `36 72% 55%` | Amber — the warm light |
| `--secondary` | `18 60% 52%` | Burnished copper |
| `--muted-foreground` | `35 15% 58%` | Warm grey |

Open question: copper sits close enough to amber that it creates no tension.
Elegant-and-mysterious lives in **warm light against cold dark**, so a deep
teal or midnight (near the existing `--chart-3`, `197 37% 24%`) is the better
secondary. Not yet changed.

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

Items 1 and 3 are currently conventions. Lint enforcement (banning arbitrary
values such as `bg-[#hex]`) is the next step — the failures above are exactly
what convention alone does not catch.
