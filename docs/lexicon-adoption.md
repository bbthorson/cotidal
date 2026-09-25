# Adopting the Crystal Coupe Lexicon

Why and how third-party apps, venues, point-of-sale systems, and beverage
creators adopt `app.crystalcoupe.*`.

Schemas live in `src/lib/atproto/lexicons/`; TypeScript/Zod definitions live in
`src/lib/atproto/records.ts`. Product reasoning lives in `docs/data-model.md`
and `docs/venues.md`.

---

## Why adopt?

Hospitality data today is trapped in proprietary silos (Google Maps, Yelp,
Untappd, bloated QR ordering portals) or unindexed PDF menus. The results are
bad for everyone:

1. **A common sensory plane replaces subjective stars.** Craft cocktails
   cannot be meaningfully evaluated by 1-to-5 star averages from angry patrons.
   The 2D palate plane (Rich −10 → Crisp +10, Savory −10 → Sweet +10) gives
   any drink, drinker, and menu an intuitive flavor coordinate. Any client can
   calculate match distance without proprietary recommendation algorithms.
2. **Menus are posts, not database rows.** A menu in `app.crystalcoupe.menu` is
   an immutable, signed, dated snapshot. Version history is free, menus never
   rot, and syndication to websites, mobile apps, and discovery feeds happens
   automatically.
3. **Attribution without rank.** Bartenders who invent modern classics poured in
   thousands of bars globally currently receive zero structured attribution.
   `app.crystalcoupe.recipe` and `maker` build a verifiable ledger of adoption
   (*"poured at 34 bars across 8 cities, with 1,100 verified pours"*). Ratings
   attach to recipes, never to people.
4. **Sovereign ownership via handle-as-domain.** Venues claim themselves by
   proving their domain name (`attaboy.nyc`). There is no centralized registry,
   no gatekeeper charging rent, and no lock-in.
5. **Atmosphere and Standard.site interoperability.** Venues can pair
   `app.crystalcoupe.venue` and `menu` with `site.standard.publication` and
   `document`, enabling native Bluesky rich unfurls, reader syndication, and
   fast static websites on their own domain.

---

## The Lexicons at a glance

| NSID | Key | Role |
|---|---|---|
| `app.crystalcoupe.palate` | `self` | Drinker's 2D coordinate and sensory vector |
| `app.crystalcoupe.pour` | `tid` | A drink logged by a patron (the check-in) |
| `app.crystalcoupe.menu` | `tid` | Signed menu snapshot with sections, items, and coordinates |
| `app.crystalcoupe.recipe` | `tid` | Authored formulation, specs, technique, and creator credits |
| `app.crystalcoupe.venue` | `self` | Venue profile, location, current menu pointer, and publication link |
| `app.crystalcoupe.maker` | `self` | Professional portfolio linking authored recipes |
| `app.crystalcoupe.defs` | — | Shared types: `entityRef`, `venueRef`, `drinkRef`, `price` |

---

## How to adopt: by use case

### 1. For Venues, POS systems & Menu Management tools

**Goal:** Publish canonical, versioned menus that render on the bar's website
and syndicate across the open network.

#### Step A: Claim the venue record
Held at `rkey: self` in the venue's repository. Possession of this record
under a verified domain handle (`attaboy.nyc`) *is* the claim:

```jsonc
// app.crystalcoupe.venue at rkey: self
{
  "$type": "app.crystalcoupe.venue",
  "name": "Attaboy",
  "description": "Cocktail bar on the Lower East Side.",
  "website": "https://attaboy.nyc",
  "location": {
    "$type": "community.lexicon.location.address",
    "street": "134 Eldridge St",
    "locality": "New York",
    "region": "NY",
    "postalCode": "10002",
    "country": "US"
  },
  "currentMenu": {
    "name": "Spring 2026 Menu",
    "uri": "at://did:plc:venue123/app.crystalcoupe.menu/3l1234567890"
  },
  "publication": {
    "name": "Attaboy NYC",
    "uri": "at://did:plc:venue123/site.standard.publication/self"
  },
  "createdAt": "2026-09-25T18:00:00Z"
}
```

#### Step B: Publish a menu snapshot
Menus are published at a `tid` key whenever the cocktail list changes:

```ts
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });
// ... authenticate as venue ...

await agent.api.com.atproto.repo.createRecord({
  repo: venueDid,
  collection: 'app.crystalcoupe.menu',
  record: {
    $type: 'app.crystalcoupe.menu',
    venue: {
      entity: {
        name: 'Attaboy',
        domain: 'attaboy.nyc',
        did: venueDid,
      },
    },
    title: 'Spring 2026',
    publishedAt: new Date().toISOString(),
    sections: [
      {
        name: 'House Signatures',
        items: [
          {
            name: 'Penicillin',
            description: 'Blended scotch, fresh lemon, honey-ginger syrup, Islay float',
            price: { amount: 2200, currency: 'USD' },
            recipe: {
              name: 'Penicillin (Original Spec)',
              uri: 'at://did:plc:samross/app.crystalcoupe.recipe/3l9876543210',
            },
            coordinates: { x: -3, y: -2 }, // Rich & Savory (The Ember)
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  },
});
```

---

### 2. For Consumer Apps & Drink Logging Tools

**Goal:** Allow drinkers to log drinks, track their palate coordinate, and
maintain ownership of their taste history.

#### Writing a Pour (Check-In)
When a user orders a drink, write `app.crystalcoupe.pour` to **their** repository:

```ts
await agent.api.com.atproto.repo.createRecord({
  repo: userDid,
  collection: 'app.crystalcoupe.pour',
  record: {
    $type: 'app.crystalcoupe.pour',
    drankAt: new Date().toISOString(),
    drink: {
      name: 'Penicillin',
      slug: 'penicillin',
      recipe: {
        name: 'Penicillin',
        uri: 'at://did:plc:samross/app.crystalcoupe.recipe/3l9876543210',
      },
    },
    venue: {
      entity: {
        name: 'Attaboy',
        domain: 'attaboy.nyc',
      },
    },
    rating: {
      wouldOrderAgain: true, // The primary quality metric
      hedonicScale: 8,       // Optional 1-9 hedonic scale
      note: 'Perfect ginger heat and peaty aromatics.',
    },
    createdAt: new Date().toISOString(),
  },
});
```

#### Reading & Updating the Palate
Drinker coordinates live at `app.crystalcoupe.palate` at `rkey: self`. Client
apps can read the record to place the user on their own taste map or suggest
matching drinks:

```jsonc
// app.crystalcoupe.palate at rkey: self
{
  "$type": "app.crystalcoupe.palate",
  "mapCoordinates": { "x": -4.2, "y": -2.1 },
  "sensoryVector": {
    "tastes": {
      "sweet": 3,
      "sour": 7,
      "salty": 2,
      "bitter": 6,
      "umami": 4
    },
    "sensations": {
      "boozy": 8,
      "smoky": 7,
      "spicy": 6,
      "refreshing": 4
    }
  },
  "updatedAt": "2026-09-25T18:00:00Z"
}
```

---

### 3. For Beverage Creators & Bartenders

**Goal:** Publish authored specs, establish provenance, and build a portable
portfolio.

Publish `app.crystalcoupe.recipe` to establish the canonical spec:

```jsonc
// app.crystalcoupe.recipe at rkey: tid
{
  "$type": "app.crystalcoupe.recipe",
  "name": "Paper Plane",
  "slug": "paper-plane",
  "description": "Equal-parts modern classic created in 2008 for The Violet Hour.",
  "ingredients": [
    { "name": "Bourbon", "amount": "0.75 oz" },
    { "name": "Aperol", "amount": "0.75 oz" },
    { "name": "Amaro Nonino Quintessentia", "amount": "0.75 oz" },
    { "name": "Fresh lemon juice", "amount": "0.75 oz" }
  ],
  "method": "Shake vigorously with ice and strain into a chilled coupe.",
  "glassware": "Coupe",
  "credits": [
    {
      "entity": { "name": "Sam Ross", "did": "did:plc:samross" },
      "role": "author"
    }
  ],
  "coordinates": { "x": 4, "y": 1 }, // Crisp & Balanced
  "createdAt": "2026-09-25T18:00:00Z"
}
```

---

### 4. For Other Applications: Building on the Open Sensory Graph

The greatest advantage of AT Protocol lexicons is that **you do not need
permission or an API key from Crystal Coupe to build an application on this data**.

All records exist in users' and venues' public repositories. Any third-party
developer can read, index, or write to these collections.

#### What other applications can build:

1. **Alternative & Specialized Clients:**
   - Build a native iOS or watchOS fast-logger, an e-ink bar companion, or a
     deep-dive cocktail tasting journal.
   - When a user logs in with their ATProto handle, their palate coordinate and
     entire historic pour log load immediately — **zero cold-start problem**.
   - Pours logged in your client syndicate back into Crystal Coupe and any
     other compatible app.
2. **Nightlife Guides & "The Overlap" (Social Discovery):**
   - An app that reads the `app.crystalcoupe.palate` records of two or three
     friends and finds the mathematical intersection of their tastes.
   - Cross-reference with `app.crystalcoupe.menu` records across neighborhood
     venues to answer: *"Where within a 10-minute walk has drinks that satisfy
     both our palates?"*
3. **Cocktail Recipe Engines & Home Bar Apps:**
   - An inventory app (e.g. "What can I make with the bottles on my bar cart?")
     can index public `app.crystalcoupe.recipe` records to discover new specs
     authored by top bartenders worldwide, matching them to the user's home
     ingredients.
4. **Firehose Feeds & Curated Bots:**
   - Tap into the global ATProto firehose (`com.atproto.sync.subscribeRepos`)
     to create specialized discovery feeds on Bluesky:
     - *"Recent pours at Tokyo cocktail bars"*
     - *"Trending modern classics this week"*
     - *"Seasonal spring menu drops"*
5. **AI Sommelier & Concierge Agents:**
   - An AI agent can read a diner's public `app.crystalcoupe.palate` record
     to know their exact ingredient tolerances (e.g., `dislikesAnise: true`,
     `dislikesSmoke: true`) and flavor stance (Rich vs. Crisp) before making a
     dinner pairing recommendation.

#### Reading records permissionlessly (XRPC)

You can read records directly from any public relay or AppView without an account:

```ts
import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

// Fetch a bar's current menu
const venueRecord = await agent.api.com.atproto.repo.getRecord({
  repo: 'attaboy.nyc',
  collection: 'app.crystalcoupe.venue',
  rkey: 'self',
});

const currentMenuUri = venueRecord.data.value.currentMenu?.uri;
// Fetch the live menu snapshot:
// at://did:plc:.../app.crystalcoupe.menu/<tid>
```

#### Indexing via the ATProto Firehose

To index new pours, menus, and recipes in real time across the entire network:

```ts
// Pseudocode for a firehose consumer
import { Subscription } from '@atproto/xrpc-server';

// Subscribe to com.atproto.sync.subscribeRepos
// Filter commits where collection starts with 'app.crystalcoupe.'
for await (const evt of firehose) {
  for (const op of evt.ops) {
    if (op.action === 'create' && op.path.startsWith('app.crystalcoupe.pour/')) {
      // Ingest real-time drink check-in for sensory analytics
    }
    if (op.action === 'create' && op.path.startsWith('app.crystalcoupe.menu/')) {
      // Ingest new menu drop across global cocktail bars
    }
  }
}
```

---

## Architectural Commitments

Anyone building with or consuming these records can rely on five design invariants:

1. **Unclaimed entities use `defs#entityRef`.** Write the entity's human name
   and domain now; do not wait for them to register an account. When the venue
   or maker registers, reconciliation happens in the app view, never by
   rewriting signed records.
2. **Records are signed by their authors and never mutated.** Menus, pours, and
   recipes are immutable snapshots. History is captured through successive
   records, not row updates.
3. **No person-ranking endpoints.** `app.crystalcoupe.*` deliberately contains
   no field to score or rank a human being. Drink reviews describe the *drink*
   and the *recipe*, never the server or bartender.
4. **Zero lock-in.** Records live in the author's Personal Data Server (PDS).
   If Crystal Coupe disappears tomorrow, all drink history, menus, and specs
   remain fully readable and portable across any AT Protocol app.
5. **Path to `community.lexicon.*`.** The long-term goal of this project is to
   prove utility under `app.crystalcoupe.*` and then propose these schemas
   upstream to the Lexicon Community working group, establishing an open,
   universal sensory standard for the entire decentralized web.

