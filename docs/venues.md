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
writes a signed, immutable `app.crystalcoupe.menu` record to the venue's
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
  (e.g., *"52% of your logged patrons sit in The Ember (Rich & Savory), but only
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
| `app.crystalcoupe.venue` | Domain verification (`attaboy.nyc`), location, current menu pointer, publication link |
| `app.crystalcoupe.menu` | Signed, versioned menu snapshot with section headers, item specs, and document pointer |
| `app.crystalcoupe.recipe` | Authored spec, technique, creator attribution |
| `app.crystalcoupe.maker` | Bartender professional profile and portable portfolio |
| `app.crystalcoupe.pour` | Patron check-in and re-order signal (`wouldOrderAgain`) |
| `site.standard.publication` | Canonical web publication (Standard.site), served at `/.well-known/site.standard.publication` |
| `site.standard.document` | Individual syndicated menu release, announcement, or editorial post |

## Verification & Hosting model

A bar does not need a special crypto wallet, manual approval queue, or separate CMS.
Ownership and web publishing derive from **handle-as-domain + Standard.site**:

1. **One DNS Record:** The bar points its domain (`attaboy.nyc`) via CNAME to Crystal Coupe's static edge proxy.
2. **Handle Verification:** The edge responds to `https://attaboy.nyc/.well-known/atproto-did` with the venue's DID, completing ATProto domain-handle verification without manual TXT record juggling.
3. **Standard.site Publication:** The edge responds to `https://attaboy.nyc/.well-known/site.standard.publication` pointing to `at://<did>/site.standard.publication/self`.
4. **Canonical Claim:** The venue signs `app.crystalcoupe.venue` at `rkey: self` in its repository, pointing `currentMenu` to its live menu and `publication` to its Standard.site publication.
5. **Retroactive Reconciliation:** All patron sightings and historic pour records referencing `attaboy.nyc` instantly light up under the venue's account.
6. **Zero-JS Astro Web Site:** The edge renders a fast, accessible, paper-and-ink web presence directly from the repository's signed records. Documents include `<link rel="site.standard.document" href="...">` in `<head>` for rich Bluesky preview cards and ATProto reader unfurls.

## Commercial model

- **Free / Utility:** Handle-as-domain claim, hosted static web menu, open
  AT Protocol syndication, and basic sighting view.
- **Pro ($49–$99/mo):** Palate Density analytics, sensory menu engineering,
  POS menu sync, 86'd item rapid status toggles.
- **Enterprise / Hospitality Groups:** Multi-venue portfolio reporting, recipe
  licensing/syndication tracking, brand sponsorship analytics.
