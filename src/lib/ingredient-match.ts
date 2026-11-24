import { drinkDatabase, type Drink } from './data';
import { matchDrink } from './drink-match';

/**
 * Deterministic analysis of free-text menu lines and house cocktail
 * descriptions. Used by both Compass's MenuView (bulk paste) and `/mcp`'s
 * `rank_menu` so unplaced house cocktails still warn on avoided flavours
 * (smoke, bitterness, anise) and can point to a close known classic when the
 * ingredients are clear.
 *
 * Never guesses when a line gives no signal: returns no flags and `null`
 * relative.
 */

export type AversionKey = 'smoke' | 'bitter' | 'anise';

export interface AversionFlags {
  smoke: boolean;
  bitter: boolean;
  anise: boolean;
}

const SMOKE_RE =
  /\b(mezcal|peated|peat|islay|laphroaig|ardbeg|lagavulin|smoke|smoky|smoked|charred|lapsang|bacanora|raicilla)\b/i;

const BITTER_RE =
  /\b(campari|aperol|amaro|fernet|suze|cynar|averna|montenegro|nonino|mal[oö]rt|gentian|cinchona|tonic|bitter|bitters|punt e mes|bruto americano|amer picon)\b/i;

const ANISE_RE =
  /\b(absinthe|pastis|pernod|ricard|herbsaint|ouzo|sambuca|arak|anise|licorice|liquorice|fennel|star anise)\b/i;

/** Detect smoke, bitterness, and anise signals in a drink name or ingredient description. */
export function detectAversions(text: string): AversionFlags {
  return {
    smoke: SMOKE_RE.test(text),
    bitter: BITTER_RE.test(text),
    anise: ANISE_RE.test(text),
  };
}

/** Which of `aversions` clash with the ingredients/words in `text`. */
export function clashingAversions(text: string, aversions: AversionFlags): AversionKey[] {
  const found = detectAversions(text);
  const out: AversionKey[] = [];
  if (aversions.smoke && found.smoke) out.push('smoke');
  if (aversions.bitter && found.bitter) out.push('bitter');
  if (aversions.anise && found.anise) out.push('anise');
  return out;
}

/**
 * Split a pasted menu line into its drink name and optional ingredient
 * description, stripping trailing prices (`$18`, `· 16`, `— $15`) and leading
 * bullets (`•`, `-`, `*`).
 */
export function splitMenuLine(raw: string): { name: string; description?: string } {
  const cleaned = raw
    .trim()
    .replace(/^[•·\-*–—]\s*/, '')
    // Strip trailing price like "$18", "$18.50", "· $18", "| 16"
    .replace(/\s*(?:[·|•–—-]\s*)?(?:\$|€|£)\s*\d+(?:\.\d{1,2})?\s*$/, '')
    .trim();

  if (!cleaned) return { name: '' };

  // If the full line already matches a drink on the map (e.g. "Daiquiri (Classic)"), keep it whole.
  if (matchDrink(cleaned)) return { name: cleaned };

  // Split on em-dash, en-dash, spaced hyphen, colon, or pipe: "Paper Tiger — mezcal, lime, agave"
  const sep = cleaned.match(/^(.+?)\s*(?:—|–|:|\|| - )\s*(.+)$/);
  if (sep) {
    const name = sep[1].trim();
    const description = sep[2].trim();
    if (name && description) return { name, description };
  }

  // Trailing parenthetical ingredient list: "Paper Tiger (mezcal, lime, chile)"
  const paren = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const name = paren[1].trim();
    const inside = paren[2].trim();
    // Only treat as ingredients if it contains a comma (avoids splitting "Daiquiri (Classic)").
    if (name && inside.includes(',')) return { name, description: inside };
  }

  return { name: cleaned };
}

interface CueRule {
  drinkName: string;
  /** Every group must match for this classic to be a credible structural relative. */
  requires: readonly RegExp[];
}

const RELATIVE_RULES: readonly CueRule[] = [
  { drinkName: 'Naked & Famous', requires: [/\bmezcal\b/i, /\b(aperol|campari|chartreuse|bitter)\b/i, /\b(lime|lemon|citrus)\b/i] },
  { drinkName: 'Mezcal Paloma', requires: [/\bmezcal\b/i, /\bgrapefruit\b/i] },
  { drinkName: 'Last Word', requires: [/\bgin\b/i, /\bchartreuse\b/i, /\blime\b/i] },
  { drinkName: 'Paper Plane', requires: [/\b(bourbon|whiskey|rye)\b/i, /\b(aperol|amaro)\b/i, /\b(lemon|citrus)\b/i] },
  { drinkName: 'Negroni', requires: [/\bgin\b/i, /\b(campari|aperol|bitter)\b/i, /\bvermouth\b/i] },
  { drinkName: 'Boulevardier', requires: [/\b(bourbon|rye|whiskey)\b/i, /\b(campari|amaro)\b/i, /\bvermouth\b/i] },
  { drinkName: 'Manhattan', requires: [/\b(rye|bourbon|whiskey)\b/i, /\bsweet vermouth\b/i] },
  { drinkName: 'Old Fashioned', requires: [/\b(rye|bourbon|whiskey)\b/i, /\bbitters?\b/i, /\b(sugar|demerara|syrup|maple|honey)\b/i] },
  { drinkName: 'Sazerac', requires: [/\b(rye|cognac|whiskey)\b/i, /\b(absinthe|pastis|herbsaint)\b/i] },
  { drinkName: 'Dry Martini', requires: [/\b(gin|vodka)\b/i, /\bdry vermouth\b/i] },
  { drinkName: 'Gin & Tonic', requires: [/\bgin\b/i, /\btonic\b/i] },
  { drinkName: 'Aperol Spritz', requires: [/\b(aperol|campari|bitter)\b/i, /\b(prosecco|champagne|sparkling|cava)\b/i] },
  { drinkName: 'French 75', requires: [/\bgin\b/i, /\b(champagne|prosecco|sparkling)\b/i, /\blemon\b/i] },
  { drinkName: 'Espresso Martini', requires: [/\b(espresso|coffee|cold brew)\b/i, /\b(vodka|rum|tequila|liqueur)\b/i] },
  { drinkName: 'Jungle Bird', requires: [/\brum\b/i, /\b(campari|bitter)\b/i, /\bpineapple\b/i] },
  { drinkName: 'Mai Tai', requires: [/\brum\b/i, /\b(orgeat|almond)\b/i, /\blime\b/i] },
  { drinkName: 'Daiquiri (Classic)', requires: [/\brum\b/i, /\blime\b/i] },
  { drinkName: "Margarita (Tommy's Style)", requires: [/\b(tequila|mezcal)\b/i, /\blime\b/i] },
  { drinkName: 'Paloma', requires: [/\btequila\b/i, /\bgrapefruit\b/i] },
  { drinkName: 'Whiskey Sour', requires: [/\b(bourbon|rye|whiskey)\b/i, /\blemon\b/i] },
  { drinkName: 'Sidecar', requires: [/\b(cognac|brandy)\b/i, /\blemon\b/i] },
  { drinkName: 'Moscow Mule', requires: [/\bvodka\b/i, /\bginger\b/i] },
];

/**
 * When a house cocktail isn't on the map, return the closest structural
 * classic if its description clearly names the defining ingredients, or `null`
 * if there isn't enough signal.
 */
export function suggestClosestDrink(text: string, drinks: readonly Drink[] = drinkDatabase): Drink | null {
  if (!text.trim()) return null;
  for (const rule of RELATIVE_RULES) {
    if (rule.requires.every((re) => re.test(text))) {
      return drinks.find((d) => d.name === rule.drinkName) ?? null;
    }
  }
  return null;
}
