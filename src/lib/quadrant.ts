import { quadrants } from './copy';

/**
 * Coordinates → quadrant.
 *
 * The names themselves live in `src/lib/copy.ts` so the voice stays revisable
 * in one file (docs/brand.md, rule 2). This module only owns the geometry:
 * which signs of (x, y) belong to which `id`.
 */

export type QuadrantId = (typeof quadrants)[number]['id'];
export type Quadrant = (typeof quadrants)[number];

/** Sign of x (Rich −10 → Crisp +10) and y (Savory −10 → Sweet +10). */
const BY_SIGN: Record<'crisp' | 'rich', Record<'sweet' | 'savory', QuadrantId>> = {
  rich: { savory: 'ember', sweet: 'vault' },
  crisp: { savory: 'salt-line', sweet: 'orchard' },
};

/**
 * Zero sits on an axis rather than in a quadrant. Ties break toward crisp and
 * sweet so every drink lands somewhere — `drinkDatabase` has no drink on an
 * axis today, and a silent gap would be worse than an arbitrary rule.
 */
export function quadrantIdFor(x: number, y: number): QuadrantId {
  return BY_SIGN[x < 0 ? 'rich' : 'crisp'][y < 0 ? 'savory' : 'sweet'];
}

export function quadrantFor(x: number, y: number): Quadrant {
  const id = quadrantIdFor(x, y);
  const quadrant = quadrants.find((q) => q.id === id);
  if (!quadrant) throw new Error(`No quadrant named '${id}' in copy.ts`);
  return quadrant;
}

/** Reading order on the map, as listed in `copy.ts`. */
export const QUADRANT_ORDER: readonly QuadrantId[] = quadrants.map((q) => q.id);
