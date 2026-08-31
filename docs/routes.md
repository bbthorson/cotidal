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
(`/drinks#ember`). One edit, no new content, and the site's own vocabulary
finally leads somewhere. `tests/landing-static.spec.ts` asserts the two lists
of ids still agree, because two hand-written copies of the same list is the
drift this codebase keeps producing.

**Next:** `/regions/<id>` as a real page — what the region is, what ordering
from it says about you, the drinks that live there and the ingredients they
share. That is a content job before it is a code job, and it wants the same
sourcing discipline as `src/content/drinks/` (`AGENTS.md`): written from
primary sources, not paraphrased from one reference.

The reading path is the third door. Today a visitor may take the quiz or look
at the map; both ask to measure them. Some people want to read first, and they
are not a lesser visitor.

## The return visit

Every route above is a first-visit route. Nothing yet answers *why open this
again on Thursday* — and the thing that would is already built and has no front
door: logging a pour and watching the point move.

**The loop is: drink → log → the map changes.** That is the entire premise of a
taste profile that lives in a repository and accumulates. It is currently
reachable only from inside the results screen, which means the product's one
recurring behaviour is also its best-hidden one. "Your map, and what moved it"
is a route.

## The supply side

Nobody in the obvious feature list is a bartender or a bar, but the data model
already anticipates both: venues claim themselves by proving a domain, makers
publish professional profiles, recipes are authored works with adoption counts
(`docs/data-model.md`).

**A bar publishing its own menu to the protocol is the highest-value thing this
product can offer someone who is not a drinker.** It is also the cheapest to
build, because the protocol does the hard part:

- **Claiming is publishing.** A venue proves `attaboy.nyc` through
  handle-as-domain and publishes `app.crystalcoupe.venue` at rkey `self`. That
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
there, and publishes a menu. The lexicons exist; nothing renders them.

**Menu capture is the same corpus from the other end.** A patron photographing
a menu gets a recommendation with no account required — value before signup —
and the sighting builds the corpus as a byproduct. Both halves feed one
dataset, which is why they should be designed together even if capture ships
first.

## Friends

The strategic bet, and deliberately not next.

Sign-in currently buys nothing: guests and members get an identical product,
which is a poor trade to ask for. Friends is the first feature that genuinely
requires identity, and the one that makes AT Protocol load-bearing rather than
a principled footnote. *Your palate is portable* is abstract. *Your palate is
comparable to your friends'* is a reason.

**Discovery comes from the graph, not from us.** The follows and followers a
user already has are the friend list — check them for Crystal Coupe records and
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

## Not a route

**"Understand the social value."** A page whose job is to argue that the
product is worth using is a symptom rather than a feature, and the Principles
section already does that work in three blocks. Build the thing that
demonstrates instead.

## Open question: the name

If friends are discovered by scanning a user's follows for accounts that use
this app, then the app's name becomes the thing people recognise in a handle,
a record type, and a share link. `app.crystalcoupe.*` is already flagged as a
placeholder pending a registered domain (`docs/data-model.md`), and the NSID
namespace, the domain, and the social surface all want the same answer.

**Decide the name before the namespace is load-bearing, not after.** Renaming
is cheap while `npm run lexicons` is the only thing enforcing the namespace and
expensive once records signed under it exist in other people's repositories —
because those cannot be rewritten. That is the deadline.

## Build order

1. **Region links.** Done — the reading path exists.
2. **Region pages** (`/regions/<id>`). Content-led; the highest-value thing a
   stranger can be given.
3. **Close the generative surface** (`docs/generation.md`) — before any route
   is promoted, because promotion means traffic.
4. **The return visit.** Give the log-and-watch-it-move loop a front door.
5. **Venue claim and menu publishing.** The supply side, and the first thing
   this product offers a non-drinker.
6. **Menu capture.** The patron half of the same corpus.
7. **Friends**, discovered through the existing follow graph.
