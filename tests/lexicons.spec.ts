import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import {
  PourRecordSchema,
  MenuRecordSchema,
  MakerRecordSchema,
  isVenueAuthored,
  POUR_COLLECTION,
  MENU_COLLECTION,
  MAKER_COLLECTION,
} from '../src/lib/atproto/records';

const DIR = 'src/lib/atproto/lexicons';
const lexicon = (id: string) => JSON.parse(readFileSync(`${DIR}/${id}.json`, 'utf8'));

test('Lexicons: every file is valid and self-consistent', async () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const doc = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));
    expect(doc.lexicon, file).toBe(1);
    expect(`${doc.id}.json`, file).toBe(file);
  }
});

test('Refs: a reference is complete without the thing being claimed', async () => {
  // The whole point of the unclaimed-entity design: a pour at a bar that has
  // never heard of us must still be a valid, complete record.
  const unclaimed = {
    $type: POUR_COLLECTION,
    drink: { name: 'The Beekeeper' },
    venue: { entity: { name: 'Attaboy', domain: 'attaboy.nyc' } },
    rating: { hedonic: 8, wouldOrderAgain: true },
    createdAt: new Date().toISOString(),
  };
  expect(PourRecordSchema.safeParse(unclaimed).success).toBe(true);

  // And the same record, once the bar has an account, is the same shape.
  const claimed = {
    ...unclaimed,
    venue: {
      entity: {
        name: 'Attaboy',
        domain: 'attaboy.nyc',
        did: 'did:plc:abc123',
        uri: 'at://did:plc:abc123/app.cotidal.venue/self',
      },
    },
  };
  expect(PourRecordSchema.safeParse(claimed).success).toBe(true);
});

test('Ratings: a pour rates the drink, and credits carry no score', async () => {
  const credited = {
    $type: POUR_COLLECTION,
    drink: { name: 'Penicillin', slug: 'penicillin' },
    credits: [{ entity: { name: 'Sam Ross' }, role: 'author' as const }],
    rating: { hedonic: 3 },
    createdAt: new Date().toISOString(),
  };
  const parsed = PourRecordSchema.safeParse(credited);
  expect(parsed.success).toBe(true);

  // A credit has exactly two fields; there is nowhere to put a score on a
  // person, which is the property that keeps this from becoming Yelp for
  // bartenders.
  const credit = lexicon('app.cotidal.defs').defs.credit;
  expect(Object.keys(credit.properties).sort()).toEqual(['entity', 'role']);

  // Nor is there anywhere on a maker profile to store one.
  const maker = lexicon('app.cotidal.maker').defs.main.record.properties;
  for (const scoreish of ['rating', 'score', 'average', 'stars', 'reviews']) {
    expect(maker).not.toHaveProperty(scoreish);
  }
  expect(
    MakerRecordSchema.safeParse({
      $type: MAKER_COLLECTION,
      displayName: 'Sam Ross',
      recipes: [{ name: 'Penicillin' }],
      createdAt: new Date().toISOString(),
    }).success
  ).toBe(true);
});

test('Menus: authority comes from the signing repo, not a field', async () => {
  const base = {
    $type: MENU_COLLECTION,
    venue: { entity: { name: 'Attaboy', did: 'did:plc:bar' } },
    publishedAt: new Date().toISOString(),
    sections: [{ name: 'Cocktails', items: [{ drink: { name: 'The Beekeeper' } }] }],
  };

  // A patron's sighting carries capture metadata...
  const sighting = { ...base, capture: { method: 'photo' as const, confidence: 82 } };
  expect(MenuRecordSchema.safeParse(sighting).success).toBe(true);
  expect(isVenueAuthored(MenuRecordSchema.parse(sighting), 'did:plc:patron')).toBe(false);

  // ...and the venue's own publication is the same record, signed by the bar.
  expect(isVenueAuthored(MenuRecordSchema.parse(base), 'did:plc:bar')).toBe(true);

  // There is no `official` flag to forge.
  const menu = lexicon('app.cotidal.menu').defs.main.record.properties;
  for (const flag of ['official', 'isOfficial', 'verified']) {
    expect(menu).not.toHaveProperty(flag);
  }
});

test('Drinks: a category is unowned, a recipe is ownable', async () => {
  const drinkRef = lexicon('app.cotidal.defs').defs.drinkRef;

  // The folk category is a plain slug — no DID, no URI, nothing to claim.
  expect(drinkRef.properties.slug.type).toBe('string');
  expect(drinkRef.properties.slug).not.toHaveProperty('format');

  // The authored spec is a full entity reference, which can be claimed.
  expect(drinkRef.properties.recipe.ref).toBe('#entityRef');
});

test('Locations: place vocabulary is borrowed, not reinvented', async () => {
  const venueRef = lexicon('app.cotidal.defs').defs.venueRef;
  expect(venueRef.properties.address.refs).toContain('community.lexicon.location.fsq');

  // We reference that namespace but must never define inside it.
  const ours = readdirSync(DIR).map((f) => f.replace('.json', ''));
  expect(ours.every((id) => id.startsWith('app.cotidal.'))).toBe(true);
});

test('Psychophysics: palate records dynamicState and pour records CATA/gLMS', async () => {
  const { PalateRecordSchema, PalateSchema, encodePalate, decodePalate, PALATE_COLLECTION } = await import(
    '../src/lib/atproto/records'
  );

  // The palate as the app holds it: plain numbers.
  const palate = {
    $type: PALATE_COLLECTION,
    mapCoordinates: { x: 2.5, y: -4.0 },
    dynamicState: {
      latentVector: [2.5, -4.0, 6.2, 5.0, 7.1],
      covarianceDiagonal: [3.2, 2.8, 4.1, 4.0, 3.5],
      eventCount: 14,
      lastUpdate: new Date().toISOString(),
    },
    phenotypes: {
      tas2r38BitterSensitivity: 'medium-taster' as const,
      trigeminalTolerance: 'moderate' as const,
    },
    aversions: {
      smoke: false,
      bitter: false,
      anise: true,
    },
    vibeTags: { citrus: 4, crushable: 3 },
    createdAt: new Date().toISOString(),
  };
  expect(PalateSchema.safeParse(palate).success).toBe(true);
  // As written to a repository it is integers only, and that is the record.
  expect(PalateRecordSchema.safeParse(encodePalate(palate)).success).toBe(true);
  // The float shape is no longer a valid record — but records written in it
  // still read.
  expect(PalateRecordSchema.safeParse(palate).success).toBe(false);
  expect(decodePalate(palate)?.mapCoordinates).toEqual({ x: 2.5, y: -4.0 });

  const psychophysicalPour = {
    $type: POUR_COLLECTION,
    drink: {
      name: 'Daiquiri',
      slug: 'daiquiri',
      stimulus: {
        matrixType: 'cocktail' as const,
        abvTenths: 225,
        residualSugarGpl: 45,
        acidityPhHundredths: 320,
        astringencyIndexTenths: 10,
      },
    },
    rating: {
      hedonic: 8,
      glmsValence: 65,
      wouldOrderAgain: true,
    },
    perceivedIntensities: {
      sweetness: 55,
      sourness: 70,
      bitterness: 5,
      astringency: 10,
      effervescence: 0,
    },
    cata: ['lime-peel', 'bright-citrus', 'sugarcane'],
    context: {
      volumeConsumedMl: 140,
      fastingDurationHours: 2,
    },
    createdAt: new Date().toISOString(),
  };
  expect(PourRecordSchema.safeParse(psychophysicalPour).success).toBe(true);
});

