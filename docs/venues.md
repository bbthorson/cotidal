# Venues & B2B: Bars on the AT Protocol

Product reasoning for the supply side: how bars publish, how they understand
their patrons, and why an open sensory protocol replaces centralized platforms
(Yelp, Google Maps, Untappd, QR ordering portals).

Schemas live in `src/lib/atproto/lexicons/`; architectural routing notes live in
`docs/routes.md`.

## The problem with bar marketing

Hospitality marketing is broken for independent cocktail bars and beverage
programs:

1. **Centralized gatekeepers extract rent.** Google Maps and Yelp charge bars
   to defend their own brand searches from competitor ads, while reducing
   craft cocktails to 1-to-5 star reviews from patrons angry about the coat
   check or wait times.
2. **Menus rot in silos.** Menus live in unindexed PDFs, outdated photo uploads,
   or bloated QR ordering systems that lock the bar into proprietary silos.
3. **Influence is uncredited.** World-renowned bars invent modern classics
   poured across thousands of bars globally, but receive zero structured data,
   attribution, or commercial leverage from that distribution.
4. **Patron communication is algorithmically taxed.** Reaching followers on
   Instagram requires paying Meta to boost posts about seasonal menu drops,
   rare bottle tastings, or guest shifts.

## The four pillars of the B2B service

### 1. Menu as a Canonical Publication
A bar manages its cocktail menu in a clean back-office interface. Publishing
writes a signed, immutable `app.cotidal.menu` record to the venue's
AT Protocol repository.

- **Living, portable standard:** The menu renders statically on the bar's own
  domain (`bar.com/menu`) and syndicates instantly across the open network.
- **Sensory coordinates included:** Every drink carries its coordinate on the
  2D palate plane (Rich/Crisp, Savory/Sweet), giving guests instant flavor
  intuition without requiring an interrogation of the bartender.
- **Sightings vs. canonical menus:** Patron sightings (`capture: patron`) provide
  consensus coverage until the venue signs its own canonical record
  (`capture: venue`).

### 2. Palate Intelligence (Sensory Analytics)
Point-of-sale systems track dollar volume and pour costs; they cannot explain
*why* a drink fails or who the bar's audience actually is.

Aggregating anonymous patron coordinates yields sensory analytics:
- **Palate Density Mapping:** See the flavor distribution of actual guests
  (e.g., *"52% of your logged patrons sit in The Deep (Rich & Savory), but only
  15% of your cocktail list addresses that quadrant"*).
- **Dead-spot detection:** Identify unmet neighborhood demand (e.g., *"20% of
  scans search for dry, low-ABV options that are absent from your current menu"*).
- **Adoption metrics:** Measure true product-market fit via re-order rates
  (`wouldOrderAgain`) rather than subjective star ratings.

### 3. Proof of Influence & Recipe Syndication
Cocktail bars build cultural capital when their recipes become industry
classics.

With protocol-level `recipe`, `maker`, and `venue` records:
- **The "Cover Version" Ledger:** Track when other bars pour an authored spec
  (*"Your spec is currently poured at 34 bars across 8 cities, with 1,100 verified pours"*).
- **Sponsorship leverage:** Armed with verifiable adoption data, beverage
  directors negotiate brand sponsorships and distributor allocations with hard,
  verifiable reach rather than vague social follower counts.

### 4. Direct Patron Relationships
Because bars operate as sovereign AT Protocol accounts (verified by their
domain name), patrons who save or follow the venue are direct subscribers:
- Seasonal menu drops, single-barrel releases, and guest shifts broadcast
  directly to patrons with guaranteed delivery and zero platform ad tax.

## Lexicon mapping

| NSID | Role in B2B |
|---|---|
| `app.cotidal.venue` | Domain verification (`attaboy.nyc`), location, current menu pointer, publication link |
| `app.cotidal.menu` | Signed, versioned menu snapshot with section headers, item specs, and document pointer |
| `app.cotidal.recipe` | Authored spec, technique, creator attribution |
| `app.cotidal.maker` | Bartender professional profile and portable portfolio |
| `app.cotidal.pour` | Patron check-in and re-order signal (`wouldOrderAgain`) |
| `app.cotidal.bar` | The venue's space: pours patrons share with the bar alone, the source of palate intelligence without publishing anyone's log (`docs/spaces.md`) |
| `site.standard.publication` | Canonical web publication (Standard.site), served at `/.well-known/site.standard.publication` |
| `site.standard.document` | Individual syndicated menu release, announcement, or editorial post |

## Verification & Hosting model

A bar does not need a special crypto wallet, manual approval queue, or separate CMS.
Verification has two levels:

### Level 1 — URL matched to DID (today)
Claiming a bar is about matching the bar's website URL to its AT Protocol DID (`src/lib/atproto/venue-verify.ts`):

1. **Domain-to-DID Match:** The bar's website domain (`attaboy.nyc`) resolves to the bar's DID — either because the bar uses that domain as its AT Protocol handle (via DNS `_atproto.attaboy.nyc` TXT or `https://attaboy.nyc/.well-known/atproto-did`), or via CNAME to Cotidal's static edge proxy.
2. **Canonical Claim:** `/bars/publish` checks that the website URL's domain resolves to the signed-in account's DID before writing `app.cotidal.venue` at `rkey: self` (and pointing `currentMenu` to its live menu).
3. **Retroactive Reconciliation:** All patron sightings and historic pour records referencing `attaboy.nyc` light up under the venue's account.
4. **Standard.site & Zero-JS Web Site (later):** The edge responds to `https://attaboy.nyc/.well-known/site.standard.publication` pointing to `at://<did>/site.standard.publication/self` and renders a fast, accessible, paper-and-ink web presence directly from the repository's signed records.

### Level 2 — Physical address by postcard (later)
A domain match proves control of the website; it does not by itself prove physical occupancy of a street address. A second level of verification — to come later — will mail a physical postcard to the bar's address with a unique one-time code to enter, proving the claimant is actually at that address.

## Commercial model

- **Free / Utility:** Handle-as-domain claim, hosted static web menu, open
  AT Protocol syndication, and basic sighting view.
- **Pro ($49–$99/mo):** Palate Density analytics, sensory menu engineering,
  POS menu sync, 86'd item rapid status toggles.
- **Enterprise / Hospitality Groups:** Multi-venue portfolio reporting, recipe
  licensing/syndication tracking, brand sponsorship analytics.
