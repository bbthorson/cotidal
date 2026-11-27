import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { drinkDatabase } from '@/lib/drinks/data';
import { SAMPLE_FRAMES, SAMPLE_POURS, sampleFrames } from '@/lib/palate/sample-palate';
import { peaks, buildTerrain } from '@/lib/palate/terrain';
import { SAMPLE_START } from '@/lib/palate/sample-palate';

/**
 * The front door's sample palate is the terrain code's own answer, never a
 * drawing: these hold it to the story it is meant to tell.
 */
describe('the sample palate', () => {
  test('every drink it rates is on the map', () => {
    for (const p of SAMPLE_POURS) expect(drinkDatabase.some((d) => d.name === p.drink), p.drink).toBe(true);
  });

  test('a frame for the start and one for each pour, each with the ratings so far', () => {
    const frames = sampleFrames();
    expect(frames).toHaveLength(SAMPLE_FRAMES);
    expect(frames[0].ratings.size).toBe(0);
    expect(frames.at(-1)!.ratings.size).toBe(SAMPLE_POURS.length);
  });

  test('it ends on two hills: the liked parts of the map, not a point between them', () => {
    const pours = SAMPLE_POURS.map((p) => ({ drink: { name: p.drink }, rating: { hedonic: p.rating } }));
    const tops = peaks(buildTerrain(SAMPLE_START, pours));
    expect(tops.some((t) => t.x > 3 && t.y > 2)).toBe(true);
    expect(tops.some((t) => t.x < -3 && t.y < -3)).toBe(true);
  });

  test('the animation is written for this many frames', () => {
    // `.tide-frame` holds each frame for a sixth of the cycle (globals.css).
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).toMatch(/\.tide-frame \{[^}]*animation: tide-frame 30s/);
    expect(SAMPLE_FRAMES).toBe(6);
  });
});
