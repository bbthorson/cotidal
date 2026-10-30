# Generation

What the model is allowed to write, who gets to see it, and what it costs.
The endpoint is `src/pages/api/explain-drink.ts`; the provider binding is
Cloudflare Workers AI (`env.AI`).

## Authored by default, generated at the edges

The instrument is deterministic. The quiz, the coordinate, the scoring, the
quadrant names, the copy around them — all of it is authored or computed,
and none of it calls a model. That is not an interim state pending a budget.
It is the design.

**A generated sentence may describe a result. It may never produce one.**

| Surface | Written by | Why |
|---|---|---|
| Quiz questions | `discovery-questions.ts` + `question-selector.ts` | The selector picks by expected information about your position. A model would pick by vibe. |
| Quadrant names, interface and marketing copy | `copy.ts`, `docs/brand.md` | Voice is brand, and one file to revise it in — not a system prompt. |
| Coordinate, scoring, ranking | `belief-state.ts`, `scoring.ts` | Reproducible. A taste map that moves when nothing changed is not a map. |
| **Why this drink suits you** | **Model** | The one place per-user prose beats a template. |

The reason to hold this line is not cost. It is that everything above the last
row must give the same answer twice, and must keep giving it with no API key,
in a test, and offline. `tests/` depends on this and `AGENTS.md` states it:
the suite must pass with no key.

## What is generated today

| Path | Route | Status |
|---|---|---|
| Drink explanation | `POST /api/explain-drink` | **Live.** Hero card on mount, drink card on expand. |
| Adaptive questions | — | **Parked.** See [Parked work](#parked-work). |
| Palate refinement | — | **Removed for launch.** See [Parked work](#parked-work). |

Every call site has a deterministic fallback and none of them can fail the
caller: every route catches and returns usable content, and every client
catches and returns usable content. Keep it that way. **A model outage must be invisible.**

So every model route **always answers `200` with usable content**, and `400` is
reserved for input that was malformed. A guest, a throttled member, a missing
key and a failed call are all indistinguishable to the caller by design — which
would also make them indistinguishable to us, so the reason travels in an
`x-generation` header instead:

| `x-generation` | Meaning |
|---|---|
| `model` | The model wrote it. |
| `unauthenticated` | No restorable session. Generation is for members. |
| `rate-limited` | A member over their allowance. |
| `unavailable` | No key configured, or the call failed. |

A `400` carries no header: nothing was decided about it.

## Provider

Cloudflare Workers AI natively, routed through Cloudflare AI Gateway. Inference runs on Cloudflare's serverless edge GPUs via the `AI` binding (`env.AI.run`) with no third-party API keys or egress latency.

**The model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`**, pinned in `GENERATION_MODEL` in `src/lib/generation.ts`. Requests route through AI Gateway (`AI_GATEWAY_ID = 'crystal-coupe-gateway'`), providing automatic edge response caching, request logs, and routing metrics.

For local development without bindings, credentials (`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`) can be passed via `.dev.vars` or environment variables. Without bindings or credentials (e.g. during offline test execution), every route catches gracefully and return their deterministic fallback.

> Until a binding or key is configured, every route runs its catch branch on every
> request and serve the fallback. This is silent and looks like working
> software.

**One model, named once.** `GENERATION_MODEL` in `src/lib/generation.ts` is the
only place a model id appears.

## The membership line

**Generated prose is for signed-in users. Guests get the static fallback.**

Guests are not degraded. `explain-drink.ts` already carries a written fallback
(`explanationFallback` in `generation.ts`: *"You lean crisp and sweet — a
Daiquiri sits right in that corner of the map"*) that is
derived from the guest's actual coordinate and reads as intended copy, because
it is. The guest experience stays complete: the quiz runs, the map renders, the
recommendation is real. What signing in adds is prose written for them.

Beyond keeping the coordinate and pours in the member's own repository — the
product's whole thesis — this is most of what signing in buys on Compass
today. That is the argument for it.

### The gate must be proof, not a claim

Sign-in is [`@bbthorson/atproto-cf-auth`][auth], mounted at `/api/auth/atproto`
(`src/pages/api/auth/atproto/[...route].ts`, configured in
`src/lib/atproto/auth.ts`). The session cookie (`bsky_sid`) is an opaque random
id; the DID it maps to sits in a sealed server-side store, so a client has
nothing to forge. An earlier version trusted an unsigned `atproto_did` cookie,
which any client could send with someone else's public DID:

```
curl -H 'Cookie: atproto_did=did:plc:someone-else' …
```

That was tolerable only for actions that fail at the PDS without a real
session. It is not tolerable as the gate on a billed call, which would run
first and bill regardless.

**Gate on a restorable OAuth session.** `restoredDid()` and `oauthSession()` in
`src/lib/atproto/session.ts` resolve the session and its tokens; every model
route calls `restoredDid()` before spending anything, and `atproto-publish.ts`
passes the same session to the PDS writes in `publish.ts`.

Sessions and authorization state live in KV (`ATPROTO_SESSIONS`, the
`crystal-coupe-kv` namespace), sealed with AES-GCM under the `SESSION_SECRET`
Worker secret; an in-memory store is used only off-platform. Module-scope
`Map`s are per-isolate on Workers, exactly as the limiter's was, which is why
the earlier in-memory stores signed members out on a cold isolate. Without
`SESSION_SECRET` on Workers, sign-in is disabled rather than sealed under a
default. Changing the secret signs everyone out.

[auth]: https://www.npmjs.com/package/@bbthorson/atproto-cf-auth

## Budget

The bill is set by whether the endpoints are open, not by which model writes
the sentence. `checkRateLimit` was once a stub that unconditionally returned
`true` while the working implementation sat unreferenced beside it — the
signatures never met, so both routes called the stub and believed they were
metered.

`src/lib/rate-limit.ts` now runs two mechanisms:

- **Cloudflare's rate limiting binding** (`GENERATION_RATE_LIMITER` in
  `wrangler.toml`) in production, verified metering at its configured 20/60s. A module-scope `Map` is per-isolate on
  Workers — Cloudflare runs many, recycles them freely, and an attacker spreads
  across them for free. The in-memory logic is correct as logic and weak as a
  limiter; only durable state holds.
- **The in-memory limiter** everywhere else. `npm run dev`, `astro preview` and
  the suite have no bindings, and a limiter that exists only in production is
  one nobody can test.

A binding that throws falls back to the in-memory limiter rather than failing
open. Some metering beats none.

**The quota belongs to a DID, not an IP.** Generation is members-only, so by
the time anything is metered the caller has proven an account — which is harder
to rotate than an address. Order in every route: validate → authenticate →
meter → call. **Malformed and unauthenticated requests cost nothing and consume
no quota.**

`tests/generation-gate.spec.ts` asserts the limiter refuses past its allowance,
meters per key, and does not fail open when a binding throws.

## Reaching a binding

**Bindings come from `cloudflare:workers`, never from `locals`.** `src/lib/runtime.ts`
is the only module that knows this, and the rule is worth stating because the
wrong way fails loudly in production and silently everywhere else:

```ts
// Astro v6+: this THROWS. `?.` does not save you — the getter itself raises.
locals.runtime.env.MY_BINDING
//    Astro.locals.runtime.env has been removed in Astro v6.
//    Use 'import { env } from "cloudflare:workers"' instead.
```

The import only resolves inside workerd, so `runtime.ts` loads it dynamically
and answers `undefined` off-platform — which is what lets `astro dev` and the
suite run with no bindings while production gets the real thing.

This bit once already: the first version of the metered routes read
`locals.runtime.env` and would have crashed on every member request. Nothing
caught it, because the test suite's requests are all unauthenticated and return
before they reach the limiter.

## Parked work

`src/lib/ai-question-generator.ts` builds the prompt for model-generated
adaptive questions and validates the response — including a check that the
options actually spread along the target axis, which is the hard part. It has
**no call sites in `src/` or `tests/`**.

It is parked, not abandoned: model-driven elicitation is roadmap item 8 in
`AGENTS.md` ("Rework elicitation"). It stays in the tree so that work does not
start from nothing. Until then it is dead code by definition, and this section
is what stops it reading as live.

**If it is revived, the validator is the point.** A generated question that
does not separate the axes teaches the belief state nothing while costing a
call, and the parser already refuses those (`spread < 2`). Restoring the
feature without restoring `validateAIQuestion` would be strictly worse than the
fixed question bank.

### Palate refinement

"Tell us what you avoid" was a notes box on the menu for members: free text
("no peat, less sweet") sent to `POST /api/refine-palate`, where the model
returned a nudge on each axis, aversions and a two-sentence reply, and the
coordinate moved to match. It was removed for launch; it is in git history
(the route, `refinePalateWithAI`, and the section on the Compass page, then `ResultsScreen`).

It had two problems to solve before it returns. **It broke the rule above:**
the model's answer moved the coordinate — it produced a result rather than
describing one. And it did not hold the model to the ±3 it asked for. Pours
already move the palate without a model, and "what was off" already sets
aversions. If it returns, either deterministic rules move the coordinate and
the model only writes the reply, or the model chooses from fixed options
(a decision model such as Cloudflare's Clef) whose answers are bounded by
construction.

## Rules

1. **No generated text on `/` or `/drinks`.** Both are static and script-free,
   and `tests/landing-static.spec.ts` guards the first. Generation lives on
   Compass only.
2. **Every model call has a deterministic fallback**, and the fallback is
   written to be read, not to be a placeholder.
3. **Model IDs live in one constant**, never inline per route.
4. **Meter before you call.** No route reaches a model without passing a
   limiter that can actually say no.
5. **The tests never need a key.** Mock the boundary; assert the contract.
6. **A new model route inherits all of it** — session gate, meter, fallback,
   `x-generation` header. There is no such thing as a route too small to
   bill someone.
