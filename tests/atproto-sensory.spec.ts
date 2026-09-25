import { test, expect } from '@playwright/test';
import { derivePalateRecord, getDrinkSensoryVector } from '../src/lib/sensory';
import type { UserProfile } from '../src/hooks/useDiscoveryQuiz';
import type { Drink } from '../src/lib/data';

test('AT Protocol: derivePalateRecord should correctly build structured sensory vector', async () => {
  const profile: UserProfile = {
    x: 4.0,
    y: -2.0,
    dislikesSmoke: true,
    dislikesBitter: false,
    dislikesAnise: true,
    vibeTags: { classic: 2.0, social: 1.0 }
  };

  const record = derivePalateRecord(profile, null);

  // Assert map coordinates
  expect(record.mapCoordinates.x).toBe(4.0);
  expect(record.mapCoordinates.y).toBe(-2.0);

  // Assert basic tastes (derived from coordinates)
  // sweet: 5 + (y/2) = 5 + (-1) = 4
  expect(record.sensoryVector.tastes.sweet).toBe(4.0);
  // umami: 5 - (y/2) = 5 - (-1) = 6
  expect(record.sensoryVector.tastes.umami).toBe(6.0);
  // sour: 5 + (x/2) = 5 + 2 = 7
  expect(record.sensoryVector.tastes.sour).toBe(7.0);

  // Assert aversions
  expect(record.aversions.smoke).toBe(true);
  expect(record.aversions.bitter).toBe(false);
  expect(record.aversions.anise).toBe(true);

  // Assert volatile aromas
  expect(record.sensoryVector.aromas.smoky).toBe(0.0);
  expect(record.sensoryVector.aromas.herbaceous).toBe(0.0);
});

test('AT Protocol: getDrinkSensoryVector should correctly map drink properties', async () => {
  const mockDrink = {
    name: 'Test Negroni',
    type: 'Cocktail' as const,
    x: -6,
    y: -8,
    hasSmoke: false,
    hasAnise: false,
    isBitter: true,
    tags: ['bold', 'classic', 'complex'] as Drink['tags']
  };

  const sensory = getDrinkSensoryVector(mockDrink);

  expect(sensory.tastes.bitter).toBe(7.0);
  expect(sensory.aromas.smoky).toBe(0.0);
  expect(sensory.aromas.herbaceous).toBe(0.0);
  
  // y = -8 -> sweet = 5 + (-4) = 1; umami = 5 - (-4) = 9
  expect(sensory.tastes.sweet).toBe(1.0);
  expect(sensory.tastes.umami).toBe(9.0);
  
  // x = -6 -> body = 5 - (-3) = 8
  expect(sensory.textures.body).toBe(8.0);
});

test('AT Protocol: PourRecordSchema should validate pour records conforming to pour lexicon', async () => {
  const { PourRecordSchema } = await import('../src/lib/atproto/records');

  const validRecord = {
    $type: 'app.crystalcoupe.pour' as const,
    drink: { name: 'Manhattan', slug: 'manhattan' },
    venue: {
      entity: { name: 'The Nomad Bar' },
    },
    rating: {
      hedonic: 8,
      wouldOrderAgain: true,
    },
    deviations: ['too-sweet'] as const,
    note: 'Slightly too sweet, but excellent rye selection.',
    palateShift: { x: 0, y: -1 },
    createdAt: new Date().toISOString(),
  };

  const parsed = PourRecordSchema.safeParse(validRecord);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.drink.name).toBe('Manhattan');
    expect(parsed.data.venue?.entity.name).toBe('The Nomad Bar');
    expect(parsed.data.rating.hedonic).toBe(8);
  }

  // Venue is optional for home pour
  const homePour = {
    ...validRecord,
    isHomePour: true,
  };
  delete (homePour as Partial<typeof validRecord>).venue;
  expect(PourRecordSchema.safeParse(homePour).success).toBe(true);

  // Missing required drink or rating should fail
  const invalidRecord = {
    $type: 'app.crystalcoupe.pour' as const,
    createdAt: new Date().toISOString(),
  };
  expect(PourRecordSchema.safeParse(invalidRecord).success).toBe(false);
});

