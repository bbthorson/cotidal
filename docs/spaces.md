---
summary: Bars as atproto Spaces (app.cotidal.bar) — patrons share pours with a claimed bar alone; the shape and policy, what is built and checked against the Spaces alpha, and what waits on the beta.
read_when: Touching spaces.ts, app.cotidal.bar, the Spaces dev aliases, OAuth scopes for spaces, or sharing a pour with a bar.
---

# Bars as atproto Spaces

Code: `src/lib/atproto/spaces.ts`; the space type:
`src/lib/atproto/lexicons/app.cotidal.bar.json`.

## Why

Everything Cotidal writes is public, which is wrong for what a bar most wants:
*what did you think of the drink you just had here?* atproto Spaces
([proposal 0016][proposal]) give an authorization and sync boundary with an
authority DID and a member policy, while records stay in each author's repo.
The patron keeps their record, the bar reads it, nobody else does.

Spaces are **access control, not confidentiality**: the patron's PDS and the
bar's host can read it. Never say "private" or "encrypted"; say "shared with
<bar> only" (in `copy/`).

## The shape

| | |
|---|---|
| Space type | `app.cotidal.bar` (`"type": "space"`, `collections: [app.cotidal.pour]`) |
| Authority | The venue's DID (holder of `app.cotidal.venue` at `self`) |
| Key | `self`: one claimed venue, one space |
| Ref | `at://{venueDid}/space/app.cotidal.bar/self` (`barSpace()`) |
| A shared pour | `…/self/{patronDid}/app.cotidal.pour/{rkey}` (`barPourUri()`) |
| Policy | `com.atproto.memberspace.policy`: `publicWrite`, not `publicRead` (`BAR_SPACE_POLICY`) |

- **Only a claimed venue has a space.** A space is named by its authority's
  DID, so one Cotidal held for a bar could never become the bar's. Before a
  claim, a pour is public or stays on the device.
- **The ref is derived** (`candidateBarSpace`), never stored.
- **A shared pour is an ordinary pour, written once,** to the space instead
  of the public repo, through the same `logPour`, and only if its `venue`
  names that bar (`pourBelongsInBarSpace`).
- **Patrons write, staff read.** `publicWrite` lets any patron share; without
  `publicRead` patrons can't read each other. Staff are members with read and
  write (`BAR_STAFF_MEMBER`). No `allowedApps`, so a POS can read it too.
- **A baseline `memberspace`**, which every PDS supports, so no Cotidal
  service sits in the access path.
- **Menus and specs stay public:** publishing them is the point. Staff-only
  specs would be a second space type.
- **References run from the space to the public, never back.**
- **One collection to start;** add another to the lexicon first.

## Built

- `app.cotidal.bar.json`, parsed by the Spaces alpha of `@atproto/lexicon`
  in `npm run lexicons`, which also checks each collection is a record here.
- `spaces.ts`: refs and URIs from parts checked by the released
  `@atproto/syntax`; the policy; the staff entry; OAuth scopes for patron,
  venue and staff.
- `tests/unit/spaces.test.ts` holds URIs to the alpha's `@atproto/syntax`
  and scopes to the alpha's `@atproto/oauth-scopes` (a patron may share and
  read their own pours, never the whole space; a venue manages only its own).

The dev aliases `atproto-lexicon-spaces`, `atproto-syntax-spaces` and
`atproto-oauth-scopes-spaces` are pinned exactly, for checking only.
`npm run lexicons` fails once the released parser accepts a space lexicon,
so they get removed.

## Waits on the beta (December 1, 2026)

1. **Repoint or drop the aliases;** rerun the lexicon check and spaces tests.
   Check `key: "literal:self"` is still accepted.
2. **Space scopes at sign-in.** `auth.ts` asks for
   `atproto transition:generic`. Add `PATRON_BAR_SCOPE` under
   `conditionalScopes` with
   `when: pdsServesMethod('com.atproto.space.createSpace')`, so only PDSes
   that serve spaces see it. `VENUE_BAR_SCOPE` belongs to a venue sign-in
   that doesn't exist yet.
3. **Writes:** `logPour` gains a destination (public repo or
   `com.atproto.space.createRecord`), after `pourBelongsInBarSpace` and
   `getSpace`. The order of writes in `tests/unit/log-pour.test.ts` holds.
4. **The venue opens its space** (`createSpace`, `BAR_SPACE_POLICY`) when it
   claims itself, and adds staff (`putMembers`).
5. **Reads for the venue** (delegation tokens, signed requests, sync) are
   `@atproto/space`'s job; don't hand-roll them. Add it with the first
   caller, and check it bundles for workerd. Key lookups belong with
   `@atproto/did`.

[proposal]: https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md
