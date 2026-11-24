# Bars as atproto Spaces

How a bar becomes a permissioned space, what is built for it, and what waits
on the protocol. Code: `src/lib/atproto/spaces.ts`; the space type:
`src/lib/atproto/lexicons/app.cotidal.bar.json`.

## Why

Everything Cotidal writes today is public. That is right for a palate or a
menu, and wrong for the thing a bar most wants from its patrons: *what did you
think of the drink you just had here?* `docs/venues.md` promises venues
"palate intelligence" from patron pours. If the only way to give a bar that is
to publish a pour to the world, the honest patron either overshares or says
nothing.

atproto Spaces ([proposal 0016][proposal]) adds non-public data to the protocol:
an authorization and sync boundary with an authority DID, a member policy, and
records that still live in each author's own repo on their own host. That
matches the bar relationship: the patron keeps their record, the bar gets to
read it, and nobody else does.

Spaces give **access control, not confidentiality**. The patron's PDS and the
bar's host can read what is written. The interface must never say "private"
or "encrypted"; it can say "shared with <bar> only".

## The shape

| | |
|---|---|
| Space type | `app.cotidal.bar` (`"type": "space"`, `collections: [app.cotidal.pour]`) |
| Authority | The venue's own DID, the one holding `app.cotidal.venue` at `self` |
| Space key | `self`: one claimed venue, one bar space |
| Ref | `at://{venueDid}/space/app.cotidal.bar/self` (`barSpace()`) |
| A shared pour | `at://{venueDid}/space/app.cotidal.bar/self/{patronDid}/app.cotidal.pour/{rkey}` (`barPourUri()`) |
| Policy | `com.atproto.memberspace.policy`: `publicWrite`, not `publicRead` (`BAR_SPACE_POLICY`) |

Decisions, and why:

- **The venue is the authority, and only once it has claimed itself.** An
  unclaimed bar has no space. Cotidal does not hold spaces on bars' behalf:
  a space is named by its authority's DID, so a space Cotidal opened for
  `attaboy.nyc` could never become Attaboy's, and pours shared into it would
  stay with Cotidal. That breaks "records are never rewritten" and
  "retroactive reconciliation" (`docs/venues.md`). Until a bar claims itself,
  a pour there is public or it stays on the device.
- **Nothing stores the space ref.** It is the venue's DID plus two constants,
  so it is derived (`candidateBarSpace`), never written into a venue or pour
  record where it could disagree with the venue it names.
- **A shared pour is an ordinary `app.cotidal.pour`, written once.** It goes to
  the patron's space repo *instead of* their public repo, never to both. The
  same lexicon, the same `logPour` validation; only where it is written
  differs. A pour may go into a bar's space only if its `venue` names that bar
  (`pourBelongsInBarSpace`).
- **Patrons write, staff read.** `publicWrite` lets any patron share without the
  venue adding them first. Without `publicRead`, patrons cannot read the space,
  so what one patron tells the bar the next does not see. The venue reads its
  own space always; staff are members with `read` and `write`
  (`BAR_STAFF_MEMBER`). No `allowedApps`, so a venue can read its space with a
  point-of-sale system, not only Cotidal.
- **A baseline policy, not a managed one.** `memberspace` is one of the three
  every PDS supports, so no Cotidal service sits in the access path. A
  `managedspace` would make Cotidal the gatekeeper of every bar's data, which
  is the platform `docs/venues.md` argues against.
- **A bar's drinks are not in its space.** Its menus (`app.cotidal.menu`) and
  specs (`app.cotidal.recipe`) are published in the venue's public repo:
  publishing them is the point, and claiming a bar and publishing its menu
  are one act. In the space they would be hidden from patrons (no
  `publicRead`), and any patron could write one (`publicWrite`). Specs a bar
  keeps to itself (R&D, a staff book) would be a second space type, staff
  only, not a collection added to this one.
- **References run from the space to the public, never back.** A shared
  pour points at the bar's public recipe (`drinkRef.recipe`, a strong ref);
  nothing public points into a space, where most readers could not follow it.
- **One collection to start.** The lexicon lists only `app.cotidal.pour`, the
  default write scope. A space can hold other collections; add one there
  first (and `npm run lexicons` checks it is a record defined here).

## What is built

- `app.cotidal.bar.json`, parsed by the Spaces alpha of `@atproto/lexicon`
  (`npm run lexicons`, check 9), which also checks every listed collection is
  a record lexicon here and none is a wildcard.
- `spaces.ts`: space refs and space record URIs, built from parts checked by
  the released `@atproto/syntax`; the bar policy; the staff member entry; the
  OAuth scopes a patron, a venue and staff would ask for.
- `tests/unit/spaces.test.ts` holds the URIs equal to the Spaces alpha of
  `@atproto/syntax` (`SpaceRef`, `isSpaceRefString`, `parseAtUriString`),
  including what it refuses.

- The scopes are parsed by the Spaces alpha of `@atproto/oauth-scopes`
  (`SpacePermission`, what a PDS uses to decide what a token may do), and
  checked to grant what they should: a patron may share a pour and read their
  own, never the whole space; a venue manages only its own.

Three dev dependencies are aliases of the Spaces alpha, pinned exactly:
`atproto-lexicon-spaces`, `atproto-syntax-spaces` and
`atproto-oauth-scopes-spaces`. They are only for checking, never imported by
the app. `npm run lexicons` fails the day the
released `@atproto/lexicon` accepts a space lexicon, so the alias is removed
rather than forgotten.

## What waits on the beta (December 1, 2026)

The [public beta][beta] is the point at which protocol changes are "minimized";
the alpha had breaking changes and its hosted PDS will be shut down. Nothing
here talks to a server yet, on purpose.

1. **Repoint the aliases** at the beta packages, or drop them once the released
   `@atproto/syntax` and `@atproto/lexicon` know spaces. Rerun
   `npm run lexicons` and `tests/unit/spaces.test.ts`; a change of URI or lexicon
   shape fails there first. Check whether `key: "literal:self"` is still
   accepted — the proposal only shows `"any"`.
2. **Ask for space scopes at sign-in.** `auth.ts` asks for
   `atproto transition:generic`, which does not cover spaces. Adding
   `PATRON_BAR_SCOPE` changes the consent screen, and a PDS that does not know
   `space:` may refuse the whole sign-in over it. `@bbthorson/atproto-cf-auth`
   0.3 answers the second half: pass it under `conditionalScopes` with
   `when: pdsServesMethod('com.atproto.space.createSpace')`, and it is asked
   for only where the member's PDS serves spaces. The venue scope
   (`VENUE_BAR_SCOPE`) belongs to the venue sign-in, which does not exist yet
   (venue claim, on the roadmap).
3. **Writes.** `logPour` gains a destination: public repo, or a bar space via
   `com.atproto.space.createRecord`, after checking `pourBelongsInBarSpace`
   and that the venue's host says the space exists (`getSpace`). The order of
   writes in `tests/unit/log-pour.test.ts` stays the same; the palate still updates
   either way.
4. **The venue opens its space** with `createSpace` and `BAR_SPACE_POLICY` as
   part of claiming itself, and adds staff with `putMembers`.
5. **Reads for the venue.** Credentials (`getDelegationToken`,
   `authorizeSpaceSync`, a P-256 key bound to them, RFC 9421 request
   signatures) and sync (`listWriters`, `listRepoOps`, the LtHash check). This
   is `@atproto/space`'s job (`sync/consumer`, `credential`,
   `http-signature`); do not hand-roll it. It is not a dependency yet: there is
   no caller, and the alpha shares nothing with the beta's wire format
   guarantees. Add it with the first caller. It runs on Web Crypto, so check
   it bundles for workerd as `@bbthorson/atproto-cf-auth` does.
   The MACs use the author's `#atproto_kem` key from their DID document;
   `@atproto/did` (already a dependency, behind `public-read.ts`) is where
   that lookup belongs.
6. **Interface copy** for "Shared with <bar> only" lives in `copy.ts`, and must
   not say private or encrypted.

Later, not planned: a patron-readable space for "two people in the same bar"
(the Overlap, on the roadmap) would be a second space type with its own policy, not a change to
this one — patrons reading each other is exactly what this policy rules out.

[proposal]: https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md
[beta]: https://atproto.com/blog/getting-ready-for-the-spaces-public-beta
