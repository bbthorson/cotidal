---
summary: Worked examples for another app, venue or creator — publishing a venue and menu, writing a pour, the palate's shape, a recipe, and reading or indexing records without Cotidal.
read_when: Writing example records, documenting the lexicons for outsiders, or checking how an outside client would read them.
---

# Adopting the Cotidal lexicon

Worked examples. The records and the reasoning are
[data-model.md](data-model.md); the case for a bar is [data-model.md § Venues](data-model.md#venues).
Records carry no floats (integer hundredths or tenths, named for it), an
untouched field is absent, and nothing inferred is written in the author's
name. The plane runs Rich −10 → Crisp +10, Savory −10 → Sweet +10. No
permission or key from Cotidal is needed to read or write these.

## For Venues, POS systems & Menu Management tools

**Goal:** Publish canonical, versioned menus that render on the bar's website
and syndicate across the open network.

### Step A: Claim the venue record
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

### Step B: Publish a menu snapshot
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


## For Consumer Apps & Drink Logging Tools

**Goal:** Allow drinkers to log drinks, track their palate coordinate, and
maintain ownership of their taste history.

### Writing a Pour (Check-In)
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

### Reading & Updating the Palate
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


## For Beverage Creators & Bartenders

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


## Reading and indexing

### Reading records (XRPC)

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

### Indexing via the ATProto Firehose

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
