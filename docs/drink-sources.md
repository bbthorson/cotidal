# Where new drinks come from

The map grows by style (`src/lib/drinks/placement.ts`): a drink is placed from its
body, residual sugar and structure, not by eye. This page records which
outside sources can feed that, and on what terms. Checked November 2026;
re-read the terms before relying on any of them.

## What a source has to give

A position needs **body**, **residual sugar** and **structure** (tannin or
hop bitterness) for a style, or, for a cocktail, its ingredients and their
amounts. Names and aliases are useful on their own: they are how a pour finds
its drink (`matchDrink`). Prose is never taken from a source; it is written
from primary sources (`AGENTS.md`, Drink prose).

Nothing below is called at runtime. Logging and the quiz work offline and
send nothing about what a member drinks to a third party; a source is read
once, by hand or by a script, and what is kept is checked and committed.

## Cocktail recipe APIs

**TheCocktailDB** (`thecocktaildb.com/api.php`). Per drink: name, category,
alcoholic or not, glass, instructions, image, and up to 15 ingredient and
measure pairs (`strIngredient1..15`, `strMeasure1..15`), with optional
`strIBA` and tags. Records and artwork are user-contributed.
- Terms (`/terms_of_use.php`, shared with TheMealDB): content returned by the
  API may be copied and modified; the website may not be scraped; notices may
  not be removed. Free use is for development projects, and "you cannot
  publish apps to an appstore unless you are a paid subscriber"; paid use
  must "mention us as the source of the data". The test key `1` is "during
  development of your app or for educational use". Premium is a one-off $10
  and lifts the 100-item cap on listing the database.
- Cotidal is a website, not an app-store app, so whether the free tier covers
  it is not spelled out. If its data is used in anything that ships, buy the
  premium key and credit TheCocktailDB.

**API Ninjas Cocktail** (`api-ninjas.com/api/cocktail`). Search by name
(partial match) or by ingredients (all must match); up to 10 results, each
`name`, `ingredients` (strings with the measure inside, e.g.
`"4.5 cl (3 parts) vodka"`) and `instructions`. Its FAQ: commercial use "is
not permitted on the free tier". The sample reads like IBA specifications,
which would make the IBA the better source to go to directly.

Use: a list of candidate cocktails and their ingredients, to be checked
against bar manuals, and — the reason to want them — the input for placing
cocktails by ingredient once that model exists (calibrated, as wine and beer
were, against the 75 hand-placed cocktails, with `src/lib/drinks/ingredients.ts` as
the vocabulary). Neither gives a cocktail's position.

## RapidAPI "Alcohol and Brewery APIs"

A marketplace collection, not a source. It lists TheCocktailDB, Direct Wines
(a retailer's catalogue and ordering), Global Wine Score (aggregated critics'
scores) and Open Brewery DB (a community-built list of breweries). None
carries sensory figures; breweries are places, which OpenStreetMap already
covers for bars near you.

## Better sources for styles

- **Beer:** the BJCP Style Guidelines give each style's vital statistics
  (OG, FG, IBU, ABV). FG stands in for residual sugar and IBU for structure,
  so the beer profiles in `data.ts` — currently typical figures — can be
  replaced with them. Confirm the guidelines' terms before committing figures.
- **Wine:** no API found gives residual sugar or tannin. Appellation rules
  (sugar categories for sparkling wine are set in EU law) and producers'
  technical sheets remain the sources.
