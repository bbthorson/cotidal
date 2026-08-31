# Generation

What the model is allowed to write, who gets to see it, and what it costs.
The endpoints are `src/pages/api/explain-drink.ts` and
`src/pages/api/archetype-drink.ts`; the provider binding is `@ai-sdk/google`.

## Authored by default, generated at the edges

The instrument is deterministic. The quiz, the coordinate, the scoring, the
quadrant names, the bartender's reactions — all of it is authored or computed,
and none of it calls a model. That is not an interim state pending a budget.
It is the design.

**A generated sentence may describe a result. It may never produce one.**

| Surface | Written by | Why |
|---|---|---|
| Quiz questions | `discovery-questions.ts` + `question-selector.ts` | The selector picks by uncertainty reduction. A model would pick by vibe. |
| Bartender reactions | `ENRICHED_FEEDBACK` in `conversation.ts` | Voice is brand. `docs/brand.md` governs it, not a system prompt. |
| Quadrant names, marketing copy | `copy.ts`, `docs/brand.md` | One file to revise the voice in. |
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
| Drink archetyping | `POST /api/archetype-drink` | **Reachable, unused.** No UI calls it; `archetypeDrink()` in `api-client.ts` is exercised only by `tests/archetype-logic.spec.ts`. Gated and metered anyway — it spends the pricier call of the two. |
| Adaptive questions | — | **Parked.** See [Parked work](#parked-work). |

Every call site has a deterministic fallback and none of them can fail the
caller: both routes catch and return usable copy, both clients catch and return
usable copy. Keep it that way. **A model outage must be invisible.**

So both routes **always answer `200` with usable content**, and `400` is
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

Gemini, via `@ai-sdk/google`. It is the cheapest hosted tier that can write a
passable sentence, and per-token price is not close to the deciding factor at
this volume anyway — see [Budget](#budget). Switching providers means changing
one import per route, so this is not a commitment worth agonising over.

**The key is `GOOGLE_GENERATIVE_AI_API_KEY`**, read from the environment by the
SDK. On Cloudflare it is a Worker secret; locally it goes in `.dev.vars`.
Nothing in the repo references it by name outside this document and a comment
in `tests/archetype-logic.spec.ts`.

> Until a key is configured, both routes run their catch branch on every
> request and serve the fallback. This is silent and looks like working
> software. Configuring a key changes live output for the first time, so
> review the prose after doing it rather than before.

**One model, named once.** `GENERATION_MODEL` in `src/lib/generation.ts` is the
only place a model id appears. The routes previously named different models and
one of them (`gemini-1.5-flash`) was no longer available to new API projects —
a fresh key would have failed on it and fallen through to the fallback,
indistinguishably from success. Check Google's deprecation list before changing
the constant.

## The membership line

**Generated prose is for signed-in users. Guests get the static fallback.**

Guests are not degraded. `explain-drink.ts` already carries a written fallback
— *"You lean crisp and sweet — a Negroni hits that sweet spot"* — that is
derived from the guest's actual coordinate and reads as intended copy, because
it is. The guest experience stays complete: the quiz runs, the map renders, the
recommendation is real. What signing in adds is prose written for them.

This is the only place in the product where signing in currently buys anything.
That is the argument for it. The profile living in the user's own repo is the
product's whole thesis, and right now the app asks for an account while giving
identical value with or without one.

### The gate must be proof, not a claim

`atproto-publish.ts` identifies users by reading an `atproto_did` cookie. It is
`HttpOnly`, which stops page scripts from reading it — and stops nothing else.
The cookie is unsigned, and a DID is a public identifier, so any client can
send one:

```
curl -H 'Cookie: atproto_did=did:plc:someone-else' …
```

That is tolerable for the existing actions, which fail at the PDS if the
session cannot be restored. It is **not** tolerable as the gate on a billed
call, which would happily run first and bill regardless.

**Gate on a restorable OAuth session, not on the presence of a cookie.** The
DID names whose session to restore; the restore is the authorisation. That is
`restoredDid()` in `src/lib/atproto/session.ts`, which both model routes call
before spending anything, and which `atproto-publish.ts` now shares a cookie
parser with so there is one implementation of the claim.

This is the pattern the protocol's own example app uses: `getSession()` in
[statusphere][sp] reads a plain `did` cookie and returns `client.restore(did)`,
with the cookie `httpOnly` and `secure` and doing no work beyond naming a DID.
Ours now matches, `Secure` included.

> **Known limitation.** Where statusphere backs both `stateStore` and
> `sessionStore` with a database keyed by DID, `createSessionStore()` here
> holds sessions in a module-scope `Map` — per-isolate on Workers, exactly as
> the limiter's was. Restores therefore fail for genuinely signed-in members
> whenever a request lands on a fresh isolate, and generation degrades to the
> guest fallback when they do. This predates the gate and already breaks every
> write action, but the gate is the first thing whose *quality* depends on it.
>
> The fix is a KV- or D1-backed store implementing the same three methods
> (`get`, `set`, `del`). The obstacle is not the store: Cloudflare bindings are
> reachable only through the request context, while `getAtprotoClient()` is a
> module singleton, so `env` has to be threaded through it and its callers in
> `publish.ts`. It also needs a namespace created in Cloudflare.

[sp]: https://github.com/bluesky-social/statusphere-example-app

## Budget

The bill is set by whether the endpoints are open, not by which model writes
the sentence. `checkRateLimit` was once a stub that unconditionally returned
`true` while the working implementation sat unreferenced beside it — the
signatures never met, so both routes called the stub and believed they were
metered.

`src/lib/rate-limit.ts` now runs two mechanisms:

- **Cloudflare's rate limiting binding** (`GENERATION_RATE_LIMITER` in
  `wrangler.toml`) in production. A module-scope `Map` is per-isolate on
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
to rotate than an address. Order in both routes: validate → authenticate →
meter → call. **Malformed and unauthenticated requests cost nothing and consume
no quota.**

`tests/generation-gate.spec.ts` asserts the limiter refuses past its allowance,
meters per key, prefers a bound limiter, and does not fail open when one
throws.

## Parked work

`src/lib/ai-question-generator.ts` builds the prompt for model-generated
adaptive questions and validates the response — including a check that the
options actually spread along the target axis, which is the hard part. It has
**no call sites in `src/` or `tests/`**.

It is parked, not abandoned: model-driven elicitation is roadmap item 5 in
`AGENTS.md` ("Rework elicitation"). It stays in the tree so that work does not
start from nothing. Until then it is dead code by definition, and this section
is what stops it reading as live.

**If it is revived, the validator is the point.** A generated question that
does not separate the axes teaches the belief state nothing while costing a
call, and the parser already refuses those (`spread < 2`). Restoring the
feature without restoring `validateAIQuestion` would be strictly worse than the
fixed question bank.

## Rules

1. **No generated text on `/` or `/drinks`.** Both are static and script-free,
   and `tests/landing-static.spec.ts` guards the first. Generation lives on
   `/taste` only.
2. **Every model call has a deterministic fallback**, and the fallback is
   written to be read, not to be a placeholder.
3. **Model IDs live in one constant**, never inline per route.
4. **Meter before you call.** No route reaches a model without passing a
   limiter that can actually say no.
5. **The tests never need a key.** Mock the boundary; assert the contract.
6. **A new model route inherits all of it** — session gate, meter, fallback,
   `x-generation` header. There is no such thing as a route too small to
   bill someone.
