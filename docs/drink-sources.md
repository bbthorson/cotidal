---
summary: Outside sources that could supply drink profiles, names and recipes (TheCocktailDB, API Ninjas, BJCP), what each gives and on what terms, checked November 2026.
read_when: Adding drinks in bulk, importing recipes or style figures, or considering any third-party drink data.
---

# Where new drinks come from

A drink is placed from its style (`src/lib/drinks/placement.ts`): body,
residual sugar and structure (tannin or hop bitterness), or for a cocktail
its ingredients and amounts. Names and aliases help on their own
(`matchDrink`). Prose is never taken from a source (AGENTS.md, Drink and
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
check against bar manuals, and input for placing cocktails by ingredient
once that model exists (calibrated against the 75 hand-placed cocktails,
with `src/lib/drinks/ingredients.ts` as the vocabulary).

RapidAPI's "Alcohol and Brewery APIs" is a marketplace, not a source; none of
it carries sensory figures.

## Styles

- **Beer:** the BJCP Style Guidelines give OG, FG, IBU and ABV per style; FG
  stands in for residual sugar and IBU for structure, replacing the typical
  figures in `data.ts`. Confirm the guidelines' terms first.
- **Wine:** no API gives residual sugar or tannin. Use appellation rules (EU
  law sets sparkling sugar categories) and producers' technical sheets.
