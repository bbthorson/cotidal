import { drinkDatabase, type Drink } from './data';
import {
  INGREDIENT_INDEX,
  ROLE_WEIGHT,
  type IngredientPrimitive,
} from './ingredients';
import { matchDrink } from './search';
import {
  distanceBetween,
  quadrantIdFor,
  roundTenth,
  type QuadrantId,
} from '../map/coordinates';

/**
 * Deterministic analysis of free-text menu lines and house cocktail
 * descriptions. Used by both Compass's MenuView (bulk paste) and `/mcp`'s
 * `rank_menu` so unplaced house cocktails still warn on avoided flavours
 * (smoke, bitterness, anise), compute an honest directional placement from
 * the canonical Ingredients Index, and point to a close known classic when
 * ingredients give a clear signal.
 *
 * Never guesses when a line gives no signal: returns no flags, `null`
 * directional placement, and `null` relative.
 */

export type AversionKey = 'smoke' | 'bitter' | 'anise';

export interface AversionFlags {
  smoke: boolean;
  bitter: boolean;
  anise: boolean;
}

/** Residual sensory words not tied to one single bottle/ingredient primitive. */
const EXTRA_SMOKE_RE = /\b(smoke|smoky|smoked|charred|lapsang)\b/i;
const EXTRA_BITTER_RE = /\b(bitter|bitters)\b/i;
const EXTRA_ANISE_RE = /\b(anise|licorice|liquorice|fennel|star anise|hoja santa)\b/i;

/** Non-alcoholic terms and common zero-proof spirit/aperitif brands. */
const NA_TEXT_RE =
  /\b(non[- ]?alcoholic|zero[- ]?proof|spirit[- ]?free|alcohol[- ]?free|mocktail|de-?alcoholized|everleaf|pentire|aplos|roots divino|seedlip|ghia|lyre'?s|ritual zero|pathfinder|wilderton|three spirit|free spirits|st\.?\s*agrestis|phoney negroni)\b|(?:\bn\/a\b|\(n\/?a\))/i;
const NA_SECTION_RE =
  /\b(non[- ]?alcoholic|zero[- ]?proof|spirit[- ]?free|alcohol[- ]?free|mocktails?|temperance|no[- ]?proof|na)\b|\bn\/a\b/i;

const SPECIFIC_WHISKEY_IDS = new Set(['rye', 'bourbon', 'scotch', 'irish-whiskey', 'peated-whisky']);
const SPECIFIC_VERMOUTH_IDS = new Set(['sweet-vermouth', 'dry-vermouth', 'lillet-cocchi']);

/** Whether a drink line or its menu section signals a non-alcoholic / zero-proof drink. */
export function isNonAlcoholic(text: string, section?: string): boolean {
  if (section && NA_SECTION_RE.test(section)) return true;
  return NA_TEXT_RE.test(text);
}

/** Match all canonical cocktail primitives present in a free-text description. */
export function extractPrimitives(text: string): IngredientPrimitive[] {
  if (!text.trim()) return [];
  const matched = INGREDIENT_INDEX.filter((p) => p.match.test(text));
  const hasSpecificWhiskey = matched.some((p) => SPECIFIC_WHISKEY_IDS.has(p.id));
  const hasSpecificVermouth = matched.some((p) => SPECIFIC_VERMOUTH_IDS.has(p.id));
  if (!hasSpecificWhiskey && !hasSpecificVermouth) return matched;
  return matched.filter(
    (p) =>
      !(hasSpecificWhiskey && p.id === 'whiskey') &&
      !(hasSpecificVermouth && p.id === 'vermouth')
  );
}

/** Detect smoke, bitterness, and anise signals in a drink name or ingredient description. */
export function detectAversions(text: string): AversionFlags {
  const primitives = extractPrimitives(text);
  return {
    smoke: EXTRA_SMOKE_RE.test(text) || primitives.some((p) => p.flags?.smoke),
    bitter: EXTRA_BITTER_RE.test(text) || primitives.some((p) => p.flags?.bitter),
    anise: EXTRA_ANISE_RE.test(text) || primitives.some((p) => p.flags?.anise),
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

const TRAILING_PRICE_RE = /\s*(?:[·|•–—-]\s*)?((?:\$|€|£)\s*\d+(?:\.\d{1,2})?)\s*$/;

/** Extract a trailing menu price (`$18`, `€15.50`, `£14`) if present on a raw line. */
export function extractMenuPrice(raw: string): string | undefined {
  const m = raw.trim().match(TRAILING_PRICE_RE);
  return m ? m[1].replace(/\s+/g, '') : undefined;
}

/**
 * Parse a section header line (`## Non-Alcoholic`, `[Les Martinis]`, or
 * `Non-Alcoholic:`). Returns the clean section name, or `null` for drink lines.
 */
export function parseSectionHeader(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const heading = trimmed.match(/^#{1,3}\s+(.+?)\s*#*$/);
  if (heading) return heading[1].trim() || null;
  const bracketed = trimmed.match(/^\[([^\]]+)\]$/);
  if (bracketed) return bracketed[1].trim() || null;
  const colonOnly = trimmed.match(/^([^:—–|]+):\s*$/);
  if (colonOnly) {
    const label = colonOnly[1].trim();
    if (label && !matchDrink(label)) return label;
  }
  return null;
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
    .replace(TRAILING_PRICE_RE, '')
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
export function suggestClosestDrink(
  text: string,
  drinks: readonly Drink[] = drinkDatabase,
  options?: { section?: string; nonAlcoholic?: boolean }
): Drink | null {
  if (!text.trim()) return null;
  if (options?.nonAlcoholic || isNonAlcoholic(text, options?.section)) return null;
  for (const rule of RELATIVE_RULES) {
    if (rule.requires.every((re) => re.test(text))) {
      return drinks.find((d) => d.name === rule.drinkName) ?? null;
    }
  }
  return null;
}

export type DirectionalConfidence = 'low' | 'medium';

/**
 * A directional placement on the palate map inferred from a drink's listed
 * ingredients alone (no ratios or method). Distinct from verified catalog
 * coordinates, which are anchored to a known recipe.
 */
export interface DirectionalPlacement {
  x: number;
  y: number;
  quadrant: QuadrantId;
  confidence: DirectionalConfidence;
  /** Matched canonical primitives from `INGREDIENT_INDEX`. */
  primitives: IngredientPrimitive[];
  /** Sensory aversion flags inferred from the ingredients. */
  aversions: AversionFlags;
  /** Closest structural classic on the map, when clear (suppressed on N/A drinks). */
  closestClassic: Drink | null;
  /** True when the drink or its menu section signals a non-alcoholic / zero-proof drink. */
  nonAlcoholic?: boolean;
}

const clampAxis = (v: number) => Math.max(-10, Math.min(10, roundTenth(v))) || 0;

/**
 * Infer a directional coordinate on the palate map from a house cocktail's
 * ingredient list. Requires at least 2 matched primitives from
 * `INGREDIENT_INDEX` so creative names without ingredients never fabricate a
 * position.
 */
export function placeDirectional(
  text: string,
  drinks: readonly Drink[] = drinkDatabase,
  options?: { section?: string }
): DirectionalPlacement | null {
  const primitives = extractPrimitives(text);
  if (primitives.length < 2) return null;

  let wx = 0;
  let wy = 0;
  let wSum = 0;
  for (const p of primitives) {
    const w = ROLE_WEIGHT[p.role];
    wx += p.pull.x * w;
    wy += p.pull.y * w;
    wSum += w;
  }
  if (wSum === 0) return null;

  const x = clampAxis(wx / wSum);
  const y = clampAxis(wy / wSum);
  const quadrant = quadrantIdFor(x, y);
  const aversions = detectAversions(text);
  const nonAlcoholic = isNonAlcoholic(text, options?.section);

  const hasBase = primitives.some((p) => p.role === 'base');
  const hasModifierOrAcid = primitives.some(
    (p) => p.role === 'modifier' || p.role === 'acid' || p.role === 'bitter' || p.role === 'dairy'
  );
  const confidence: DirectionalConfidence =
    primitives.length >= 3 || (hasBase && hasModifierOrAcid) ? 'medium' : 'low';

  let closestClassic: Drink | null = null;
  if (!nonAlcoholic) {
    closestClassic = suggestClosestDrink(text, drinks, { nonAlcoholic: false });
    if (!closestClassic) {
      // Fall back to the nearest verified cocktail within 4.5 points if it sits in the same region.
      let best: { drink: Drink; dist: number } | null = null;
      for (const d of drinks) {
        if (d.type !== 'Cocktail') continue;
        if (quadrantIdFor(d.x, d.y) !== quadrant) continue;
        const dist = distanceBetween({ x, y }, d);
        if (dist <= 4.5 && (!best || dist < best.dist)) {
          best = { drink: d, dist };
        }
      }
      closestClassic = best?.drink ?? null;
    }
  }

  return {
    x,
    y,
    quadrant,
    confidence,
    primitives,
    aversions,
    closestClassic,
    ...(nonAlcoholic ? { nonAlcoholic: true } : {}),
  };
}
