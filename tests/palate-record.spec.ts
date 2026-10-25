import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  LEGACY_PALATE_COLLECTION,
  PALATE_COLLECTION,
  PalateRecordSchema,
  decodeCoordinates,
  decodePalate,
  encodePalate,
  type Palate,
} from '../src/lib/atproto/records';
import { derivePalateRecord } from '../src/lib/sensory';

/**
 * `app.cotidal.palate` on the wire. The AT Protocol data model has no
 * floats, so every fractional quantity is stored as integer hundredths under
 * a name that says so; records written before that encoding still read.
 */

const lexicon = JSON.parse(readFileSync('src/lib/atproto/lexicons/app.cotidal.palate.json', 'utf8'));

const palate: Palate = {
  $type: PALATE_COLLECTION,
  mapCoordinates: { x: -4.237, y: 3.1 },
  dynamicState: {
    latentVector: [-4.237, 3.1, 6.25, 5, 7.004],
    covarianceDiagonal: [2.71, 3.3, 15.99, 16, 0.42],
    eventCount: 3,
    lastUpdate: '2026-10-25T12:00:00.000Z',
  },
  phenotypes: { tas2r38BitterSensitivity: 'medium-taster', trigeminalTolerance: 'moderate' },
  aversions: { smoke: true, bitter: false, anise: false },
  // A pour adds 0.25 to each tag of a liked drink.
  vibeTags: { crushable: 2.25, social: 1, bold: 0.75 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-25T12:00:00.000Z',
};

function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => numbersIn(v, out));
  return out;
}

test('Palate record: what is written carries no floats', () => {
  const record = encodePalate(palate);
  const numbers = numbersIn(record);
  expect(numbers.length).toBeGreaterThan(10);
  for (const n of numbers) expect(Number.isInteger(n), String(n)).toBe(true);
  expect(PalateRecordSchema.safeParse(record).success).toBe(true);

  // So does a palate fresh from the quiz.
  const fromQuiz = encodePalate(
    derivePalateRecord(
      { x: 4.3, y: -2.7, dislikesSmoke: false, dislikesBitter: true, dislikesAnise: false, vibeTags: { classic: 2 }, variance: { x: 3.17, y: 2.9 } },
      null
    )
  );
  for (const n of numbersIn(fromQuiz)) expect(Number.isInteger(n), String(n)).toBe(true);
});

test('Palate record: decoding what was encoded gives the palate back to the hundredth', () => {
  const back = decodePalate(encodePalate(palate))!;
  expect(back).not.toBeNull();
  expect(back.mapCoordinates.x).toBeCloseTo(-4.24, 10);
  expect(back.mapCoordinates.y).toBeCloseTo(3.1, 10);
  back.dynamicState.latentVector.forEach((v, i) =>
    expect(Math.abs(v - palate.dynamicState.latentVector[i])).toBeLessThanOrEqual(0.005)
  );
  back.dynamicState.covarianceDiagonal.forEach((v, i) =>
    expect(Math.abs(v - palate.dynamicState.covarianceDiagonal[i])).toBeLessThanOrEqual(0.005)
  );
  // Quarter-point tag weights survive exactly.
  expect(back.vibeTags).toEqual(palate.vibeTags);
  expect(back.aversions).toEqual(palate.aversions);
  expect(back.dynamicState.eventCount).toBe(3);
  // Encoding is stable: a second round trip changes nothing.
  expect(encodePalate(back)).toEqual(encodePalate(palate));
});

test('Palate record: a record written with floats still reads', () => {
  const legacy = {
    $type: PALATE_COLLECTION,
    mapCoordinates: { x: -4.2, y: 3.1 },
    dynamicState: { latentVector: [-4.2, 3.1, 5, 5, 5], covarianceDiagonal: [25, 25, 16, 16, 16], eventCount: 0 },
    phenotypes: {},
    aversions: { smoke: false, bitter: false, anise: false },
    vibeTags: { classic: 1.25 },
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  const read = decodePalate(legacy)!;
  expect(read.mapCoordinates).toEqual({ x: -4.2, y: 3.1 });
  expect(read.vibeTags).toEqual({ classic: 1.25 });
  expect(decodeCoordinates(legacy)).toEqual({ x: -4.2, y: 3.1 });
  // And the next write migrates it.
  expect(PalateRecordSchema.safeParse(encodePalate(read)).success).toBe(true);
});

test('Palate record: anything else is not a palate', () => {
  expect(decodePalate(null)).toBeNull();
  expect(decodePalate({ $type: PALATE_COLLECTION })).toBeNull();
  expect(decodeCoordinates({ mapCoordinates: { xHundredths: 2000, yHundredths: 0 } })).toBeNull();
  expect(decodeCoordinates({ mapCoordinates: { xHundredths: 1.5, yHundredths: 0 } })).toBeNull();
  expect(decodeCoordinates({ mapCoordinates: { x: 'a', y: 0 } })).toBeNull();
  // A coordinate past the edge of the map is clamped on the way out.
  const edge = encodePalate({ ...palate, mapCoordinates: { x: 10.004, y: -10 } });
  expect(edge.mapCoordinates).toEqual({ xHundredths: 1000, yHundredths: -1000 });
});

test('Palate record: the lexicon and the Zod schema describe the same record', () => {
  const main = lexicon.defs.main.record;
  const dynamic = lexicon.defs.dynamicState;

  expect(Object.keys(main.properties).sort()).toEqual(
    Object.keys(PalateRecordSchema.shape).filter((k) => k !== '$type').sort()
  );
  expect(Object.keys(main.properties.mapCoordinates.properties).sort()).toEqual(['xHundredths', 'yHundredths']);
  expect(Object.keys(dynamic.properties).sort()).toEqual(
    Object.keys(PalateRecordSchema.shape.dynamicState.shape).sort()
  );
  for (const key of main.required) expect(PalateRecordSchema.shape).toHaveProperty(key);

  const types: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.type === 'string') types.push(o.type);
      Object.values(o).forEach(walk);
    }
  };
  walk(lexicon.defs);
  expect(types).not.toContain('number');
});

test('Palate record: a palate from before the rename to Cotidal still reads', () => {
  const old = { ...encodePalate(palate), $type: LEGACY_PALATE_COLLECTION };
  const read = decodePalate(old)!;
  expect(read).not.toBeNull();
  expect(read.$type).toBe(PALATE_COLLECTION);
  expect(read.mapCoordinates.x).toBeCloseTo(-4.24, 10);
  // Written back, it goes under the current namespace.
  expect(encodePalate(read).$type).toBe(PALATE_COLLECTION);
});
