# Cotidal

Every palate has a coordinate. Cotidal finds yours, then tells you
what to order.

## What it does

Two axes — **rich to crisp**, **savory to sweet** — locate your taste as a
point on a map. What surrounds that point is what you should be drinking. Log
what you actually drink and the point moves.

The profile is written to **your own** AT Protocol repository, not ours.

## Concepts

### The coordinate

A short adaptive quiz places you on the map. Only the first four questions
are fixed; after that the selector asks whichever question carries the most
expected information about your position (`src/lib/question-selector.ts`,
`src/lib/belief-state.ts`).

The four quadrants are named in `docs/brand.md`.

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
| Identity | [AT Protocol](https://atproto.com/) OAuth (`@bbthorson/atproto-cf-auth`) |
| Drink data | `src/lib/data.ts` (positions on the map), `src/content/drinks/` (the register's prose) |
| Model | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) + [AI Gateway](https://developers.cloudflare.com/ai-gateway/) |

Deploys are handled by Cloudflare's own Git integration — it builds and
releases the Worker on push. There is deliberately no deploy workflow in
`.github/workflows/`; the one that used to live there duplicated that job and
uploaded `dist` as a static directory, which is not what an `output: 'server'`
build produces. CI (`ci.yml`) only lints, typechecks, builds and tests.

### Routes

- **`/`** — the landing page. Pure Astro, **zero client JavaScript**; sign-in
  is a plain form post that works without it.
- **`/taste`** — the quiz, the reveal and your menu. A React island.
- **`/log`** — log a pour and watch the coordinate move. A React island.
- **`/drinks`** — the register: what is actually known about a drink, separated
  from what is only repeated about it. Static, zero client JavaScript.
- **`/regions/<id>`** — one page per region. Static.
- **`/p/<handle>`** — someone's coordinate at a public URL, with yours beside
  it if you are signed in. Server-rendered, zero client JavaScript.
- **`/account`** — who you are signed in as, starting over, and signing out.
  Server-rendered, zero client JavaScript.
- **`/bars`** — the placeholder for venues.

Only `/taste` and `/log` mount islands. Keep it that way: `client:only` on the whole app previously meant ~860 KB of
JavaScript had to download and hydrate before anything painted at all,
including on the landing page. `tests/landing-static.spec.ts` guards it.

## Getting started

```bash
npm install
npm run dev        # open http://127.0.0.1:9002 — sign-in needs 127.0.0.1, not localhost
```

### Scripts

```bash
npm run build      # production build
npm run typecheck  # lexicons + astro check + tsc
npm run lexicons   # validate lexicon schemas and their refs
npm run check      # lint + typecheck
npm run build && CI=1 npx playwright test   # the suite, as CI runs it
```

Run the suite against the preview build, as above: with `CI` set, Playwright
serves `npm run preview`. Against `npm run dev`, React 19's development build
on workerd breaks server rendering and about a third of the suite fails.

The suite needs no model key: nothing in the quiz calls a model, and model
boundaries are mocked. In sandboxes without a matching browser, set
`PLAYWRIGHT_CHROMIUM_PATH` and `PLAYWRIGHT_NO_SANDBOX`; set
`PLAYWRIGHT_SKIP_WEBSERVER` to test against a server you started yourself.

**Running the suite from an AI coding agent:** Astro 7 detects agent
environments and starts `astro dev` and `astro preview` in the *background*.
Playwright waits for a long-lived process, so it sees the server exit
immediately and reports "webServer exited early" — the tests never run. Setting
`ASTRO_DEV_BACKGROUND` and `ASTRO_PREVIEW_BACKGROUND` (to any value) turns that
detection off:

```bash
ASTRO_DEV_BACKGROUND=1 ASTRO_PREVIEW_BACKGROUND=1 CI=1 npx playwright test
```

In Claude Code on the web, `.claude/hooks/session-start.sh` sets both. This
does not affect CI or a normal terminal, where no agent is detected.

## Docs

- **[docs/data-model.md](docs/data-model.md)** — entities, unclaimed
  references, menus-as-posts, why nobody rates people
- **[docs/lexicon-adoption.md](docs/lexicon-adoption.md)** — why and how
  venues, apps, and creators adopt `app.cotidal.*`
- **[docs/brand.md](docs/brand.md)** — voice, palette, and the rules that keep
  styling out of components
- **[docs/design-system.md](docs/design-system.md)** — the tokens, component
  patterns and how the rules are enforced
- **[docs/generation.md](docs/generation.md)** — what the model may write, who
  sees it, and why the bill is set by the rate limiter rather than the model
- **[docs/routes.md](docs/routes.md)** — what each surface promises, which
  routes work for a stranger, and the order to build them in
- **[docs/sensory-science.md](docs/sensory-science.md)** — the psychophysics
  and the Kalman filter behind a pour moving the palate
- **[docs/venues.md](docs/venues.md)** — the supply side: bars publishing
  menus to the protocol
- **[AGENTS.md](AGENTS.md)** — architecture notes for contributors

## License

Private
