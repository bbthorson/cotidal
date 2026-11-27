---
summary: The entities and every app.cotidal.* record, unclaimed references and reconciliation, menus as signed posts, why ratings never attach to people, the namespace; venues (what bars get, claiming at two levels, the commercial model); and bars as atproto Spaces (app.cotidal.bar, what is built, what waits on the beta).
read_when: Adding or changing a lexicon or record; referencing a venue, maker or recipe; working on /bars, /v/<handle> or venue verification; touching spaces.ts, the Spaces dev aliases or sharing a pour with a bar.
---

# Data model

Schemas: `src/lib/atproto/lexicons/`, checked by `npm run lexicons`. Worked
examples: `docs/lexicon-adoption.md`.

## The entities

| Entity | Has an account? | What it is |
|---|---|---|
| **Rater** | Yes | The person drinking (`palate`) |
| **Drink** (a Negroni) | **Never** | Folklore: a slug in an open catalog |
| **Recipe** (a Penicillin spec) | Eventually | The authored, ownable work |
| **Venue** | Eventually | A business, which owns a domain |
| **Maker** | Eventually | A person who poured it |
| **Pour** | No: it *is* the log | This drink, this bar, this night |

No account may own a drink category: that would be a land grab. What a
creator claims is their **spec**. Two bars' Negronis are two
`app.cotidal.recipe` records in two repos, never an NSID per bar; that both
are Negronis is `slug: "negroni"` (`app.cotidal.defs#drinkSlug`, shared by
recipe and pour). The family is derived, never stored. Where an author gave
no slug, the app may recognise a spec by its build, but that inference stays
in the app, never in their record.

## Referencing what has no account yet

Every non-rater entity uses `app.cotidal.defs#entityRef`:

```jsonc
{
  "name": "Attaboy",            // always written
  "domain": "attaboy.nyc",      // the reconciliation key
  "did": "did:plc:…",           // only once claimed
  "uri": "at://did:plc:…/…"     // only once claimed
}
```

**Never write a reference you can't write today.** The weak half is always
there; the strong half appears when it exists ([the hybrid of the
authoritative and unauthoritative patterns][refs]). Reconciliation happens
**in the app view, never by rewriting records**: they are signed by their
authors. The app view maps `domain → DID` at read time, so a bar that joins
in two years lights up every old log at once. Handle-as-domain is the proof:
publishing `app.cotidal.venue` at rkey `self` under `attaboy.nyc` *is* the
claim.

## Borrowed vocabulary

Places are `community.lexicon.location.*` (`address`, `geo`, `fsq`,
`hthree`), so other apps agree which place is meant. We reference that
namespace; we can't define in it (it belongs to the Lexicon Community).
Nothing comparable exists for menus, drinks or reviews yet; a general review
primitive is worth proposing upstream.

## Menus are posts

- **Never edited, only re-published,** so history is free.
- **Authority is the signing repo, not a field.** A menu in the venue's repo
  is its menu; in a patron's, a sighting. There is no `official` flag to
  forge. The app view prefers the venue's, else consensus across sightings.
- **Sightings are evidence:** `capture` says how one was obtained, and
  agreement across observers is the confidence signal.

## Ratings attach to works, never people

A rating describes **the drink**. `#credit` has exactly two fields,
`entity` and `role`: there is nowhere to score a person. A maker's portfolio
is a pull, computed from their recipes' reception. **Count adoption, not
average approval:** "poured at 12 bars, reordered by 61%" is a credential,
"3.1 ★" a humiliation (`wouldOrderAgain` exists for this). Aggregate at the
recipe, across every bar: one bad pour has a dozen causes that aren't the
recipe or the person.

> Ratings are public, so a third party *could* build the leaderboard we
> decline to. Our lexicons have no person-score field and our app view ranks
> no humans. That is a commitment.

## What stays on the device

The palate carries a 5D preference state and its uncertainty
(`docs/sensory-science.md`). How much someone drank and how long since they
ate normalise a rating on the device and are never in a record: a record is
public and permanent.

## Namespace

`app.cotidal.*`, real once `cotidal.app` is registered. If the domain ends up
elsewhere, rename the lexicon files and the constants in `records.ts`;
`npm run lexicons` enforces one namespace, so a rename can't half-happen.

## Records

Every record Cotidal defines. Other docs link here rather than repeat it.

| NSID | Key | Holder | Purpose |
|---|---|---|---|
| `app.cotidal.palate` | `self` | Rater | Coordinates, 5D state and covariance, aversions, vibe tags (hundredths) |
| `app.cotidal.pour` | tid | Rater | A check-in: 9-point hedonic and gLMS ratings, CATA notes, what was served |
| `app.cotidal.elicitation` | tid | Rater | One completed quiz's answers, kept to refit the response model later |
| `app.cotidal.menu` | tid | Venue or patron | An immutable menu snapshot |
| `app.cotidal.recipe` | tid | Author | An authored spec: technique, credits, stimulus |
| `app.cotidal.venue` | `self` | Venue | A bar claiming itself by domain |
| `app.cotidal.maker` | `self` | Maker | A professional profile linking recipes |
| `app.cotidal.bar` | space, `self` | Venue (authority) | A claimed bar's permissioned space (Bars as spaces, below) |
| `app.cotidal.defs` | — | — | `entityRef`, `venueRef`, `drinkSlug`, `drinkRef`, `stimulus`, `credit`, `price` |

## Venues

The supply side: why a bar publishes to an open sensory protocol rather than
renting from Yelp, Google Maps, Untappd or a QR portal. Examples:
`docs/lexicon-adoption.md`; a bar's private space: Bars as spaces, below.

### The problem

Gatekeepers charge bars to defend their own brand searches and reduce craft
drinks to star ratings about the coat check. Menus rot in PDFs, photo uploads
and proprietary QR systems. Bars that invent modern classics get no
attribution for the thousands of bars that pour them. Reaching followers
means paying to boost posts.

### What a bar gets

1. **The menu as a canonical publication.** Publishing writes a signed,
   immutable `app.cotidal.menu` to the venue's repo; it can render on the
   bar's own domain and syndicates across the network. The app view places
   each drink on the map through `matchDrink`: the bar asserts no
   coordinates. Patron sightings (`capture: patron`) cover a bar until it
   signs its own (`capture: venue`).
2. **Palate intelligence.** Aggregated, anonymous patron tastes: who the
   audience is ("52% of your logged patrons sit in The Deep; 15% of your list
   does"), unmet demand, and reorder rates (`wouldOrderAgain`) instead of
   stars. Patrons share pours with the bar alone through its space.
3. **Proof of influence.** With `recipe`, `maker` and `venue` records, a
   bar sees where its specs are poured ("34 bars, 8 cities, 1,100 pours"),
   verifiable reach for sponsorships and allocations.
4. **Direct reach.** A bar is its own AT Protocol account; menu drops and
   guest shifts reach patrons who follow it, with no ad tax.

Standard.site pairs with this: `site.standard.publication` (served at
`/.well-known/site.standard.publication`) for the bar's site, and
`site.standard.document` for a menu release or announcement.

### Verification

**Level 1, built: the domain matches the DID** (`venue-verify.ts`). The
bar's website domain resolves to its DID, as its handle (DNS
`_atproto.<domain>` or `/.well-known/atproto-did`) or via CNAME to
Cotidal's edge. `/bars` (Claim your bar) checks it against the signed-in DID,
then writes `app.cotidal.venue` at `self` and its menu; `/v/<handle>` renders
them. Every sighting and pour that named the domain reconciles to it. Later:
the edge serves the bar's Standard.site publication and a static site from
its records.

**Level 2, later: a postcard.** A domain proves the website, not the street
address. A postcard with a one-time code proves the claimant is at it.

### Commercial model

- **Free:** the claim, a hosted static menu, syndication, the sighting view.
- **Pro ($49–99/mo):** palate analytics, menu engineering, POS sync, 86'd
  toggles.
- **Groups:** multi-venue reporting, recipe syndication tracking, sponsorship
  analytics.

## Bars as spaces

Code: `src/lib/atproto/spaces.ts`; the space type:
`src/lib/atproto/lexicons/app.cotidal.bar.json`.

### Why

Everything Cotidal writes is public, which is wrong for what a bar most wants:
*what did you think of the drink you just had here?* atproto Spaces
([proposal 0016][proposal]) give an authorization and sync boundary with an
authority DID and a member policy, while records stay in each author's repo.
The patron keeps their record, the bar reads it, nobody else does.

Spaces are **access control, not confidentiality**: the patron's PDS and the
bar's host can read it. Never say "private" or "encrypted"; say "shared with
<bar> only" (in `copy/`).

### The shape

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

### Built

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

### Waits on the beta (December 1, 2026)

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

[refs]: https://blog.smokesignal.events/posts/3lvbownlrme2a-atprotocol-record-references-authoritative-vs-unauthoritative-patterns
[proposal]: https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md
