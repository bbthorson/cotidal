# Adopting the Cotidal Lexicon

Why and how third-party apps, venues, point-of-sale systems, and beverage
creators adopt `app.cotidal.*`.

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
2. **Menus are posts, not database rows.** A menu in `app.cotidal.menu` is
   an immutable, signed, dated snapshot. Version history is free, menus never
   rot, and syndication to websites, mobile apps, and discovery feeds happens
   automatically.
3. **Attribution without rank.** Bartenders who invent modern classics poured in
   thousands of bars globally currently receive zero structured attribution.
   `app.cotidal.recipe` and `maker` build a verifiable ledger of adoption
   (*"poured at 34 bars across 8 cities, with 1,100 verified pours"*). Ratings
   attach to recipes, never to people.
4. **Sovereign ownership via handle-as-domain.** Venues claim themselves by
   proving their domain name (`attaboy.nyc`). There is no centralized registry,
   no gatekeeper charging rent, and no lock-in.
5. **Atmosphere and Standard.site interoperability.** Venues can pair
   `app.cotidal.venue` and `menu` with `site.standard.publication` and
   `document`, enabling native Bluesky rich unfurls, reader syndication, and
   fast static websites on their own domain.

---

## The Lexicons at a glance

| NSID | Key | Role |
|---|---|---|
| `app.cotidal.palate` | `self` | Drinker's 2D coordinate, dynamic psychophysical state (EKF), aversions and vibe tags |
| `app.cotidal.pour` | `tid` | Drink check-in with hedonic and gLMS ratings, CATA notes, perceived intensities, and what was served (spirit, glass, garnish) |
| `app.cotidal.elicitation` | `tid` | The answers behind one completed quiz: what each question offered and which option was taken |
| `app.cotidal.menu` | `tid` | Signed menu snapshot with sections, items, and coordinates |
| `app.cotidal.recipe` | `tid` | Authored formulation, specs, technique, physical stimulus, and creator credits |
| `app.cotidal.venue` | `self` | Venue profile, location, current menu pointer, and publication link |
| `app.cotidal.maker` | `self` | Professional portfolio linking authored recipes |
| `app.cotidal.defs` | — | Shared types: `stimulus`, `entityRef`, `venueRef`, `drinkRef`, `credit`, `price` |

---

## How to adopt: by use case

### 1. For Venues, POS systems & Menu Management tools

**Goal:** Publish canonical, versioned menus that render on the bar's website
and syndicate across the open network.

#### Step A: Claim the venue record
Held at `rkey: self` in the venue's repository. Possession of this record
under a verified domain handle (`attaboy.nyc`) *is* the claim:

```jsonc
// app.cotidal.venue at rkey: self
{
  "$type": "app.cotidal.venue",
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
    "uri": "at://did:plc:venue123/app.cotidal.menu/3l1234567890"
  },
  "publication": {
    "name": "Attaboy NYC",
    "uri": "at://did:plc:venue123/site.standard.publication/self"
  },
  "createdAt": "2026-09-25T18:00:00.000Z"
}
```

#### Step B: Publish a menu snapshot
Menus are published at a `tid` key whenever the cocktail list changes:

```ts
import { Agent } from '@atproto/api';

// `session` is the venue's OAuth session (@atproto/oauth-client, or any
// client that yields one). Cotidal itself uses @bbthorson/atproto-cf-auth.
const agent = new Agent(session);

await agent.com.atproto.repo.createRecord({
  repo: venueDid,
  collection: 'app.cotidal.menu',
  record: {
    $type: 'app.cotidal.menu',
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
            drink: {
              name: 'Penicillin',
              slug: 'penicillin',
              baseSpirit: 'scotch',
              recipe: {
                name: 'Penicillin (Original Spec)',
                uri: 'at://did:plc:samross/app.cotidal.recipe/3l9876543210',
              },
            },
            description: 'Blended scotch, fresh lemon, honey-ginger syrup, Islay float',
            price: { amount: 2200, currency: 'USD' },
            // No coordinates: where a drink sits on the map is the app view's to compute.
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
When a user orders a drink, write `app.cotidal.pour` to **their** repository:

```ts
await agent.com.atproto.repo.createRecord({
  repo: userDid,
  collection: 'app.cotidal.pour',
  record: {
    $type: 'app.cotidal.pour',
    drink: {
      name: 'Penicillin',
      slug: 'penicillin',
      stimulus: {
        // Integers named for their unit: records carry no floats.
        abvTenths: 185,            // 18.5%
        residualSugarGpl: 45,
        acidityPhHundredths: 320,  // pH 3.20
        astringencyIndexTenths: 30,
        matrixType: 'cocktail',
      },
      recipe: {
        name: 'Penicillin',
        uri: 'at://did:plc:samross/app.cotidal.recipe/3l9876543210',
      },
    },
    venue: {
      entity: {
        name: 'Attaboy',
        domain: 'attaboy.nyc',
      },
    },
    rating: {
      hedonic: 8,            // 1-9 hedonic scale
      glmsValence: 65,       // gLMS liking, -100 to +100, whole points
      wouldOrderAgain: true, // adoption, not approval
    },
    perceivedIntensities: {  // 0-100, whole points
      sweetness: 42,
      sourness: 68,
      bitterness: 28,
      astringency: 25,
    },
    deviations: ['too-sour'],
    cata: ['campfire-smoke', 'bright-citrus', 'baking-spice'], // ids from CATA, not labels
    // Volume drunk and time since eating feed the filter on the device and
    // are never part of the record.
    note: 'Perfect ginger heat and peaty aromatics.',
    createdAt: new Date().toISOString(),
  },
});
```

#### Reading & Updating the Palate
Drinker coordinates and dynamic psychophysical state live at `app.cotidal.palate` at `rkey: self`.
The preference state is modeled as an Extended Kalman Filter (EKF) tracking 5 latent sensory dimensions:

```jsonc
// app.cotidal.palate at rkey: self
{
  "$type": "app.cotidal.palate",
  // Integers only: every fractional value is in hundredths (-420 is -4.20).
  "mapCoordinates": { "xHundredths": -420, "yHundredths": -210 },
  "dynamicState": {
    // Latent vector: [RichCrisp, SavorySweet, BitterTolerance, TanninTolerance, Complexity]
    "latentVectorHundredths": [-420, -210, 450, 650, 500],
    // Diagonal of the error covariance P_k (uncertainty)
    "covarianceDiagonalHundredths": [12, 15, 8, 9, 14],
    "eventCount": 18,
    "lastUpdate": "2026-09-25T18:00:00.000Z"
  },
  "aversions": { "smoke": false, "bitter": false, "anise": true },
  "vibeTagWeights": [
    { "tag": "classic", "weightHundredths": 225 },
    { "tag": "complex", "weightHundredths": 100 }
  ],
  "createdAt": "2026-09-01T18:00:00.000Z",
  "updatedAt": "2026-09-25T18:00:00.000Z"
}
```

---

### 3. For Beverage Creators & Bartenders

**Goal:** Publish authored specs, establish provenance, and build a portable
portfolio.

Publish `app.cotidal.recipe` to establish the canonical spec:

```jsonc
// app.cotidal.recipe at rkey: tid
{
  "$type": "app.cotidal.recipe",
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
  "glassware": "coupe",
  "stimulus": {
    "abvTenths": 210,
    "residualSugarGpl": 65,
    "acidityPhHundredths": 290,
    "astringencyIndexTenths": 20,
    "matrixType": "cocktail"
  },
  "credits": [
    {
      "entity": { "name": "Sam Ross", "did": "did:plc:samross" },
      "role": "author"
    }
  ],
  "coordinates": { "xHundredths": 400, "yHundredths": 100 }, // Crisp & Balanced
  "createdAt": "2026-09-25T18:00:00.000Z"
}
```

---

### 4. For Other Applications: Building on the Open Sensory Graph

The greatest advantage of AT Protocol lexicons is that **you do not need
permission or an API key from Cotidal to build an application on this data**.

All records exist in users' and venues' public repositories. Any third-party
developer can read, index, or write to these collections.

#### What other applications can build:

1. **Alternative & Specialized Clients:**
   - Build a native iOS or watchOS fast-logger, an e-ink bar companion, or a
     deep-dive cocktail tasting journal.
   - When a user logs in with their ATProto handle, their palate coordinate and
     entire historic pour log load immediately — **zero cold-start problem**.
   - Pours logged in your client syndicate back into Cotidal and any
     other compatible app.
2. **Nightlife Guides & "The Overlap" (Social Discovery):**
   - An app that reads the `app.cotidal.palate` records of two or three
     friends and finds the mathematical intersection of their tastes.
   - Cross-reference with `app.cotidal.menu` records across neighborhood
     venues to answer: *"Where within a 10-minute walk has drinks that satisfy
     both our palates?"*
3. **Cocktail Recipe Engines & Home Bar Apps:**
   - An inventory app (e.g. "What can I make with the bottles on my bar cart?")
     can index public `app.cotidal.recipe` records to discover new specs
     authored by top bartenders worldwide, matching them to the user's home
     ingredients.
4. **Firehose Feeds & Curated Bots:**
   - Tap into the global ATProto firehose (`com.atproto.sync.subscribeRepos`)
     to create specialized discovery feeds on Bluesky:
     - *"Recent pours at Tokyo cocktail bars"*
     - *"Trending modern classics this week"*
     - *"Seasonal spring menu drops"*
5. **AI Sommelier & Concierge Agents:**
   - An AI agent can read a diner's public `app.cotidal.palate` record
     to know their psychophysical latent state (bitter and tannin tolerance,
     appetite for complexity), their aversions, and their flavor stance before
     making a dinner pairing recommendation. It carries no genetic claims: a
     taste phenotype is not something one quiz answer can establish.

#### Reading records permissionlessly (XRPC)

Records live on the author's PDS, and any PDS serves its public records
without an account. Bluesky's AppView indexes only `app.bsky.*`, so resolve the
author's PDS first — handle → DID → DID document → its `#atproto_pds` service,
as `src/lib/atproto/public-read.ts` does for `/p/<handle>`:

```ts
import { AtpAgent } from '@atproto/api';

// pdsUrl: the serviceEndpoint of the venue's #atproto_pds, from its DID document.
const agent = new AtpAgent({ service: pdsUrl });

// Fetch a bar's current menu
const venueRecord = await agent.com.atproto.repo.getRecord({
  repo: venueDid,
  collection: 'app.cotidal.venue',
  rkey: 'self',
});

const currentMenuUri = venueRecord.data.value.currentMenu?.uri;
// Fetch the live menu snapshot:
// at://did:plc:.../app.cotidal.menu/<tid>
```

#### Indexing via the ATProto Firehose

To index new pours, menus, and recipes in real time across the entire network:

```ts
// Pseudocode for a firehose consumer (@atproto/sync's Firehose is one way in).
// Subscribe to com.atproto.sync.subscribeRepos
// Filter commits where collection starts with 'app.cotidal.'
for await (const evt of firehose) {
  for (const op of evt.ops) {
    if (op.action === 'create' && op.path.startsWith('app.cotidal.pour/')) {
      // Ingest real-time drink check-in for sensory analytics
    }
    if (op.action === 'create' && op.path.startsWith('app.cotidal.menu/')) {
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
3. **No person-ranking endpoints.** `app.cotidal.*` deliberately contains
   no field to score or rank a human being. Drink reviews describe the *drink*
   and the *recipe*, never the server or bartender.
4. **Zero lock-in.** Records live in the author's Personal Data Server (PDS).
   If Cotidal disappears tomorrow, all drink history, menus, and specs
   remain fully readable and portable across any AT Protocol app.
5. **Path to `community.lexicon.*`.** The long-term goal of this project is to
   prove utility under `app.cotidal.*` and then propose these schemas
   upstream to the Lexicon Community working group, establishing an open,
   universal sensory standard for the entire decentralized web.

