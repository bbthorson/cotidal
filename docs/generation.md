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
| Drink archetyping | `POST /api/archetype-drink` | **Reachable, unused.** No UI calls it; `archetypeDrink()` in `api-client.ts` is exercised only by `tests/archetype-logic.spec.ts`. |
| Adaptive questions | — | **Parked.** See [Parked work](#parked-work). |

Every call site has a deterministic fallback and none of them can fail the
caller: both routes catch and return usable copy, both clients catch and return
usable copy. Keep it that way. **A model outage must be invisible.**

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

**Pin one model, in one place.** The two routes currently name different models
and one of them (`gemini-1.5-flash`, in `archetype-drink.ts`) is no longer
available to new API projects — a fresh key fails on it and falls through to
the fallback, indistinguishably from success. Model IDs are a drift surface of
exactly the kind `AGENTS.md` warns about: they belong in one constant, and the
current ID should be checked against Google's deprecation page when it changes.

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
DID names whose session to restore; the restore is the authorisation.

## Budget

The bill is set by whether the endpoints are open, not by which model writes
the sentence. Both are unauthenticated `POST` routes today, and:

```ts
// src/lib/rate-limit.ts
export async function checkRateLimit(_config = defaultRateLimitConfig): Promise<boolean> {
  return true;
}
```

The real implementation — IP map, time-based pruning, O(1) eviction under a
`MAX_LIMIT` cap — sits complete and unreferenced in `rate-limit-logic.ts`. The
signatures never met: `isRateLimited(ip)` wants an IP, `checkRateLimit()` takes
none, and the request was never plumbed through. Both routes call the stub and
believe they are metered.

This is the highest-priority item on this page. **An open, unmetered model
proxy on the public internet is the failure mode; the model's price per token
is not.**

Two constraints on fixing it:

1. **A module-scope `Map` is per-isolate on Workers.** Cloudflare runs many,
   recycles them freely, and an attacker distributes across them for free. The
   existing logic is correct as logic and weak as a limiter. Durable state
   (Cloudflare's own rate limiting, KV, or a Durable Object) is what actually
   holds.
2. **Meter before the model call and after the cheap rejections.** Malformed
   input and unauthenticated requests should cost nothing and consume no quota.

Ordering, once decided: wire a real limiter, then configure the key. Not the
other way round.

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
