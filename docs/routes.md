---
summary: Which routes exist, what each promises, who it works for cold, and why the roadmap runs in its order.
read_when: Adding or promoting a route, deciding what a stranger sees, or reordering the roadmap.
---

# Routes

How a route looks and sounds is `docs/brand.md`; this is which routes exist
and why.

## The front door asks one thing

`/` is the map with a sample palate gaining ratings, and a card that asks one
thing: find your coordinate. Pulled up, it says how it works
(`/?about=1#how-it-works`) and links to sign-in. The map is its one large move.

**It is the front door only for a stranger.** The front door and the app
were one page in two states, so they share one address. Whether there is a
taste to draw decides: a member has one (the session says so), and so does a
guest whose device holds a coordinate (a presence-only cookie,
`src/lib/device-presence.ts`, since the coordinate itself never leaves the
device). Anyone else, arriving with no parameter, gets the front door; any
parameter (`?quiz=1`, `?drink=`, `?q=`) is a question for the app. The server
decides, so nothing flashes and a stranger's page stays script-free.
`?about=1` (`frontDoorHref`) asks for the front door outright, which is how
How it works reaches it from inside the app.

Signing in buys the account (any phone), the public map and chat assistants,
not logging or the menu: everything works signed out, on the device, so it
is offered only where it would keep something.

**Candidate features are routes, not front-door tiles.** A front door with six
equal choices is a portal, not an argument. Routes live in the footer until
one earns promotion.

## The screens

| Screen | For | Reached from |
|---|---|---|
| **The map** (`/`) | Everything: your terrain, every drink, and the card (search, your menu, a bar's menu, a drink, your pours) | Header, Menu, the front door |
| **Rating** (in the card) | One pour, rated | Rate this, a waiting pick, a chat's draft link |
| **The questions** (in the card, `/?quiz=1`) | Placing the coordinate | The front door, a drink's page, Start over |
| **Your link** (`/p/<handle>`) | What a friend sees; comparing | Settings, the card, a link someone sent |
| **Settings** | The account: sign out, your link, assistants, start over | Your handle |
| **A drink's page** (`/drinks/<slug>`) | SEO/AEO and a link to send; not in the navigation | Search, links |
| **For bars** (`/bars`, `/v/<handle>`) | Claiming a bar and publishing its menu; a claimed bar's menu as pins | Footer |

## Destinations and gated actions

| | Works cold? | Routes |
|---|---|---|
| **Destination** | Yes: no account, location or camera | `/`, the map (a drink, a region), a drink's page, the questions, `/p/<handle>` |
| **Gated action** | No: needs an account, a place or people | Photograph a menu, claim a venue, compare with people you follow |

**A gated action is never the front door.** It fails for exactly the person
who just arrived. Reach it from inside, or from a link someone was sent.

## The reading path

A region is a way to narrow the drinks, so it is a filter on the map
(`/?region=<id>`), not a page, and the map is the list of drinks, so there
is no `/drinks`. A region's card has four parts from four places: what it is
(`src/content/regions/<id>.md`), what it says about you (one template in
`copy/`, describing what the product does and nothing more), its drinks (from
the map) and what they share (counted from their ingredient lists).

## The return visit

**Drink → log → the map changes.** That loop is why `/` is the one screen
and rating lives in its card.

## The supply side

**A bar publishing its own menu to the protocol is the most valuable thing
this product offers a non-drinker**, and the cheapest, because the protocol
does the hard part: claiming is proving a domain, menus are signed posts, and
authority comes from the signing repo, so a patron's copy is a sighting and
the bar's is the menu. **A bar that claims itself in two years lights up
every old log at once**, because reconciliation happens in the app view
(`docs/data-model.md`). The business case: `docs/data-model.md`, Venues.

Menu capture is the same corpus from the other end: a patron photographing
a menu gets a recommendation and leaves a sighting. Design the two together.

## Friends

The first feature that genuinely needs identity, and the one that makes the
AT Protocol load-bearing: *your palate is comparable to your friends'* is a
reason to sign in; *your palate is portable* is not.

- **Discovery comes from the follow graph,** not a second graph built here:
  no invites, no address book.
- **A social surface with nobody on it is worse than none.** The first
  version is worth opening alone, with overlap as enrichment.
- **Compare maps, never rank palates** (`docs/data-model.md`).

**Built:** `/p/<handle>` (or `/p/<did>`) works cold: a stranger sees the
person's terrain and menu, then a way to find their own. A signed-in visitor
is compared with it (`compareTerrains`): shared top ten, where they part,
one for both. On your own link, people you follow who have a map are listed
to compare with. "Share to your feed" links by DID, since handles change and
posts are never rewritten.

## The name

Cotidal lines join the points on a chart that share a phase, which is what
the product finds between two palates. The name, domain and NSID namespace
are one answer (`app.cotidal.*`, real once `cotidal.app` is registered).

## Build order

The roadmap is in `AGENTS.md`. Why its order:

- **Namespace first:** records signed under it spread and can't be renamed.
- **Menu capture and venue claim together:** two halves of one corpus.
- **Elicitation** once there are logged answers and pours to fit against.
- **Friends last:** an empty social surface is worse than none.

Every model route is already gated, metered and has a fallback
(`docs/generation.md`), which had to be true before any route was promoted.
