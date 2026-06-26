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

test('AT Protocol: DrinkLogRecordSchema should validate drink logs with optional location', async () => {
  const { DrinkLogRecordSchema } = await import('../src/lib/atproto/lexicon');
  
  const validRecord = {
    $type: 'app.crystalcoupe.drinkLog' as const,
    drinkName: 'Manhattan',
    location: 'The Nomad Bar',
    hedonicScale: 8,
    deviations: ['too-sweet'],
    note: 'Slightly too sweet, but excellent rye selection.',
    palateShift: { x: 0.1, y: -0.2 },
    createdAt: new Date().toISOString()
  };

  const parsed = DrinkLogRecordSchema.safeParse(validRecord);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.location).toBe('The Nomad Bar');
  }

  // Location is optional
  const recordNoLocation = { ...validRecord };
  // @ts-expect-error - deleting location to test optionality
  delete recordNoLocation.location;
  expect(DrinkLogRecordSchema.safeParse(recordNoLocation).success).toBe(true);

  // Location > 100 chars should fail
  const invalidRecord = {
    ...validRecord,
    location: 'a'.repeat(101)
  };
  expect(DrinkLogRecordSchema.safeParse(invalidRecord).success).toBe(false);
});

