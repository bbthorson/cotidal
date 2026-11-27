---
summary: Outside sources that could supply drink profiles, names and recipes (TheCocktailDB, API Ninjas, Wikipedia, Wikidata, BJCP), what each gives and on what terms, checked November 2026.
read_when: Adding drinks in bulk, importing recipes or style figures, or considering any third-party drink data.
---

# Where new drinks come from

A drink is placed from its style (`src/lib/drinks/placement.ts`): body,
residual sugar and structure (tannin or hop bitterness), or for a cocktail
its ingredients and amounts. Names and aliases help on their own
(`matchDrink`); a generic name is an alias of the one drink menus most often
mean by it (a plain "Spritz" is the Aperol Spritz), until the family has
drinks of its own to tell apart (Campari, Select, Cynar and other spritzes). Prose is never taken from a source (AGENTS.md, Drink and
region prose). **Nothing is called at runtime:** a source is read once, by
hand or script, and what is kept is checked and committed. Re-read terms
before relying on any of these.

## Cocktails

**TheCocktailDB** (`thecocktaildb.com/api.php`): name, category, glass,
instructions, image, up to 15 ingredient/measure pairs, optional `strIBA`;
user-contributed. Terms: API content may be copied and modified; no scraping
the site; free use is for development ("you cannot publish apps to an
appstore unless you are a paid subscriber"); paid use must credit it.
Premium is a one-off $10. Whether a website is covered free is unclear: if
its data ships, buy the key and credit it.

**API Ninjas Cocktail** (`api-ninjas.com/api/cocktail`): search by name or
ingredients, up to 10 results with ingredients and instructions; no
commercial use on the free tier. It reads like IBA specifications, so go to
the IBA directly.

Neither gives a position. Their use: candidate cocktails and ingredients, to
check against bar manuals, and amounts for any later attempt at placing
a cocktail from its recipe (Placing a cocktail, below).

**Wikipedia** (`List_of_cocktails`, `List_of_IBA_official_cocktails`): an
index, never a source. Its text is CC BY-SA, so close paraphrase would make
an entry share-alike; its recipes are often uncited and change between
edits. Use it for which drinks exist and what else they are called (names
are facts), and follow its citations to the primary sources an entry cites.
The IBA list is the trade's own canon, in three tiers (The Unforgettables,
Contemporary Classics, New Era Drinks).
Each spec is a page at `iba-world.com/iba-cocktail/<slug>/` (amounts in ml,
method, garnish, and notes on variants), read with a plain GET once
`iba-world.com` is an allowed host; it is the source most drink entries cite.
Every drink on its list is on the map (matched by `matchDrink`, some by
alias: Lemon Drop Martini, Fernandito), most placed by hand without an
entry. Not on its list, so without an entry until another primary source is found:
Batanga, Tequila Sour, Cantarito, Vampiro, Mexican Martini, Tequila & Tonic,
Michelada and Ranch Water.

**Wikidata**: structured data under CC0 (no attribution, no share-alike;
`Wikidata:Copyright`), and the better bulk source. A cocktail item carries
`P31` `Q2536409` (IBA official cocktail), `P279` `Q134768` (cocktail),
ingredients as `P186` (made from material) with amounts in parts as `P1114`
(quantity) qualifiers, and `P9056`, its TheCocktailDB id. The Negroni
(`Q1401202`) is 3 : 3 : 3; the Margarita (`Q657621`) is 3.5 : 2 : 1.5. Those
parts are the input a placement by amounts needs, and cross-check what a
spec in an entry says. Coverage beyond the well-known drinks is unchecked.

Reading them: the MediaWiki APIs (`api.php`) rate-limit the cloud sessions'
shared address. A page's raw text (`index.php?title=…&action=raw`) and an
item's JSON (`Special:EntityData/<Q>.json`) were served; a bulk pull would
go through `query.wikidata.org` (SPARQL), untried. Hosts must be allowed in
the environment's network settings.

RapidAPI's "Alcohol and Brewery APIs" is a marketplace, not a source; none of
it carries sensory figures.

## Placing a cocktail

A house cocktail is placed from the ingredients a menu lists
(`placeDirectional`), and a wine or beer from its style (`placeStyle`,
2.9 points RMS). Placing a cocktail from its amounts, the way a style
places a wine, was tried and does not beat the first
(`scripts/placement-spike.ts`, November 2026):

- **What was tried.** A table of what each ingredient holds per ml (alcohol,
  sugar, acid, bitterness, savouriness, fat, aged character, sparkle); each
  drink's makeup after dilution by method; a ridge fit of x and y to the 94
  hand-placed cocktails with amounts in their entries, each scored held out
  of the fit. Balance terms (log sugar, sugar against acid) and a
  nearest-neighbour fit were tried too.
- **What it found.** 4.9 points RMS at best (5.0 linear, 5.4 neighbours;
  8.5 for every drink at the mean), against 4.9 for `placeDirectional` on the
  same drinks it was set from. About 3.5 points on each axis.
- **Why.** The largest misses are hand placements that carry something the
  makeup does not: the Penicillin's smoke, the Americano's crispness, the
  Cosmopolitan, Aviation and 20th Century placed rich though shaken and
  sour. Under 3 would need the hand placements revisited, not a better
  model. A menu drink named as a variation of a classic (its spec supplying
  the amounts) waits on this.

## Styles

- **Beer:** the BJCP Style Guidelines give OG, FG, IBU and ABV per style; FG
  stands in for residual sugar and IBU for structure, replacing the typical
  figures in `data.ts`. Confirm the guidelines' terms first.
- **Wine:** no API gives residual sugar or tannin. Use appellation rules (EU
  law sets sparkling sugar categories) and producers' technical sheets.
