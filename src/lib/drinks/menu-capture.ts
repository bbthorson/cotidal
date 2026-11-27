import { drinkDatabase, type Drink } from './data';
import { addMenuLines, type MenuItem } from './menu-rank';
import type { Register } from './register';
import type { DirectionalPlacement } from './ingredient-match';
import { quadrantIdFor, roundTenth } from '../map/coordinates';
import { runClef, type ClefQuestion, type ClefRequest, type ClefResponse } from '../generation';

/** Max low-signal house items enriched in a single Clef pass (6 questions × 10 = 60 ≤ 64). */
export const MAX_CLEF_ITEMS = 10;

/** Probability thresholds for accepting Clef decisions. */
const AVERSION_THRESHOLD = 0.65;
const CLASSIC_THRESHOLD = 0.55;

const COCKTAIL_SLUGS = drinkDatabase
  .filter((d) => d.type === 'Cocktail')
  .map((d) => d.slug);

const CLASSIC_OPTIONS = ['none', ...COCKTAIL_SLUGS];

export type ClefRunner = (request: ClefRequest) => Promise<ClefResponse | null>;

/** Deterministic base path: parse raw menu lines against the catalog and Ingredients Index. */
export function captureMenuLines(lines: readonly string[], register: Register): MenuItem[] {
  return addMenuLines([], lines.join('\n'), register);
}

/** Map a 1–9 Clef score onto Cotidal's −8..+8 directional range (avoiding extreme ±10 edges). */
function scoreToAxis(score: number): number {
  const clamped = Math.max(1, Math.min(9, score));
  return roundTenth(((clamped - 5) / 4) * 8) || 0;
}

/**
 * Use Cloudflare Clef-flash to classify house cocktails that had too little
 * deterministic signal from `INGREDIENT_INDEX` (e.g. brand names, house
 * infusions, or poetic menu descriptions).
 *
 * Strictly bounded: Clef only answers typed `noul`, `choice` (catalog slugs +
 * `none`), and `score` (1–9) questions. Always falls back cleanly to `items`.
 */
export async function enrichWithClef(
  items: MenuItem[],
  clefFn: ClefRunner = runClef,
  image?: { data: string; mime_type: 'image/jpeg' | 'image/png' | 'image/webp' }
): Promise<{ items: MenuItem[]; enriched: number }> {
  const candidates = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !item.drink && !item.directional && !!item.description)
    .slice(0, MAX_CLEF_ITEMS);

  if (candidates.length === 0) return { items, enriched: 0 };

  const questions: Record<string, ClefQuestion> = {};
  const stateItems: Record<string, { name: string; description: string }> = {};

  for (const { item, idx } of candidates) {
    const key = `i${idx}`;
    stateItems[key] = { name: item.label, description: item.description! };
    questions[`${key}_smoke`] = {
      type: 'noul',
      instructions: `Does item ${key} ("${item.label}") contain smoky ingredients (mezcal, peated scotch, smoked/charred elements)?`,
    };
    questions[`${key}_bitter`] = {
      type: 'noul',
      instructions: `Does item ${key} ("${item.label}") contain bitter ingredients (amaro, Campari, Aperol, gentian, tonic, bitters)?`,
    };
    questions[`${key}_anise`] = {
      type: 'noul',
      instructions: `Does item ${key} ("${item.label}") contain anise or licorice flavors (absinthe, pastis, fennel, sambuca)?`,
    };
    questions[`${key}_x`] = {
      type: 'score',
      levels: 9,
      instructions: `Rate item ${key} ("${item.label}") from 1 (very rich, heavy, spirit-forward or creamy) to 9 (very crisp, light, bright, citrusy or sparkling).`,
    };
    questions[`${key}_y`] = {
      type: 'score',
      levels: 9,
      instructions: `Rate item ${key} ("${item.label}") from 1 (very savory, dry, bitter, or herbal) to 9 (very sweet, fruity, or dessert-like).`,
    };
    if (!item.nonAlcoholic) {
      questions[`${key}_classic`] = {
        type: 'choice',
        options: CLASSIC_OPTIONS,
        instructions: `Which classic cocktail slug is closest in structure to item ${key} ("${item.label}"), or "none" if no close match?`,
      };
    }
  }

  let response: ClefResponse | null;
  try {
    response = await clefFn({
      state: { menuItems: stateItems },
      questions,
      ...(image ? { images: [image] } : {}),
    });
  } catch {
    return { items, enriched: 0 };
  }

  if (!response?.answers) return { items, enriched: 0 };

  const next = [...items];
  let enriched = 0;

  for (const { item, idx } of candidates) {
    const key = `i${idx}`;
    const xAns = response.answers[`${key}_x`];
    const yAns = response.answers[`${key}_y`];
    if (typeof xAns?.score !== 'number' || typeof yAns?.score !== 'number') continue;

    const x = scoreToAxis(xAns.score);
    const y = scoreToAxis(yAns.score);
    const quadrant = quadrantIdFor(x, y);

    const smoke = (response.answers[`${key}_smoke`]?.probability ?? 0) >= AVERSION_THRESHOLD;
    const bitter = (response.answers[`${key}_bitter`]?.probability ?? 0) >= AVERSION_THRESHOLD;
    const anise = (response.answers[`${key}_anise`]?.probability ?? 0) >= AVERSION_THRESHOLD;

    let closestClassic: Drink | null = item.nonAlcoholic ? null : (item.relative ?? null);
    if (!item.nonAlcoholic) {
      const classicAns = response.answers[`${key}_classic`];
      if (
        classicAns?.choice &&
        classicAns.choice !== 'none' &&
        (classicAns.confidence ?? 0) >= CLASSIC_THRESHOLD
      ) {
        closestClassic = drinkDatabase.find((d) => d.slug === classicAns.choice) ?? closestClassic;
      }
    }

    const directional: DirectionalPlacement = {
      x,
      y,
      quadrant,
      confidence: 'low',
      primitives: [],
      aversions: { smoke, bitter, anise },
      closestClassic,
      ...(item.nonAlcoholic ? { nonAlcoholic: true } : {}),
    };

    next[idx] = {
      ...item,
      directional,
      ...(closestClassic ? { relative: closestClassic } : {}),
    };
    enriched++;
  }

  return { items: next, enriched };
}
