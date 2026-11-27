# Cotidal

Every palate has a coordinate. Cotidal finds yours, then tells you
what to order.

## What it does

Two axes, **rich to crisp** and **savory to sweet**, make a map of taste. A
short adaptive quiz lays a first hill on it; every drink you rate raises or
lowers the ground around that drink, so your taste becomes terrain, and the
drinks on your high ground are what you should be drinking.

What you answer and rate is written to **your own** AT Protocol repository,
not ours. The reasoning is in [docs/data-model.md](docs/data-model.md).

## Stack

| | |
|---|---|
| Framework | [Astro 7](https://astro.build/), server output |
| Hosting | [Cloudflare Workers](https://developers.cloudflare.com/workers/) (`@astrojs/cloudflare`) |
| UI | [React 19](https://react.dev/), one island (`/map`), [Tailwind](https://tailwindcss.com/) |
| Identity | [AT Protocol](https://atproto.com/) OAuth (`@bbthorson/atproto-cf-auth`) |
| Drink data | `src/lib/drinks/data.ts` (positions on the map), `src/content/drinks/` and `src/content/regions/` (prose) |
| Model | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) + [AI Gateway](https://developers.cloudflare.com/ai-gateway/), at the edges only ([docs/generation.md](docs/generation.md)) |

Deploys are handled by Cloudflare's own Git integration, which builds and
releases the Worker on push. There is deliberately no deploy workflow in
`.github/workflows/`: CI (`ci.yml`) only lints, typechecks, builds and tests.

The routes, and what each promises, are in [docs/routes.md](docs/routes.md).
How the code is laid out is in [AGENTS.md](AGENTS.md).

## Getting started

```bash
npm install
npm run dev        # open http://127.0.0.1:9002 — sign-in needs 127.0.0.1, not localhost
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Sign-in also needs
`SESSION_SECRET` (AGENTS.md, AT Protocol).

### Scripts

```bash
npm run build      # production build
npm run lint       # ESLint, including the token and copy rules
npm run typecheck  # lexicons + astro check + tsc
npm run lexicons   # validate lexicon schemas against Zod and the reference parser
npm run knip       # unused files, dependencies and exports
npm run check      # lint + typecheck + knip
npm test           # everything, as CI runs it
npm run test:unit  # logic tests (Vitest, tests/unit): no server, seconds
npm run test:e2e   # build, then pages and routes (Playwright) against the preview
npm run images     # regenerate icons and share cards in public/ (after a build)
```

The browser tests run against the preview build: with `CI` set, Playwright
serves `npm run preview`. One file: `npm run test:unit -- tests/unit/drink-content.test.ts`
or `npm run test:e2e -- tests/landing-static.spec.ts`. Against `npm run dev`,
React 19's development build on workerd breaks server rendering and about a
third of the suite fails.

The suite needs no model key: nothing in the quiz calls a model, and model
boundaries are mocked. In sandboxes without a matching browser, set
`PLAYWRIGHT_CHROMIUM_PATH` and `PLAYWRIGHT_NO_SANDBOX`; set
`PLAYWRIGHT_SKIP_WEBSERVER` to test against a server you started yourself.

**Running the suite from an AI coding agent:** Astro 7 detects agent
environments and starts `astro dev` and `astro preview` in the *background*.
Playwright waits for a long-lived process, so it sees the server exit
immediately and reports "webServer exited early". Setting
`ASTRO_DEV_BACKGROUND` and `ASTRO_PREVIEW_BACKGROUND` (to any value) turns that
detection off:

```bash
ASTRO_DEV_BACKGROUND=1 ASTRO_PREVIEW_BACKGROUND=1 CI=1 npx playwright test
```

In Claude Code on the web, `.claude/hooks/session-start.sh` sets both. This
does not affect CI or a normal terminal, where no agent is detected.

## Docs

Each doc opens with front matter saying what it covers and when to read it,
and each topic lives in one of them. Start with [AGENTS.md](AGENTS.md) before
changing code.

- Building: [design-system](docs/design-system.md),
  [generation](docs/generation.md), [sensory-science](docs/sensory-science.md)
- Product: [brand](docs/brand.md), [routes](docs/routes.md),
  [map-first](docs/map-first.md), [coasters](docs/coasters.md)
- Records and network: [data-model](docs/data-model.md),
  [lexicon-adoption](docs/lexicon-adoption.md), [venues](docs/venues.md),
  [spaces](docs/spaces.md), [mcp](docs/mcp.md),
  [drink-sources](docs/drink-sources.md)

## License

Private
