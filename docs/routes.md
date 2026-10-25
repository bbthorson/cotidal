# Routes

What each surface promises, who it works for, and the order to build them in.
`docs/brand.md` governs how a route looks and sounds; this file is about which
routes exist and why.

## The home page sells one thing

`/` makes a single argument: *every palate has a coordinate → here are the four
regions → sign in to keep it → here is what you keep.* It works because it
promises one thing, and the coupe is allowed to be the one large move on it
(`docs/brand.md`, "Bold is one move per screen").

**Candidate features are routes, not home page sections.** Every idea below is
worth building and none of them belongs on `/` as a tile. A front door that
offers six equal choices has stopped making an argument and become a portal.
The footer is where routes live until one earns promotion.

## Destinations and gated actions

The distinction that decides what a stranger can be shown:

| | Works cold? | Routes |
|---|---|---|
| **Destination** | Yes — no account, no location, no camera | `/`, `/drinks`, the region pages, the quiz |
| **Gated action** | No — needs an account, a place, or people | Capture a menu, claim a venue, log a pour, compare with friends |

**A gated action must never be the front door.** It fails for exactly the
person who just arrived, and a route that greets a stranger with a permission
prompt or an empty state has spent its only first impression. Gated actions are
reached from inside, or from a link someone was sent.

## The reading path

> "Read about tastes first, then explore drinks that match."

This was the missing spine, and most of it already existed unconnected:
`/drinks` groups every entry under the four regions as section heads
(`quadrantIdFor` sorts them), while `QuadrantGrid` on the home page named those
same four regions and linked nowhere.

**Now:** the four rows link to their section of the register
(`/drinks#deep`). One edit, no new content, and the site's own vocabulary
finally leads somewhere. `tests/landing-static.spec.ts` asserts the two lists
of ids still agree, because two hand-written copies of the same list is the
drift this codebase keeps producing.

**Then:** `/regions/<id>` as a page of its own — what the region is, what
ordering from it says about you, the drinks that live there and the
ingredients they share. Done, and the four parts come from four places:

- **What it is** is prose in `src/content/regions/<id>.md`, a content
  collection held to the drinks' format — what is on the record, what is
  only told, and the sources.
- **What it says about you** is one template in `copy.ts`, the same for all
  four: your answers leaned this way, the menu ranks by distance, a pour can
  move the point. That is what the product does. Anything more — bitter
  drinkers' character, sweet as a beginner's palate — is listed as claimed,
  with the reason it is not on the record.
- **The drinks** come from the map, as on `/drinks`.
- **What they share** is counted from those drinks' own ingredient lists
  (`src/lib/ingredients.ts`), so it cannot disagree with them. The first
  version hand-listed ingredients and named drinks that the map placed in
  other regions.

The reading path is the third door. Today a visitor may take the quiz or look
at the map; both ask to measure them. Some people want to read first, and they
are not a lesser visitor.

## The return visit

Every route above is a first-visit route. Nothing yet answers *why open this
again on Thursday* — and the thing that would is already built and has no front
door: logging a pour and watching the point move.

**The loop is: drink → log → the map changes.** That is the entire premise of a
taste profile that lives in a repository and accumulates. It used to be
reachable only from inside the results screen, which made the product's one
recurring behaviour also its best-hidden one. "Your map, and what moved it"
is now a route: `/log`, in the site navigation, where a guest can log on this
device and a member to their repository.

## The supply side

Nobody in the obvious feature list is a bartender or a bar, but the data model
already anticipates both: venues claim themselves by proving a domain, makers
publish professional profiles, recipes are authored works with adoption counts
(`docs/data-model.md`).

**A bar publishing its own menu to the protocol is the highest-value thing this
product can offer someone who is not a drinker.** It is also the cheapest to
build, because the protocol does the hard part:

- **Claiming is publishing.** A venue proves `attaboy.nyc` through
  handle-as-domain and publishes `app.cotidal.venue` at rkey `self`. That
  *is* the claim. No approval queue, no registry, nothing for us to
  administer — and nothing for us to be a chokepoint over.
- **Menus are posts, never rows.** Re-published rather than edited, so version
  history is free and a menu from March stays true about March.
- **Authority comes from the signing repo.** A menu in the venue's repo is the
  venue's menu; the same record in a patron's repo is a sighting. There is no
  `official` flag to forge.

So the venue path is: prove the domain, publish the menu, and every patron
sighting of that menu reconciles to it — including sightings recorded before
the bar ever joined. **A bar that claims itself in two years lights up every
old log at once.** That is the argument to a venue, and it is true because
reconciliation happens in the app view and never by rewriting anyone's records.

What is needed is a route, not a schema: a `/venues` (or `/bars`) surface where
a venue signs in with its domain handle, sees what patrons have already logged
there, and publishes a menu. The lexicons exist; nothing renders them. The placeholder
route lives at `/bars`. Detailed product and commercial reasoning for the B2B
suite lives in `docs/venues.md`.

**Menu capture is the same corpus from the other end.** A patron photographing
a menu gets a recommendation with no account required — value before signup —
and the sighting builds the corpus as a byproduct. Both halves feed one
dataset, which is why they should be designed together even if capture ships
first.

## Friends

The strategic bet, and deliberately not next.

Sign-in buys little beyond keeping your record in your own repository: guests
and members get nearly the same product, which is a poor trade to ask for. Friends is the first feature that genuinely
requires identity, and the one that makes AT Protocol load-bearing rather than
a principled footnote. *Your palate is portable* is abstract. *Your palate is
comparable to your friends'* is a reason.

**Discovery comes from the graph, not from us.** The follows and followers a
user already has are the friend list — check them for Cotidal records and
surface the ones that have a palate. No invites, no separate social graph, no
address book upload. The protocol means the graph is already there and already
theirs; building a second one inside the app would be both redundant and a
worse version of the thing it copies.

Two constraints:

1. **A social surface with nobody on it is worse than none.** An empty "your
   friends' maps" page actively signals a dead product. The first version must
   be worth opening alone, with overlap appearing as enrichment when it exists
   — the same discipline as an unclaimed venue reference: write the weak half
   now, let the strong half light up later.
2. **Compare maps, never rank palates.** `docs/data-model.md` has no
   person-score field and the app view ships no endpoint that ranks humans.
   A social layer is exactly where that commitment gets tested.

The smallest honest first move is a shared coordinate: a signed-in user's map
at a public URL, openable by a friend against their own. Two dots and the
distance between them. No graph traversal, no feed, no follows — and it tests
whether the instinct is right before any of that is built.

**Built:** `/p/<handle>` (or `/p/<did>`). It works cold — a stranger sees the
dot, the region and the nearest drinks, then a way to find their own — so it
is a destination, not a gated action. A signed-in visitor with a palate gets
their dot beside it, the distance in words, and three drinks that lead with
disagreement: one they'd order and you wouldn't, one the reverse, then one
you'd both order. "Share to your feed" links here by DID, because a handle
can change and a post is never rewritten.

### Next: the region badge

The first step into the graph, before any page that lists friends. A member
taps "Show my region on Bluesky", and anyone who subscribes to Cotidal's
labeler sees "The Salt Line" as a badge on that member's profile and posts —
inside Bluesky, where their follows already are. Nobody else sees anything.

A labeler is how Bluesky lets any account publish signed tags about
accounts or posts; clients show the tags of the labelers a user has chosen.
Most are for moderation, but opt-in badge labelers (pronouns and the like)
are common. Cotidal would declare four values, one per region id (`deep`,
`salt-line`, `eddy`, `surf`), shown as badges, never as warnings, each with a
description that points to `/regions/<id>`. Members are signed in with their
Bluesky identity already, so the opt-in is a button, not the like-a-post
ritual those labelers use.

Why it fits:

- **It is the graph, not a copy of it.** A mutual's badge is seen where the
  follow already exists. Nothing is built inside the app to hold it.
- **It works alone** (constraint 1): one badge is a complete thing, with no
  empty friends page behind it.
- **It compares, never ranks** (constraint 2): a region is a place on the map,
  not a score.
- **It publishes nothing new**: the region is already public in the palate
  record. The badge shows it where people are.

Constraints on building it:

1. **Opt-in, with an off switch that works as well as the on switch.** A
   label is Cotidal's signed statement about someone, and they cannot delete
   it themselves. Turning it off publishes a retraction (a negation label).
   Signing out does not leave a badge behind.
2. **Relabel only when the region changes.** Pours move the dot. Crossing
   into another region retracts the old badge and issues the new one; moving
   within a region changes nothing.
3. **The service is the work.** A labeler needs its own account, a signing
   key and a `#atproto_labeler` service in its DID document, an
   `app.bsky.labeler.service` record declaring the four values, and the
   `com.atproto.label.queryLabels` and `subscribeLabels` endpoints. The
   latter is a long-lived stream — on Workers, a Durable Object. Ozone,
   Bluesky's open-source labeling service, does all of it but is a full app to
   run.
4. **Reach is earned.** Only subscribers see badges, and most people
   subscribe to few labelers, so each badge is also an invitation to
   subscribe. That is the bet.

It waits on three things, in order: sign-in working in production, region
pages worth landing on, and enough members that a badge has someone to show
it to.

## Not a route

**"Understand the social value."** A page whose job is to argue that the
product is worth using is a symptom rather than a feature, and the Principles
section already does that work in three blocks. Build the thing that
demonstrates instead.

## The name: Cotidal

If friends are discovered by scanning a user's follows for accounts that use
this app, then the app's name becomes the thing people recognise in a handle,
a record type, and a share link — so the name, the domain and the NSID
namespace had to be one answer, decided before records signed under the
namespace spread. **Cotidal**: cotidal lines join the points on a chart that
share a phase, which is what the product finds between two palates. The
namespace is `app.cotidal.*`, real once `cotidal.app` is registered
(`docs/data-model.md`).

## Build order

1. **Region links.** Done — the reading path exists.
2. **Region pages** (`/regions/<id>`). Done — sourced, and derived from the
   map and the register wherever they can be.
3. **Close the generative surface** (`docs/generation.md`) — before any route
   is promoted, because promotion means traffic.
4. **The return visit.** Done — `/log` is the log-and-watch-it-move loop's
   front door.
5. **Venue claim and menu publishing.** The supply side, and the first thing
   this product offers a non-drinker.
6. **Menu capture.** The patron half of the same corpus.
7. **Friends**, discovered through the existing follow graph — starting with
   the region badge (above), the first step that needs no friends page.
