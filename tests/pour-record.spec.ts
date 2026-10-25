import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import {
  CATA,
  DEVIATIONS,
  LEGACY_POUR_COLLECTION,
  POUR_COLLECTION,
  PourRecordSchema,
  PourWriteSchema,
  cataId,
  fitString,
  graphemeLength,
  readPour,
  utf8Length,
} from '../src/lib/atproto/records';
import { pour as pourCopy } from '../src/lib/copy';

/**
 * A pour is a signed record nobody can rewrite, so what this app writes must
 * be what the lexicon says. The route used to copy request fields straight
 * into the record; these hold the schema it now goes through.
 */

const base = {
  $type: POUR_COLLECTION,
  drink: { name: 'Daiquiri' },
  rating: { hedonic: 7 },
  createdAt: '2026-10-25T20:00:00.000Z',
};

test('Pour: no floats — the AT Protocol data model has none', () => {
  expect(PourWriteSchema.safeParse({ ...base, rating: { hedonic: 7, glmsValence: 65 } }).success).toBe(true);
  expect(PourWriteSchema.safeParse({ ...base, rating: { hedonic: 7, glmsValence: 65.4 } }).success).toBe(false);
  expect(PourWriteSchema.safeParse({ ...base, perceivedIntensities: { sweetness: 55.5 } }).success).toBe(false);
  expect(PourWriteSchema.safeParse({ ...base, context: { fastingDurationHours: 2.5 } }).success).toBe(false);
});

test('Lexicons: no file uses "number", which is not a Lexicon type', () => {
  const dir = 'src/lib/atproto/lexicons';
  for (const file of readdirSync(dir)) {
    expect(readFileSync(`${dir}/${file}`, 'utf8'), file).not.toMatch(/"type":\s*"number"/);
  }
});

test('Pour: this app writes only the notes and deviations it declares', () => {
  expect(PourWriteSchema.safeParse({ ...base, cata: ['lime-peel'], deviations: ['too-sweet'] }).success).toBe(true);
  expect(PourWriteSchema.safeParse({ ...base, cata: ['Lime Peel'] }).success).toBe(false);
  expect(PourWriteSchema.safeParse({ ...base, deviations: ['too-boozy'] }).success).toBe(false);
  // knownValues are open: a pour another client wrote still reads.
  expect(PourRecordSchema.safeParse({ ...base, cata: ['sugarcane'], deviations: ['too-boozy'] }).success).toBe(true);
});

test('Pour: every stored note and deviation has a label, and nothing else does', () => {
  expect(Object.keys(pourCopy.cata).sort()).toEqual([...CATA].sort());
  expect(Object.keys(pourCopy.deviations).sort()).toEqual([...DEVIATIONS].sort());
});

test('Strings: limits count UTF-8 bytes and graphemes, as the lexicon does', () => {
  const named = (name: string) => PourRecordSchema.safeParse({ ...base, drink: { name } }).success;
  expect(named('a'.repeat(100))).toBe(true);
  expect(named('a'.repeat(101))).toBe(false); // 101 graphemes
  expect(named('é'.repeat(100))).toBe(true); // 200 bytes
  expect(named('漢'.repeat(70))).toBe(false); // 70 graphemes, but 210 bytes
  // `.length` would call this 11 characters; it is one.
  expect(graphemeLength('👩‍👩‍👧‍👦')).toBe(1);
});

test('Strings: free text is cut to fit on a character boundary', () => {
  const family = '👩‍👩‍👧‍👦'; // 25 bytes, one grapheme
  const cut = fitString(family.repeat(200), 3000, 1000);
  expect(utf8Length(cut)).toBeLessThanOrEqual(3000);
  expect(cut).toBe(family.repeat(120)); // never half an emoji
  expect(fitString('a'.repeat(1200), 3000, 1000)).toBe('a'.repeat(1000));
  expect(fitString('short', 3000, 1000)).toBe('short');
});


test('Read: a pour is parsed, not cast', () => {
  expect(readPour({ ...base })).not.toBeNull();
  // From before the rename.
  expect(readPour({ ...base, $type: LEGACY_POUR_COLLECTION })?.$type).toBe(POUR_COLLECTION);
  // Not a pour at all, or one with a float in it.
  expect(readPour({ $type: POUR_COLLECTION, hello: 'world' })).toBeNull();
  expect(readPour({ ...base, rating: { hedonic: 7.5 } })).toBeNull();
  expect(readPour(null)).toBeNull();
});

test('Read: notes stored as labels, before the ids, read back as ids', () => {
  const pour = readPour({ ...base, cata: ['Bright Citrus', 'lime-peel', 'Rich Velvet Body', 'sugarcane'] });
  expect(pour?.cata).toEqual(['bright-citrus', 'lime-peel', 'rich-velvet-body', 'sugarcane']);
  // The labels pours stored before the ids, frozen here: rewording one in
  // copy.ts later must not change how these read.
  const stored = [
    'Bright Citrus', 'Lime Peel', 'Stone Fruit', 'Dark Cherry', 'Campfire Smoke', 'Botanical Herb',
    'Baking Spice', 'Toasted Oak', 'Floral Blossom', 'Bittersweet Cocoa', 'Briny Mineral', 'Rich Velvet Body',
  ];
  expect(stored.map(cataId)).toEqual([...CATA]);
});

test('Pour: spirit and glass are stored as ids, and only those the app declares', () => {
  const served = { ...base, drink: { name: 'Old Fashioned', baseSpirit: 'rye' }, glassware: 'rocks', garnish: 'Orange peel' };
  expect(PourWriteSchema.safeParse(served).success).toBe(true);
  expect(PourWriteSchema.safeParse({ ...served, drink: { name: 'Old Fashioned', baseSpirit: 'Rye' } }).success).toBe(false);
  expect(PourWriteSchema.safeParse({ ...served, glassware: 'Rocks' }).success).toBe(false);
  // Another client's glass still reads.
  expect(PourRecordSchema.safeParse({ ...served, glassware: 'snifter' }).success).toBe(true);
});

test('Pour: intensities are gLMS points, and alcohol heat is one of them', () => {
  const rated = { ...base, perceivedIntensities: { sweetness: 17, alcoholHeat: 53 } };
  expect(PourWriteSchema.safeParse(rated).success).toBe(true);
  expect(PourWriteSchema.safeParse({ ...base, perceivedIntensities: { alcoholHeat: 101 } }).success).toBe(false);
  // The 0–5 profile it replaces is not a field.
  expect(readPour({ ...base, sensoryProfile: { bitter: 2.5 } })).not.toHaveProperty('sensoryProfile');
});
