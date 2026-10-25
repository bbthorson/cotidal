# Data model

How The Crystal Coupe represents drinks, places, and people on the AT Protocol,
and why. Schemas live in `src/lib/atproto/lexicons/`; `npm run lexicons`
validates them.

## The entities

There are more parties to a drink than a rater and a thing rated, but they are
not all the same kind of thing:

| Entity | Has an account? | What it really is |
|---|---|---|
| **Rater** | Yes | The person drinking. Already modelled (`palate`). |
| **Drink** (a Negroni) | **Never** | Folklore. A slug in an open catalog. |
| **Recipe** (a Penicillin spec) | Yes, eventually | The authored work — the ownable thing. |
| **Venue** | Yes, eventually | A business, and businesses own domains. |
| **Maker** | Yes, eventually | A person who poured it. |
| **Pour** | No — it *is* the log | This drink, this bar, this night. |

The trap is letting an account own a *drink category*. If a DID can own
"Negroni" you have built a land grab and a chokepoint. So the folk category
stays an unowned slug, and what a creator claims is their **spec**.

## Referencing things that have no account yet

Every non-rater entity uses one shape, `app.crystalcoupe.defs#entityRef`:

```jsonc
{
  "name": "Attaboy",              // always written — the record stands alone
  "domain": "attaboy.nyc",        // reconciliation key
  "did":  "did:plc:…",            // only once claimed
  "uri":  "at://did:plc:…/…"      // only once claimed
}
```

**Never write a reference you cannot write today.** The weak half is always
present; the strong half appears when it exists. This is the hybrid of the
[authoritative and unauthoritative reference patterns][refs] — neither pure
`strongRef` nor pure embedded content.

Reconciliation happens **in the app view, never by rewriting records**. Those
logs live in raters' repos, signed by them; we cannot and must not touch them.
The app view holds the `domain → DID` mapping and resolves at read time, so a
bar that joins two years from now lights up every old log at once.

The protocol supplies the verification primitive for free: **handle-as-domain**.
A bar that proves `attaboy.nyc` *is* that bar. Publishing
`app.crystalcoupe.venue` at rkey `self` is therefore the entire claim — no
approval step, no registry.

## Borrowed vocabulary

Places use `community.lexicon.location.*` (`address`, `geo`, `fsq`, `hthree`)
rather than anything invented here, so any app speaking that vocabulary agrees
which place is meant. Foursquare Open Places ids (`fsq`) are the strongest
cross-app key.

We **reference** that namespace; we never **define** inside it — see
[Namespace](#namespace).

Nothing comparable exists yet for menus, drinks, or reviews: review apps on
the network (Skylights, Bookhive, Popsky) each rolled their own and are
explicitly non-interoperable. A general review primitive is worth proposing
upstream rather than hoarding.

## Menus are posts

A menu is authored, dated, and immutable — a post, not a database row.

- **Menus are never edited, only re-published.** Version history is free.
- **Authority comes from the signing repo, not a field.** A menu in a venue's
  repo is that venue's menu; one in a patron's repo is a sighting. There is no
  `official` flag to forge. The app view prefers the venue's own and otherwise
  takes consensus across sightings.
- **Sightings are evidence, not fact.** `capture` records how one was
  obtained. Agreement across observers is the confidence signal — which is the
  difference between a database that rots and one that self-heals. It also
  keeps us an aggregator of users' own records rather than a republisher of
  someone's menu.

## Ratings attach to works, never to people

A rating belongs to the drinker and describes **the drink**. `#credit`
attributes the people involved and deliberately has exactly two fields —
`entity` and `role`. There is nowhere to put a score on a person.

A drink designer's portfolio is computed by following `recipes` from their
`maker` profile out to the works and reading each one's reception: a **pull**
they initiate, not a number anyone can rank them by.

**Count adoption, not average approval.** "Poured at 12 bars, logged 340
times, reordered by 61%" is a credential. "3.1 ★" is a humiliation, and
structurally invites the harm. `wouldOrderAgain` exists for exactly this.

Aggregate at the **recipe** level, across every bar that pours it — that is
genuinely about the design. A single bad pour has a dozen causes that are not
the recipe and are certainly not the person.

> On an open protocol, ratings are public records, so a third party *could*
> build the leaderboard we decline to. What we control is that our lexicons
> have no person-score field and our app view ships no endpoint that ranks
> humans. That is a commitment, not an oversight.

## Namespace

`app.crystalcoupe.*` is a **placeholder**. NSID authority derives from
ownership of the reversed domain, and `crystalcoupe.app` is not yet
registered. Changing it means renaming the files in
`src/lib/atproto/lexicons/` and updating the constants in
`src/lib/atproto/records.ts`; `npm run lexicons` enforces that every schema
sits under one namespace, so the rename cannot go half-done.

**We can use `community.lexicon.*` types; we cannot define new ones under it.**
Referencing their schemas is the entire point and needs no permission.
Publishing new NSIDs in that namespace goes through the Lexicon Community
working group, because the namespace maps to `lexicon.community`, a domain we
do not control.

## Psychophysical Preference Modeling

Taste preferences are non-stationary, high-dimensional biological systems.
Rather than treating a palate as a static coordinate, The Crystal Coupe models
a user's taste trajectory using an **Extended Kalman Filter (EKF)** over a
five-dimensional latent preference space:

$$\mathbf{x}_k = [x_{\text{crisp}}, y_{\text{sweet}}, \theta_{\text{bitter}}, \theta_{\text{tannin}}, \theta_{\text{complexity}}]^T$$

The user-facing 2D map ($x$: Rich-Crisp, $y$: Savory-Sweet) is the primary
orthogonal projection of this latent vector. The system tracks algorithmic
confidence via the diagonal trace of the error covariance matrix $\mathbf{P}_k$.

To prevent transient noise from corrupting longitudinal state estimates, pours
pass through biological normalizers before updating the filter:
1. **Sensory-Specific Satiety (SSS)**: Exponential pleasantness decay as volume increases ($V_{\text{consumed}}$).
2. **Prandial & Circadian Ghrelin Weighting**: Normalization for fasting vs. postprandial sweet reward amplification.
3. **Decoupling CATA from Hedonics**: Uncoupling objective detection (Check-All-That-Apply arrays) from subjective liking to eliminate aspirational reporting bias.

For full physiological and mathematical derivations, see **[docs/sensory-science.md](sensory-science.md)**.

## Records

| NSID | Key | Holder | Purpose |
|---|---|---|---|
| `app.crystalcoupe.palate` | `self` | Rater | 2D coordinates, 5D dynamic state vector $\mathbf{x}_k$, covariance $\mathbf{P}_k$, and phenotypes |
| `app.crystalcoupe.pour` | tid | Rater | Drink check-in with 9-point hedonic / gLMS, objective CATA tags, and SSS context |
| `app.crystalcoupe.elicitation` | tid | Rater | The answers behind one completed quiz — what each question offered, which option was taken — kept to calibrate the response model against later pours |
| `app.crystalcoupe.menu` | tid | Venue **or** patron | An immutable menu snapshot at a point in time |
| `app.crystalcoupe.recipe` | tid | Author | An authored spec with technique, credits, and chemometric stimulus specs |
| `app.crystalcoupe.venue` | `self` | Venue | A bar claiming itself via domain handle |
| `app.crystalcoupe.maker` | `self` | Maker | A professional profile linking authored recipes |
| `app.crystalcoupe.defs` | — | — | Shared types: `entityRef`, `venueRef`, `drinkRef`, `stimulus`, `credit`, `price` |

`app.crystalcoupe.pour` provides the clean sensory observation record, fully superseding legacy drift heuristics.

A guide for external apps, venues, and developers adopting these records
is in **[docs/lexicon-adoption.md](lexicon-adoption.md)**.

[refs]: https://blog.smokesignal.events/posts/3lvbownlrme2a-atprotocol-record-references-authoritative-vs-unauthoritative-patterns
