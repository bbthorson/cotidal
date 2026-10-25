import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { Lexicons, parseLexiconDoc } from '@atproto/lexicon';
import { isDatetimeStringLenient } from '@atproto/syntax';
import {
  ELICITATION_COLLECTION,
  PALATE_COLLECTION,
  POUR_COLLECTION,
  PourRecordSchema,
  PourWriteSchema,
  RECORD_SCHEMAS,
  encodePalate,
} from '../src/lib/atproto/records';

/**
 * Our schemas against the protocol's own: the datetime examples from the
 * spec (https://atproto.com/specs/lexicon#datetime), and `@atproto/lexicon`,
 * the reference validator, run over the same records as Zod.
 */

const DIR = 'src/lib/atproto/lexicons';
const docs = readdirSync(DIR).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));

// Verbatim from the spec.
const SPEC_VALID = [
  '1985-04-12T23:20:50.123Z', '1985-04-12T23:20:50.123456Z', '1985-04-12T23:20:50.120Z',
  '1985-04-12T23:20:50.120000Z', '0001-01-01T00:00:00.000Z', '0000-01-01T00:00:00.000Z',
  '1985-04-12T23:20:50.12345678912345Z', '1985-04-12T23:20:50Z', '1985-04-12T23:20:50.0Z',
  '1985-04-12T23:20:50.123+00:00', '1985-04-12T23:20:50.123-07:00',
];
const SPEC_INVALID = [
  '1985-04-12', '1985-04-12T23:20Z', '1985-04-12T23:20:5Z', '1985-04-12T23:20:50.123',
  '+001985-04-12T23:20:50.123Z', '23:20:50.123Z', '-1985-04-12T23:20:50.123Z', '1985-4-12T23:20:50.123Z',
  '01985-04-12T23:20:50.123Z', '1985-04-12T23:20:50.123+00', '1985-04-12T23:20:50.123+0000',
  '1985-04-12t23:20:50.123Z', '1985-04-12T23:20:50.123z', '1985-04-12T23:20:50.123-00:00',
  '1985-04-12 23:20:50.123Z', '1985-04-12T23:99:50.123Z', '1985-00-12T23:20:50.123Z',
  '0000-01-01T00:00:00+01:00',
];

const pourAt = (createdAt: string) => ({
  $type: POUR_COLLECTION,
  drink: { name: 'Daiquiri' },
  rating: { hedonic: 7 },
  createdAt,
});

test('Datetimes: what this app writes meets the spec exactly', () => {
  for (const s of SPEC_VALID) expect(PourWriteSchema.safeParse(pourAt(s)).success, s).toBe(true);
  for (const s of SPEC_INVALID) expect(PourWriteSchema.safeParse(pourAt(s)).success, s).toBe(false);
  // And what it generates is the preferred form: millisecond precision, `Z`.
  expect(new Date().toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('Datetimes: what this app reads is what the reference reader accepts', () => {
  // The reference validator reads leniently, so another client's record is not dropped here
  // and kept elsewhere.
  for (const s of [...SPEC_VALID, ...SPEC_INVALID]) {
    expect(PourRecordSchema.safeParse(pourAt(s)).success, s).toBe(isDatetimeStringLenient(s));
  }
});

test('Lexicons: every file parses in the reference implementation', () => {
  for (const doc of docs) expect(() => parseLexiconDoc(doc), doc.id).not.toThrow();
});

test('Records: Zod and @atproto/lexicon agree on what is valid', () => {
  const reference = new Lexicons(docs);
  const valid = (nsid: string, value: Record<string, unknown>) => {
    try {
      reference.assertValidRecord(nsid, value);
      return true;
    } catch {
      return false;
    }
  };

  const palate = encodePalate({
    $type: PALATE_COLLECTION,
    mapCoordinates: { x: 2.5, y: -4 },
    dynamicState: { latentVector: [2.5, -4, 6, 5, 7], covarianceDiagonal: [3, 2, 4, 4, 3], eventCount: 3 },
    aversions: { smoke: false, bitter: true, anise: false },
    vibeTags: { classic: 1.25 },
    createdAt: '2026-10-25T20:00:00.000Z',
  });
  const answers = {
    $type: ELICITATION_COLLECTION,
    responseModel: 'softmax-grid-1',
    answers: [{ questionId: 'q1', options: [{ dxTenths: 10, dyTenths: -5 }, { dxTenths: -10, dyTenths: 5 }], chosen: 1 }],
    createdAt: '2026-10-25T20:00:00.000Z',
  };
  const pour = {
    ...pourAt('2026-10-25T20:00:00.000Z'),
    drink: { name: 'Daiquiri', recipe: { name: 'Daiquiri', uri: 'at://did:plc:abc123/app.cotidal.recipe/3l9876543210' } },
    rating: { hedonic: 7, glmsValence: 40 },
    perceivedIntensities: { sourness: 70 },
    cata: ['lime-peel'],
    note: '👩‍👩‍👧‍👦'.repeat(100),
  };

  const cases: [string, Record<string, unknown>][] = [
    [PALATE_COLLECTION, palate],
    [PALATE_COLLECTION, { ...palate, mapCoordinates: { xHundredths: 1001, yHundredths: 0 } }],
    [PALATE_COLLECTION, { ...palate, mapCoordinates: { xHundredths: 1.5, yHundredths: 0 } }],
    [PALATE_COLLECTION, { ...palate, vibeTagWeights: [{ tag: 'classic', weightHundredths: 1.5 }] }],
    [ELICITATION_COLLECTION, answers],
    [ELICITATION_COLLECTION, { ...answers, answers: [] }],
    [POUR_COLLECTION, pour],
    [
      POUR_COLLECTION,
      {
        ...pour,
        drink: { name: 'Old Fashioned', baseSpirit: 'rye' },
        glassware: 'rocks',
        garnish: 'Orange peel',
        perceivedIntensities: { bitterness: 17, alcoholHeat: 53 },
      },
    ],
    [POUR_COLLECTION, { ...pour, rating: { hedonic: 10 } }],
    [POUR_COLLECTION, { ...pour, rating: { hedonic: 7, glmsValence: 40.5 } }],
    [POUR_COLLECTION, { ...pour, note: '👩‍👩‍👧‍👦'.repeat(121) }], // > 3000 bytes
    [POUR_COLLECTION, { ...pour, drink: { name: 'a'.repeat(101) } }], // > 100 graphemes
    [POUR_COLLECTION, { ...pour, drink: { name: 'Daiquiri', recipe: { name: 'D', uri: 'not-an-at-uri' } } }],
    [POUR_COLLECTION, { ...pour, createdAt: '1985-04-12T23:20:50.123-00:00' }],
  ];
  for (const [nsid, value] of cases) {
    const ours = RECORD_SCHEMAS[nsid].safeParse(value).success;
    expect(ours, `${nsid} ${JSON.stringify(value).slice(0, 120)}`).toBe(valid(nsid, value));
  }
  // The cases are not all one answer.
  expect(cases.filter(([n, v]) => valid(n, v)).length).toBe(4);
});
