---
summary: What a model may write (descriptions, never results), which routes call one, the provider and models, the members-only gate, metering, and the rules a new model route inherits.
read_when: Adding or changing anything that calls a model, or touching rate limiting, the session gate or Workers AI bindings.
---

# Generation

## Authored by default, generated at the edges

The quiz, the coordinate, scoring and the copy are authored or computed, and
must give the same answer twice, with no API key, in a test, offline. That is
the design, not a budget.

**A generated sentence may describe a result. It may never produce one.**

| Surface | Written by |
|---|---|
| Quiz questions | `discovery-questions.ts` + `question-selector.ts` (a model would pick by vibe) |
| Region names, interface copy | `copy/`, `docs/brand.md` |
| Coordinate, scoring, ranking | `belief-state.ts`, `scoring.ts`, `terrain.ts` |
| Why this drink suits you; reading a menu photo | A model |

## What is generated today

| Path | Route | Status |
|---|---|---|
| Drink explanation | `POST /api/explain-drink` | Built, not wired: no screen calls `explainDrinkMatch` yet |
| Menu capture | `POST /api/menu/capture` | Live in a bar's menu (Scan a menu photo). A vision model transcribes; Clef-flash classifies low-signal house items. Guests and offline get deterministic parsing of pasted text |

Every route **always answers `200` with usable content**; `400` is only for
malformed input. A model outage must be invisible. The reason travels in
`x-generation`:

| `x-generation` | Meaning |
|---|---|
| `model` | The model wrote it |
| `unauthenticated` | No restorable session: generation is for members |
| `rate-limited` | Over the member's allowance |
| `unavailable` | No binding or key, or the call failed |

## Provider

Cloudflare Workers AI through the `AI` binding (`env.AI.run`), routed via AI
Gateway (`AI_GATEWAY_ID`). **Every model id lives in `src/lib/generation.ts`**
and nowhere else: `GENERATION_MODEL` (explanations), `VISION_MODEL` (menu
photos), `CLEF_MODEL` (house-cocktail classification). Locally without
bindings, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.dev.vars`
work; with neither, every route serves its fallback, silently, so check
`x-generation` when it looks like it works.

## Members only

Generated prose and photo reading are for signed-in members; guests get the
deterministic fallback, written to be read (`explanationFallback` derives a
sentence from their actual coordinate). Generation is most of what signing
in adds on the map, beyond keeping the record in their own repository.

**The gate is proof, not a claim.** Every model route calls `restoredDid()`
(`src/lib/atproto/session.ts`) before spending anything: `bsky_sid` is an
opaque id into a sealed store (KV `ATPROTO_SESSIONS`, AES-GCM under
`SESSION_SECRET`), so a client has nothing to forge. (An earlier version
trusted an unsigned `atproto_did` cookie that anyone could set.) Changing
the secret signs everyone out.

## Budget

`src/lib/rate-limit.ts`: Cloudflare's rate-limiting binding
(`GENERATION_RATE_LIMITER`, 20 per 60s) in production; an in-memory limiter
everywhere else, so it can be tested. A binding that throws falls back to the
in-memory limiter, never open. The quota is per DID, not IP. Order in every
route: **validate → authenticate → meter → call**, so malformed and
unauthenticated requests cost nothing (`tests/unit/generation-gate.test.ts`).

Bindings come from `cloudflare:workers` via `src/lib/runtime.ts`, never
`locals.runtime.env` (AGENTS.md): the suite's requests are unauthenticated and
return before the limiter, so a wrong read there is never caught by tests.

## Parked work

- **Adaptive questions** were built and removed (`ai-question-generator.ts`,
  in git history, 21528b1). If revived, revive the validator with it
  (`validateAIQuestion`, which refused options that didn't spread along the
  target axis, `spread < 2`); without it, generated questions are strictly
  worse than the fixed bank.
- **Palate refinement** ("tell us what you avoid", `POST /api/refine-palate`)
  was removed: the model's answer moved the coordinate, producing a result,
  and it ignored the ±3 bound. If it returns, deterministic rules move the
  coordinate and the model only writes the reply, or the model picks from
  bounded options (a decision model such as Clef).

## Rules

1. **No generated text on `/` or a drink's page**; generation lives on `/map`.
2. **Every model call has a deterministic fallback**, written to be read.
3. **Model ids live in one constant.**
4. **Meter before you call**, with a limiter that can say no.
5. **Tests never need a key.** Mock the boundary; assert the contract.
6. **A new model route inherits all of it:** session gate, meter, fallback,
   `x-generation`.
