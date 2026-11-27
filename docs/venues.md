---
summary: The supply side — why bars would publish menus to the protocol, what they get (menus, palate intelligence, proof of influence, direct reach), how claiming works at two levels, and the commercial model.
read_when: Working on /bars, /v/<handle>, venue claiming or verification, or anything sold to bars.
---

# Venues

Why a bar publishes to an open sensory protocol rather than renting from
Yelp, Google Maps, Untappd or a QR portal. The records are
`docs/data-model.md`; examples `docs/lexicon-adoption.md`; a bar's private
space `docs/spaces.md`.

## The problem

Gatekeepers charge bars to defend their own brand searches and reduce craft
drinks to star ratings about the coat check. Menus rot in PDFs, photo uploads
and proprietary QR systems. Bars that invent modern classics get no
attribution for the thousands of bars that pour them. Reaching followers
means paying to boost posts.

## What a bar gets

1. **The menu as a canonical publication.** Publishing writes a signed,
   immutable `app.cotidal.menu` to the venue's repo; it can render on the
   bar's own domain and syndicates across the network. The app view places
   each drink on the map through `matchDrink`: the bar asserts no
   coordinates. Patron sightings (`capture: patron`) cover a bar until it
   signs its own (`capture: venue`).
2. **Palate intelligence.** Aggregated, anonymous patron tastes: who the
   audience is ("52% of your logged patrons sit in The Deep; 15% of your list
   does"), unmet demand, and reorder rates (`wouldOrderAgain`) instead of
   stars. Patrons share pours with the bar alone through its space.
3. **Proof of influence.** With `recipe`, `maker` and `venue` records, a
   bar sees where its specs are poured ("34 bars, 8 cities, 1,100 pours"),
   verifiable reach for sponsorships and allocations.
4. **Direct reach.** A bar is its own AT Protocol account; menu drops and
   guest shifts reach patrons who follow it, with no ad tax.

Standard.site pairs with this: `site.standard.publication` (served at
`/.well-known/site.standard.publication`) for the bar's site, and
`site.standard.document` for a menu release or announcement.

## Verification

**Level 1, built: the domain matches the DID** (`venue-verify.ts`). The
bar's website domain resolves to its DID, as its handle (DNS
`_atproto.<domain>` or `/.well-known/atproto-did`) or via CNAME to
Cotidal's edge. `/bars` (Claim your bar) checks it against the signed-in DID,
then writes `app.cotidal.venue` at `self` and its menu; `/v/<handle>` renders
them. Every sighting and pour that named the domain reconciles to it. Later:
the edge serves the bar's Standard.site publication and a static site from
its records.

**Level 2, later: a postcard.** A domain proves the website, not the street
address. A postcard with a one-time code proves the claimant is at it.

## Commercial model

- **Free:** the claim, a hosted static menu, syndication, the sighting view.
- **Pro ($49–99/mo):** palate analytics, menu engineering, POS sync, 86'd
  toggles.
- **Groups:** multi-venue reporting, recipe syndication tracking, sponsorship
  analytics.
