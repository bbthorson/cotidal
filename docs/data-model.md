---
summary: The entities and every app.cotidal.* record, how unclaimed bars and makers are referenced and reconciled, menus as signed posts, why ratings never attach to people, and the namespace.
read_when: Adding or changing a lexicon or record, referencing a venue, maker or recipe, or deciding what a record may contain.
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
| `app.cotidal.bar` | space, `self` | Venue (authority) | A claimed bar's permissioned space (`docs/spaces.md`) |
| `app.cotidal.defs` | — | — | `entityRef`, `venueRef`, `drinkSlug`, `drinkRef`, `stimulus`, `credit`, `price` |

[refs]: https://blog.smokesignal.events/posts/3lvbownlrme2a-atprotocol-record-references-authoritative-vs-unauthoritative-patterns
