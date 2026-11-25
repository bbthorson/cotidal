import { drinkDatabase } from './data';
import { buildTerrain, sampleTerrain, type TerrainPour, type TerrainStart } from './terrain';

/**
 * The front door's map: a made-up palate gaining ratings, so a stranger sees
 * what the map does before it knows anything about them. Where its answers
 * put it, then a 9 for a Daiquiri raising the ground in the Surf, a 3 for a
 * Gin & Tonic sinking a hollow, a 9 for a Manhattan making a second hill in
 * the Deep, and two more ratings settling both.
 *
 * Each frame is the real terrain (`buildTerrain`) of the pours so far, worked
 * out when the page is built, never drawn by hand: the picture shows what the
 * app does, and changes when it does. The page labels it as a sample.
 */
export const SAMPLE_START: TerrainStart = { x: 4, y: 0, variance: { x: 9, y: 9 } };

export const SAMPLE_POURS: readonly { drink: string; rating: number }[] = [
  { drink: 'Daiquiri (Classic)', rating: 9 },
  { drink: 'Gin & Tonic', rating: 3 },
  { drink: 'Manhattan', rating: 9 },
  { drink: 'Old Fashioned', rating: 8 },
  { drink: 'Paloma', rating: 8 },
];

/**
 * How many frames the front door cycles through: the start and one per pour.
 * The animation's keyframes (`.tide-frame` in globals.css) give each frame a
 * sixth of the cycle, so they are written for this number.
 */
export const SAMPLE_FRAMES = SAMPLE_POURS.length + 1;

/** One step of the sample: the ground after the first `k` pours, and those pours' ratings. */
export interface SampleFrame {
  ground: ReturnType<typeof sampleTerrain>;
  ratings: Map<string, number>;
}

/**
 * Every frame, sampled every `step` points. A coarse step keeps the page
 * light (the browser smooths the shading as it scales it); the contours are
 * drawn from the same samples.
 */
export function sampleFrames(step = 1): SampleFrame[] {
  const frames: SampleFrame[] = [];
  for (let k = 0; k <= SAMPLE_POURS.length; k++) {
    const pours: TerrainPour[] = SAMPLE_POURS.slice(0, k).map((p) => ({ drink: { name: p.drink }, rating: { hedonic: p.rating } }));
    frames.push({
      ground: sampleTerrain(buildTerrain(SAMPLE_START, pours, drinkDatabase), step),
      ratings: new Map(SAMPLE_POURS.slice(0, k).map((p) => [p.drink, p.rating])),
    });
  }
  return frames;
}
