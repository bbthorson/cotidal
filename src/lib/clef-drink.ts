import type { ClefAnswers, ClefQuestion } from './generation';
import { detectAversions, suggestClosestDrink, type AversionFlags } from './ingredient-match';

/**
 * Classifying an unplaced house cocktail from its menu name & description via
 * Cloudflare Clef (`@cf/cloudflare/clef-flash`), with a deterministic fallback
 * over `ingredient-match.ts`.
 *
 * Clef returns calibrated probabilities for closed typed questions — no prose
 * to parse. When Clef is unsure (confidence below threshold), `coordinate` is
 * left `null` rather than guessed.
 */

export interface ClassifiedDrink {
  aversions: AversionFlags;
  /** Estimated 2D map coordinate when confidence is high enough; otherwise `null`. */
  coordinate: { x: number; y: number } | null;
  /** Closest known classic when deterministically matched. */
  closestClassic: string | null;
  /** 0..1 confidence of the coordinate estimate. */
  confidence: number;
}

export const AVERSION_THRESHOLD = 0.6;
export const COORDINATE_CONFIDENCE_MIN = 0.6;

export const DRINK_CLASSIFICATION_QUESTIONS: readonly ClefQuestion[] = [
  {
    id: 'smoke',
    type: 'noul',
    instructions: 'Does this drink contain smoky or peated ingredients (e.g., mezcal, peated scotch, smoked tea, charred elements)?',
  },
  {
    id: 'bitter',
    type: 'noul',
    instructions: 'Does this drink feature noticeable bitterness (e.g., Campari, Aperol, amaro, gentian, fernet, tonic, aromatic bitters)?',
  },
  {
    id: 'anise',
    type: 'noul',
    instructions: 'Does this drink contain anise, licorice, fennel, absinthe, pastis, or herbsaint?',
  },
  {
    id: 'body',
    type: 'score',
    instructions: 'Rate the drink’s body and texture from light/crisp (1) to rich/viscous (5).',
    levels: [
      { score: 1, description: 'Very light, sparkling, highball, or bone-crisp' },
      { score: 2, description: 'Light and lifted, shaken citrus or crisp wine' },
      { score: 3, description: 'Medium body, balanced cocktail' },
      { score: 4, description: 'Rich, spirit-forward, stirred, or oak-aged' },
      { score: 5, description: 'Dense, creamy, syrupy, or dessert-heavy' },
    ],
  },
  {
    id: 'sweetness',
    type: 'score',
    instructions: 'Rate the drink’s flavor balance from savory/dry/bitter (1) to lush/sweet (5).',
    levels: [
      { score: 1, description: 'Bone-dry, saline, savory, or intensely bitter' },
      { score: 2, description: 'Dry with subtle herbal or mineral notes' },
      { score: 3, description: 'Balanced sweet and dry/acidic' },
      { score: 4, description: 'Noticeably fruity, floral, or off-dry sweet' },
      { score: 5, description: 'Very sweet, creamy, or dessert-like' },
    ],
  },
];

const clamp10 = (n: number) => Math.max(-10, Math.min(10, Math.round(n * 10) / 10));

/**
 * Map Clef's typed answers into Cotidal's aversion flags and (when confident)
 * a 2D map coordinate:
 * - body 1..5 → x = (3 - body) * 4.5  (light=Crisp +9, full=Rich -9)
 * - sweetness 1..5 → y = (sweetness - 3) * 4.5  (dry=Savory -9, sweet=+9)
 */
export function parseClefDrink(
  answers: ClefAnswers,
  fallback: ClassifiedDrink
): ClassifiedDrink {
  const prob = (id: string, def: boolean) => {
    const p = answers[id]?.probability;
    return typeof p === 'number' && Number.isFinite(p) ? p >= AVERSION_THRESHOLD : def;
  };

  const aversions: AversionFlags = {
    smoke: prob('smoke', fallback.aversions.smoke),
    bitter: prob('bitter', fallback.aversions.bitter),
    anise: prob('anise', fallback.aversions.anise),
  };

  const body = answers.body?.score;
  const sweetness = answers.sweetness?.score;
  const bodyConf = answers.body?.confidence ?? 0.75;
  const sweetConf = answers.sweetness?.confidence ?? 0.75;
  const confidence = Math.round(Math.min(bodyConf, sweetConf) * 100) / 100;

  let coordinate: { x: number; y: number } | null = null;
  if (
    typeof body === 'number' &&
    Number.isFinite(body) &&
    typeof sweetness === 'number' &&
    Number.isFinite(sweetness) &&
    confidence >= COORDINATE_CONFIDENCE_MIN
  ) {
    coordinate = {
      x: clamp10((3 - body) * 4.5),
      y: clamp10((sweetness - 3) * 4.5),
    };
  }

  return {
    aversions,
    coordinate,
    closestClassic: fallback.closestClassic,
    confidence,
  };
}

/** Deterministic offline fallback using ingredient-match.ts. */
export function fallbackClassifyDrink(name: string, description?: string): ClassifiedDrink {
  const text = [name, description].filter(Boolean).join(' — ');
  const aversions = detectAversions(text);
  const classic = suggestClosestDrink(text);
  return {
    aversions,
    coordinate: classic ? { x: classic.x, y: classic.y } : null,
    closestClassic: classic?.name ?? null,
    confidence: classic ? 0.65 : 0,
  };
}
