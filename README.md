# The Crystal Coupe

Every palate has a coordinate. The Crystal Coupe finds yours, then tells you
what to order.

## What it does

Two axes — **rich to crisp**, **savory to sweet** — locate your taste as a
point on a map. What surrounds that point is what you should be drinking. Log
what you actually drink and the point moves.

The profile is written to **your own** AT Protocol repository, not ours.

## Concepts

### The coordinate

A short adaptive conversation places you on the map. Only the first three
questions are fixed; after that the selector picks whichever question reduces
the most uncertainty (`src/lib/question-selector.ts`, `src/lib/belief-state.ts`).

The four quadrants are named in `docs/brand.md`.

### Context

Your taste does not change, but your situation does. Contexts (`usual`,
`business`, `party`, `holiday`) re-weight what lights up around you — **your
dot does not move**.

### The record

Drinks you log are dated, signed entries in your repo. Menus are posts, venues
claim themselves by proving their domain, and ratings attach to recipes rather
than to people. The reasoning is in **[docs/data-model.md](docs/data-model.md)**.

## Stack

| | |
|---|---|
| Framework | [Astro 7](https://astro.build/), server output |
| Hosting | [Cloudflare](https://developers.cloudflare.com/workers/) (`@astrojs/cloudflare`) |
| UI | [React 19](https://react.dev/) islands, [Radix](https://www.radix-ui.com/), [Tailwind](https://tailwindcss.com/) |
| Identity | [AT Protocol](https://atproto.com/) OAuth (`@atproto/oauth-client-node`) |
| Drink data | [TheCocktailDB](https://www.thecocktaildb.com/) |
| Model | [Vercel AI SDK](https://sdk.vercel.ai/docs) (`@ai-sdk/google`) |

### Routes

- **`/`** — the landing page. Pure Astro, **zero client JavaScript**; sign-in
  is a plain form post that works without it.
- **`/taste`** — the interactive app. The only route that mounts an island.
- **`/drinks`** — the register: what is actually known about a drink, separated
  from what is only repeated about it. Static, zero client JavaScript.

Keep it that way: `client:only` on the whole app previously meant ~860 KB of
JavaScript had to download and hydrate before anything painted at all,
including on the landing page. `tests/landing-static.spec.ts` guards it.

## Getting started

```bash
npm install
npm run dev        # http://localhost:9002
```

### Scripts

```bash
npm run build      # production build
npm run typecheck  # lexicons + astro check + tsc
npm run lexicons   # validate lexicon schemas and their refs
npx playwright test
```

The suite needs no model key: `useBartenderChat` serves canned copy and model
boundaries are mocked. In sandboxes without a matching browser, set
`PLAYWRIGHT_CHROMIUM_PATH`, `PLAYWRIGHT_NO_SANDBOX`, and
`PLAYWRIGHT_SKIP_WEBSERVER`.

## Docs

- **[docs/data-model.md](docs/data-model.md)** — entities, unclaimed
  references, menus-as-posts, why nobody rates people
- **[docs/brand.md](docs/brand.md)** — voice, palette, and the rules that keep
  styling out of components
- **[AGENTS.md](AGENTS.md)** — architecture notes for contributors

## License

Private
